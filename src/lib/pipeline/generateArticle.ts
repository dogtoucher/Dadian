import {
  getArticle,
  listReadyArticleTitles,
  getWorld,
  markArticleFailed,
  markArticleGenerating,
  updateCanonSummary as saveCanonSummary,
  upsertReadyArticle
} from "@/lib/db";
import {
  createGenerationRun,
  updateGenerationRun
} from "@/lib/db/generationRuns";
import { listConstraints } from "@/lib/db/constraints";
import { listAcceptedFacts, listAcceptedFactTexts } from "@/lib/db/facts";
import {
  addWikiLinksToArticle,
  decodeOpenAIStream,
  streamArticleGeneration,
  updateCanonSummary
} from "@/lib/llm";
import { getModelName } from "@/lib/llm/client";
import { extractCanonPrompt } from "@/lib/prompts/extractCanon";
import { generateArticlePrompt } from "@/lib/prompts/generateArticle";
import {
  cleanMetaNarration,
  enrichWikiLinks,
  extractWikiLinks,
  nowIso,
  summarizeMarkdown,
  titleToSlug
} from "@/lib/wiki";
import { commitExtraction } from "./commitGeneration";
import { extractCanon } from "./extractCanon";
import { resolveEntity } from "./resolveEntity";
import { retrieveContext } from "./retrieveContext";
import { validateCanon } from "./validateCanon";

export type ArticleGenerationResult =
  | { type: "done"; slug: string }
  | { type: "error"; error: string };

export async function extractAndCommitCanon(input: {
  worldId: string;
  articleId: string;
  articleTitle: string;
  markdown: string;
  source: "generation" | "manual_edit";
}) {
  const run = createGenerationRun({
    worldId: input.worldId,
    articleId: input.articleId,
    targetTitle: input.articleTitle,
    targetSlug: titleToSlug(input.articleTitle),
    model: getModelName(),
    promptVersionsJson: JSON.stringify({
      extractCanon: extractCanonPrompt.version
    })
  });

  try {
    updateGenerationRun(run.id, {
      outputJson: JSON.stringify({
        source: input.source,
        markdown: input.markdown
      })
    });

    const extraction = await extractCanon({
      articleTitle: input.articleTitle,
      markdown: input.markdown
    });

    if (extraction.extraction) {
      updateGenerationRun(run.id, {
        extractionJson: JSON.stringify(extraction.extraction)
      });

      const validation = validateCanon(
        extraction.extraction,
        listAcceptedFacts(input.worldId),
        listConstraints(input.worldId)
      );

      updateGenerationRun(run.id, {
        validationJson: JSON.stringify(validation)
      });

      if (validation.safeToCommit) {
        commitExtraction(
          input.worldId,
          input.articleId,
          extraction.extraction
        );
      }
    }

    updateGenerationRun(run.id, { status: "completed", completedAt: nowIso() });
  } catch (err) {
    updateGenerationRun(run.id, {
      status: "failed",
      completedAt: nowIso(),
      errorMessage: err instanceof Error ? err.message : "整理失败。",
      errorJson: JSON.stringify({ stage: "canon_refresh" })
    });
  }
}

export async function generateArticle(input: {
  worldId: string;
  title: string;
  sourceSlug?: string;
  onDelta: (delta: string) => void;
}): Promise<ArticleGenerationResult> {
  const world = getWorld(input.worldId);
  if (!world) {
    return { type: "error", error: "世界不存在。" };
  }

  const lock = markArticleGenerating(input.worldId, input.title);
  if (!lock.acquired && lock.article?.status === "ready") {
    return { type: "done", slug: titleToSlug(input.title) };
  }
  if (!lock.acquired && lock.article?.status === "generating") {
    return { type: "error", error: "这一页仍在整理，请稍后刷新。" };
  }

  const entityResolution = resolveEntity(input.worldId, input.title);
  const context = retrieveContext(
    input.worldId,
    input.title,
    entityResolution.entityId
  );

  const genRun = createGenerationRun({
    worldId: input.worldId,
    targetTitle: input.title,
    targetSlug: titleToSlug(input.title),
    model: getModelName(),
    promptVersionsJson: JSON.stringify({
      generateArticle: generateArticlePrompt.version,
      extractCanon: extractCanonPrompt.version
    })
  });

  let markdown = "";

  try {
    const sourceArticle = input.sourceSlug
      ? getArticle(input.worldId, input.sourceSlug)
      : undefined;

    const llmBody = await streamArticleGeneration({
      world,
      title: input.title,
      sourceArticle: sourceArticle
        ? { title: sourceArticle.title, summary: sourceArticle.summary }
        : undefined,
      relatedArticles: context.relatedArticles,
      acceptedFacts: listAcceptedFactTexts(input.worldId),
      hardFacts: context.hardFacts,
      disputedClaims: context.disputedClaims,
      rejectedDirections: context.rejectedDirections
    });

    updateGenerationRun(genRun.id, {
      status: "streaming",
      retrievedContextJson: JSON.stringify(context)
    });

    for await (const delta of decodeOpenAIStream(llmBody)) {
      markdown += delta;
      input.onDelta(delta);
    }

    markdown = cleanMetaNarration(markdown, world.title);
    markdown = enrichWikiLinks(
      markdown,
      [
        ...context.relatedArticles.map((article) => article.title),
        ...listReadyArticleTitles(input.worldId)
      ],
      input.title
    );
    if (!extractWikiLinks(markdown).length) {
      markdown = await addWikiLinksToArticle({
        title: input.title,
        markdown
      });
    }
    const summary = summarizeMarkdown(markdown);
    const article = upsertReadyArticle({
      worldId: input.worldId,
      title: input.title,
      summary,
      markdown,
      links: extractWikiLinks(markdown),
      entityId: entityResolution.entityId
    });

    updateGenerationRun(genRun.id, {
      articleId: article?.id,
      outputJson: JSON.stringify({ summary, markdown })
    });

    if (article) {
      const extraction = await extractCanon({
        articleTitle: input.title,
        markdown
      });

      if (extraction.extraction) {
        updateGenerationRun(genRun.id, {
          extractionJson: JSON.stringify(extraction.extraction)
        });

        const validation = validateCanon(
          extraction.extraction,
          listAcceptedFacts(input.worldId),
          listConstraints(input.worldId)
        );

        updateGenerationRun(genRun.id, {
          validationJson: JSON.stringify(validation)
        });

        if (validation.safeToCommit) {
          commitExtraction(
            input.worldId,
            article.id,
            extraction.extraction
          );
        }
      }
    }

    const latestWorld = getWorld(input.worldId);
    if (latestWorld) {
      const canonSummary = await updateCanonSummary({
        world: latestWorld,
        newTitle: input.title,
        newSummary: summary
      });
      saveCanonSummary(input.worldId, canonSummary);
    }

    updateGenerationRun(genRun.id, { status: "completed", completedAt: nowIso() });
    return { type: "done", slug: titleToSlug(input.title) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "生成失败。";
    markArticleFailed(input.worldId, input.title, message);
    updateGenerationRun(genRun.id, {
      status: "failed",
      completedAt: nowIso(),
      errorMessage: message,
      errorJson: JSON.stringify({ stage: "article_refresh" })
    });
    return { type: "error", error: message };
  }
}
