import { canonExtractionSchema, type CanonExtraction } from "@/lib/validation/schemas";
import { createChatCompletion } from "@/lib/llm/client";
import { extractCanonPrompt } from "@/lib/prompts/extractCanon";

export async function extractCanon(input: {
  articleTitle: string;
  markdown: string;
}): Promise<{ extraction: CanonExtraction | null; error?: string; rawJson?: string }> {
  try {
    const messages = extractCanonPrompt.build(input);
    const raw = await createChatCompletion(messages, { temperature: 0.3 });
    const trimmed = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = canonExtractionSchema.parse(JSON.parse(trimmed));

    return {
      extraction: {
        entities: parsed.entities.map((e) => ({
          name: e.name,
          type: e.type,
          aliases: e.aliases ?? [],
          summary: e.summary
        })),
        facts: parsed.facts.map((f) => ({
          subject: f.subject,
          predicate: f.predicate,
          object: f.object,
          factText: f.factText,
          certainty: f.certainty ?? 0.7,
          statusHint: f.statusHint ?? "asserted"
        })),
        relations: parsed.relations.map((r) => ({
          source: r.source,
          relationType: r.relationType,
          target: r.target,
          certainty: r.certainty ?? 0.7
        })),
        openQuestions: parsed.openQuestions ?? []
      },
      rawJson: trimmed
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "提取失败";
    return { extraction: null, error: message };
  }
}
