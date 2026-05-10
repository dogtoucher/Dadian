import type { DadianIndexedDb } from "@/lib/storage/dexie";
import type {
  Entity,
  Fact,
  GenerationRun,
  Relation
} from "@/lib/storage/types";
import type { ProviderAdapter } from "@/lib/llm/provider";
import { extractCanonPrompt } from "@/lib/prompts/extractCanon";
import { generateArticlePrompt } from "@/lib/prompts/generateArticle";
import { validateCanonPrompt } from "@/lib/prompts/validateCanon";
import {
  cleanMetaNarration,
  extractWikiLinks,
  nowIso,
  summarizeMarkdown,
  titleToSlug
} from "@/lib/wiki";
import type { Article, World } from "@/lib/wiki/titles";

export type BrowserPipelineStage =
  | "article_generation"
  | "canon_extraction"
  | "canon_validation"
  | "canon_commit"
  | "completed";

export type BrowserPipelineStageUpdate = {
  stage: BrowserPipelineStage;
  label: string;
};

type ExtractedCanon = {
  entities?: {
    name?: string;
    type?: string;
    aliases?: string[];
    summary?: string;
  }[];
  facts?: {
    subject?: string;
    predicate?: string;
    object?: string;
    factText?: string;
    certainty?: number;
    statusHint?: string;
  }[];
  relations?: {
    source?: string;
    relationType?: string;
    target?: string;
    certainty?: number;
  }[];
  openQuestions?: string[];
};

type ValidationResult = {
  safeToCommit: boolean;
  conflicts?: {
    severity?: "low" | "medium" | "high";
    newClaim?: string;
    existingClaim?: string;
    recommendation?: "accept" | "reject" | "mark_disputed" | "requires_user_review";
  }[];
};

export async function generateBrowserArticle(input: {
  database: DadianIndexedDb;
  provider: ProviderAdapter;
  world: World;
  title: string;
  slug?: string;
  onStage?: (update: BrowserPipelineStageUpdate) => void;
}) {
  const slug = input.slug ?? titleToSlug(input.title);
  const timestamp = nowIso();
  const context = await retrieveBrowserContext(input.database, input.world.id);
  const run = await createGenerationRun(input.database, {
    worldId: input.world.id,
    targetTitle: input.title,
    targetSlug: slug,
    model: null,
    promptVersionsJson: JSON.stringify({
      generateArticle: generateArticlePrompt.version,
      extractCanon: extractCanonPrompt.version,
      validateCanon: validateCanonPrompt.version
    }),
    retrievedContextJson: JSON.stringify(context)
  });

  try {
    input.onStage?.({
      stage: "article_generation",
      label: "正在生成词条正文..."
    });

    const generated = await input.provider.complete({
      messages: generateArticlePrompt.build({
        world: input.world,
        title: input.title,
        relatedArticles: context.relatedArticles,
        acceptedFacts: context.acceptedFacts,
        disputedClaims: context.disputedClaims,
        rejectedDirections: context.rejectedDirections,
        hardFacts: context.hardFacts
      })
    });
    const markdown = cleanMetaNarration(generated.content, input.world.title);
    const article: Article = {
      id: crypto.randomUUID(),
      worldId: input.world.id,
      slug,
      title: input.title,
      status: "ready",
      summary: summarizeMarkdown(markdown),
      markdown,
      linksJson: JSON.stringify(extractWikiLinks(markdown)),
      version: 1,
      locale: input.world.defaultLocale ?? "zh-CN",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await input.database.articles.put(article);
    await updateGenerationRun(input.database, run.id, {
      articleId: article.id,
      model: generated.model,
      outputJson: JSON.stringify({
        summary: article.summary,
        markdown
      })
    });

    await extractValidateAndCommitCanon({
      database: input.database,
      provider: input.provider,
      world: input.world,
      article,
      runId: run.id,
      onStage: input.onStage
    });

    return article;
  } catch (err) {
    await updateGenerationRun(input.database, run.id, {
      status: "failed",
      completedAt: nowIso(),
      errorMessage: err instanceof Error ? err.message : "生成失败。",
      errorJson: JSON.stringify({ stage: "article_generation" })
    });
    throw err;
  }
}

export async function extractValidateAndCommitCanon(input: {
  database: DadianIndexedDb;
  provider: ProviderAdapter;
  world: World;
  article: Article;
  runId?: string;
  onStage?: (update: BrowserPipelineStageUpdate) => void;
}) {
  const run =
    input.runId ??
    (
      await createGenerationRun(input.database, {
        worldId: input.world.id,
        articleId: input.article.id,
        targetTitle: input.article.title,
        targetSlug: input.article.slug,
        model: null,
        promptVersionsJson: JSON.stringify({
          extractCanon: extractCanonPrompt.version,
          validateCanon: validateCanonPrompt.version
        })
      })
    ).id;

  try {
    input.onStage?.({
      stage: "canon_extraction",
      label: "正在抽取设定记忆..."
    });
    const extractionOutput = await input.provider.complete({
      messages: extractCanonPrompt.build({
        articleTitle: input.article.title,
        markdown: input.article.markdown
      }),
      options: { temperature: 0.2 }
    });
    const extraction = parseJsonObject<ExtractedCanon>(extractionOutput.content);
    await updateGenerationRun(input.database, run, {
      model: extractionOutput.model,
      extractionJson: JSON.stringify(extraction)
    });

    const newFacts = normalizeExtractedFacts(extraction);
    const context = await retrieveBrowserContext(input.database, input.world.id);

    input.onStage?.({
      stage: "canon_validation",
      label: "正在校验设定一致性..."
    });
    const validationOutput = newFacts.length
      ? await input.provider.complete({
          messages: validateCanonPrompt.build({
            newFacts: newFacts.map((fact) => fact.factText),
            existingAcceptedFacts: context.acceptedFacts,
            rejectedDirections: context.rejectedDirections,
            hardConstraints: context.hardFacts
          }),
          options: { temperature: 0.1 }
        })
      : null;
    const validation = validationOutput
      ? parseJsonObject<ValidationResult>(validationOutput.content)
      : { safeToCommit: true };
    await updateGenerationRun(input.database, run, {
      model: validationOutput?.model ?? extractionOutput.model,
      validationJson: JSON.stringify(validation)
    });

    if (!validation.safeToCommit) {
      await updateGenerationRun(input.database, run, {
        status: "completed",
        completedAt: nowIso()
      });
      return;
    }

    input.onStage?.({
      stage: "canon_commit",
      label: "正在保存设定记忆..."
    });
    await commitExtractedCanon(input.database, input.world, input.article, extraction);
    await updateGenerationRun(input.database, run, {
      status: "completed",
      completedAt: nowIso()
    });
    input.onStage?.({
      stage: "completed",
      label: "词条和设定记忆已保存。"
    });
  } catch (err) {
    await updateGenerationRun(input.database, run, {
      status: "failed",
      completedAt: nowIso(),
      errorMessage: err instanceof Error ? err.message : "设定整理失败。",
      errorJson: JSON.stringify({ stage: "canon_extraction" })
    });
    throw err;
  }
}

export async function retrieveBrowserContext(database: DadianIndexedDb, worldId: string) {
  const [articles, facts, constraints] = await Promise.all([
    database.articles.where("worldId").equals(worldId).reverse().limit(8).toArray(),
    database.facts.where("worldId").equals(worldId).toArray(),
    database.constraints.where("worldId").equals(worldId).toArray()
  ]);

  return {
    relatedArticles: articles
      .filter((article) => article.status === "ready")
      .map((article) => ({
        title: article.title,
        summary: article.summary
      })),
    acceptedFacts: facts
      .filter((fact) => fact.status === "accepted" || fact.status === "canonical")
      .map((fact) => fact.factText),
    disputedClaims: facts
      .filter((fact) => fact.status === "disputed")
      .map((fact) => fact.factText),
    rejectedDirections: [
      ...facts.filter((fact) => fact.status === "rejected").map((fact) => fact.factText),
      ...constraints
        .filter((constraint) => constraint.constraintType === "negative")
        .map((constraint) => constraint.text)
    ],
    hardFacts: constraints
      .filter((constraint) => constraint.strength === "hard")
      .map((constraint) => constraint.text)
  };
}

async function commitExtractedCanon(
  database: DadianIndexedDb,
  world: World,
  article: Article,
  extraction: ExtractedCanon
) {
  const timestamp = nowIso();
  const entityByName = new Map<string, Entity>();

  await database.transaction(
    "rw",
    database.entities,
    database.aliases,
    database.facts,
    database.relations,
    async () => {
      for (const item of extraction.entities ?? []) {
        const name = item.name?.trim();
        if (!name) continue;
        const slug = titleToSlug(name);
        const existing = await database.entities
          .where("[worldId+slug]")
          .equals([world.id, slug])
          .first();
        const entity: Entity =
          existing ??
          ({
            id: crypto.randomUUID(),
            worldId: world.id,
            canonicalName: name,
            slug,
            type: item.type ?? "other",
            summary: item.summary ?? null,
            status: "provisional",
            createdAt: timestamp,
            updatedAt: timestamp
          } satisfies Entity);
        await database.entities.put({
          ...entity,
          summary: item.summary ?? entity.summary,
          updatedAt: timestamp
        });
        entityByName.set(name, entity);

        for (const alias of [name, ...(item.aliases ?? [])]) {
          const normalizedAlias = titleToSlug(alias);
          await database.aliases.put({
            id: `${world.id}:${entity.id}:${normalizedAlias}`,
            worldId: world.id,
            entityId: entity.id,
            alias,
            normalizedAlias,
            locale: world.defaultLocale ?? "zh-CN",
            createdAt: timestamp
          });
        }
      }

      for (const item of normalizeExtractedFacts(extraction)) {
        const subject = item.subject ? entityByName.get(item.subject) : undefined;
        const object = item.object ? entityByName.get(item.object) : undefined;
        const fact: Fact = {
          id: crypto.randomUUID(),
          worldId: world.id,
          subjectEntityId: subject?.id ?? null,
          predicate: item.predicate ?? null,
          objectEntityId: object?.id ?? null,
          objectText: object ? null : item.object,
          factText: item.factText,
          status: item.statusHint === "disputed" ? "disputed" : "provisional",
          certainty: clampCertainty(item.certainty),
          sourceArticleId: article.id,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        await database.facts.put(fact);
      }

      for (const item of extraction.relations ?? []) {
        const source = item.source ? entityByName.get(item.source) : undefined;
        const target = item.target ? entityByName.get(item.target) : undefined;
        if (!source || !target || !item.relationType) continue;
        const relation: Relation = {
          id: crypto.randomUUID(),
          worldId: world.id,
          sourceEntityId: source.id,
          relationType: item.relationType,
          targetEntityId: target.id,
          status: "provisional",
          certainty: clampCertainty(item.certainty),
          sourceArticleId: article.id,
          createdAt: timestamp
        };
        await database.relations.put(relation);
      }
    }
  );
}

function normalizeExtractedFacts(extraction: ExtractedCanon) {
  return (extraction.facts ?? [])
    .map((fact) => ({
      subject: fact.subject?.trim() || null,
      predicate: fact.predicate?.trim() || null,
      object: fact.object?.trim() || null,
      factText: fact.factText?.trim() ?? "",
      certainty: fact.certainty,
      statusHint: fact.statusHint
    }))
    .filter((fact) => fact.factText);
}

async function createGenerationRun(
  database: DadianIndexedDb,
  input: Partial<GenerationRun> & {
    worldId: string;
    targetTitle: string;
    targetSlug: string;
  }
) {
  const timestamp = nowIso();
  const run: GenerationRun = {
    id: crypto.randomUUID(),
    worldId: input.worldId,
    articleId: input.articleId ?? null,
    targetTitle: input.targetTitle,
    targetSlug: input.targetSlug,
    model: input.model ?? null,
    promptVersionsJson: input.promptVersionsJson ?? null,
    retrievedContextJson: input.retrievedContextJson ?? null,
    outputJson: input.outputJson ?? null,
    extractionJson: input.extractionJson ?? null,
    validationJson: input.validationJson ?? null,
    status: "started",
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    errorMessage: null,
    errorJson: null
  };
  await database.generationRuns.put(run);
  return run;
}

async function updateGenerationRun(
  database: DadianIndexedDb,
  runId: string,
  changes: Partial<GenerationRun>
) {
  await database.generationRuns.update(runId, {
    ...changes,
    updatedAt: nowIso()
  });
}

function parseJsonObject<T>(text: string): T {
  const trimmed = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(trimmed) as T;
}

function clampCertainty(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.7;
  return Math.min(1, Math.max(0, value));
}
