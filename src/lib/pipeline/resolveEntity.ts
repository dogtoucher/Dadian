import { getEntity, upsertEntity } from "@/lib/db/entities";
import { findEntityByAlias } from "@/lib/db/aliases";
import { getArticle } from "@/lib/db/articles";
import { titleToSlug } from "@/lib/wiki/slug";

export type EntityResolution =
  | {
      kind: "existing";
      entityId: string;
      canonicalName: string;
      confidence: number;
    }
  | {
      kind: "created";
      entityId: string;
      canonicalName: string;
      confidence: number;
    };

export function resolveEntity(
  worldId: string,
  title: string
): EntityResolution {
  const slug = titleToSlug(title);

  const entity = getEntity(worldId, slug);
  if (entity) {
    return {
      kind: "existing",
      entityId: entity.id,
      canonicalName: entity.canonicalName,
      confidence: 1.0
    };
  }

  const alias = findEntityByAlias(worldId, title);
  if (alias) {
    const aliasedEntity = getEntity(worldId, alias.entityId);
    if (aliasedEntity) {
      return {
        kind: "existing",
        entityId: aliasedEntity.id,
        canonicalName: aliasedEntity.canonicalName,
        confidence: 0.9
      };
    }
  }

  const article = getArticle(worldId, slug);
  if (article) {
    const newEntity = upsertEntity({
      worldId,
      canonicalName: title,
      slug,
      summary: article.summary,
      status: "provisional"
    });
    return {
      kind: "created",
      entityId: newEntity.id,
      canonicalName: title,
      confidence: 0.5
    };
  }

  const newEntity = upsertEntity({
    worldId,
    canonicalName: title,
    slug,
    status: "provisional"
  });
  return {
    kind: "created",
    entityId: newEntity.id,
    canonicalName: title,
    confidence: 0.3
  };
}
