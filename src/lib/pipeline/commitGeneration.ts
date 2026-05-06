import type { CanonExtraction } from "@/lib/validation/schemas";
import { upsertEntity } from "@/lib/db/entities";
import { addAlias } from "@/lib/db/aliases";
import { insertFact } from "@/lib/db/facts";
import { insertRelation } from "@/lib/db/relations";
import { titleToSlug } from "@/lib/wiki/slug";

export function commitExtraction(
  worldId: string,
  sourceArticleId: string,
  extraction: CanonExtraction
) {
  const nameToEntityId = new Map<string, string>();

  for (const entity of extraction.entities) {
    const slug = titleToSlug(entity.name);
    const created = upsertEntity({
      worldId,
      canonicalName: entity.name,
      slug,
      type: entity.type,
      summary: entity.summary,
      status: "provisional"
    });
    nameToEntityId.set(entity.name, created.id);

    for (const alias of entity.aliases ?? []) {
      addAlias(worldId, created.id, alias);
    }
  }

  for (const fact of extraction.facts) {
    const subjectEntityId = nameToEntityId.get(fact.subject) ?? undefined;
    const objectEntityId = fact.object
      ? (nameToEntityId.get(fact.object) ?? undefined)
      : undefined;

    insertFact({
      worldId,
      subjectEntityId,
      predicate: fact.predicate,
      objectEntityId,
      objectText: objectEntityId ? undefined : fact.object,
      factText: fact.factText,
      status:
        fact.statusHint === "disputed"
          ? "disputed"
          : "provisional",
      certainty: fact.certainty ?? 0.7,
      sourceArticleId
    });
  }

  for (const rel of extraction.relations) {
    const sourceId = nameToEntityId.get(rel.source);
    const targetId = nameToEntityId.get(rel.target);
    if (sourceId && targetId) {
      insertRelation({
        worldId,
        sourceEntityId: sourceId,
        relationType: rel.relationType,
        targetEntityId: targetId,
        certainty: rel.certainty ?? 0.7,
        sourceArticleId
      });
    }
  }
}
