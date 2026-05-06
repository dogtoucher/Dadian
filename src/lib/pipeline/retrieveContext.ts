import { getWorld } from "@/lib/db/worlds";
import {
  listReadyArticleSummaries,
  listReadyArticlesByEntityIds
} from "@/lib/db/articles";
import { getEntity } from "@/lib/db/entities";
import { listAcceptedFactTexts, listFacts } from "@/lib/db/facts";
import { listRejectedDirections } from "@/lib/db/constraints";

export type RetrievedContext = {
  world: {
    id: string;
    title: string;
    seed: string;
    canonSummary: string;
  };
  targetEntity?: {
    id: string;
    name: string;
    type?: string;
    summary?: string;
    status: string;
  };
  hardFacts: string[];
  acceptedFacts: string[];
  disputedClaims: string[];
  rejectedDirections: string[];
  relatedArticles: Array<{
    title: string;
    slug: string;
    summary: string;
  }>;
};

export function retrieveContext(
  worldId: string,
  targetTitle: string,
  entityId?: string
): RetrievedContext {
  const world = getWorld(worldId);
  if (!world) {
    throw new Error("世界不存在。");
  }

  const targetEntity = entityId ? getEntity(worldId, entityId) : undefined;
  const acceptedFacts = listAcceptedFactTexts(worldId);
  const rejectedDirections = listRejectedDirections(worldId);
  const entityArticles = entityId
    ? listReadyArticlesByEntityIds(worldId, [entityId])
    : [];
  const recentArticles = listReadyArticleSummaries(worldId, 8);
  const relatedArticles = [...entityArticles, ...recentArticles]
    .filter(
      (article, index, articles) =>
        articles.findIndex((candidate) => candidate.slug === article.slug) === index
    )
    .slice(0, 8);

  const hardFacts = listFacts(worldId, "canonical")
    .map((fact) => fact.factText)
    .slice(0, 24);
  const disputedClaims = listFacts(worldId, "disputed")
    .map((fact) => fact.factText)
    .slice(0, 24);

  return {
    world: {
      id: world.id,
      title: world.title,
      seed: world.seed,
      canonSummary: world.canonSummary
    },
    targetEntity: targetEntity
      ? {
          id: targetEntity.id,
          name: targetEntity.canonicalName,
          type: targetEntity.type ?? undefined,
          summary: targetEntity.summary ?? undefined,
          status: targetEntity.status
        }
      : undefined,
    hardFacts,
    acceptedFacts,
    disputedClaims,
    rejectedDirections,
    relatedArticles: relatedArticles.map((a) => ({
      title: a.title,
      slug: a.slug,
      summary: a.summary
    }))
  };
}
