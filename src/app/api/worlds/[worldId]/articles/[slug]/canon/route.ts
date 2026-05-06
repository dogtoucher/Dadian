import { NextResponse } from "next/server";
import { getArticle } from "@/lib/db/articles";
import { getWorld } from "@/lib/db/worlds";
import { listFactsByEntity, listFacts } from "@/lib/db/facts";
import { listConstraints } from "@/lib/db/constraints";
import { listGenerationRuns } from "@/lib/db/generationRuns";
import { listPageVersions } from "@/lib/db/pageVersions";
import { getEntity } from "@/lib/db/entities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ worldId: string; slug: string }> }
) {
  const { worldId, slug } = await params;
  const world = getWorld(worldId);

  if (!world) {
    return NextResponse.json({ error: "世界不存在。" }, { status: 404 });
  }

  const article = getArticle(worldId, slug);
  if (!article) {
    return NextResponse.json({ error: "词条不存在。" }, { status: 404 });
  }

  const entity = article.entityId ? getEntity(worldId, article.entityId) : undefined;
  const facts = entity
    ? listFactsByEntity(worldId, entity.id)
    : listFacts(worldId);
  const constraints = listConstraints(worldId);
  const runs = listGenerationRuns(worldId, 10);
  const versions = listPageVersions(article.id);

  return NextResponse.json({
    articleId: article.id,
    entity,
    facts,
    constraints,
    recentRuns: runs,
    versions
  });
}
