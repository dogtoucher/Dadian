import { NextResponse } from "next/server";
import { getArticle, getRelatedStatuses, getWorld } from "@/lib/db";
import { slugToTitle } from "@/lib/wiki";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ worldId: string; slug: string }> }
) {
  const { worldId, slug } = await params;

  if (!getWorld(worldId)) {
    return NextResponse.json({ error: "世界不存在。" }, { status: 404 });
  }

  const article = getArticle(worldId, slug);

  if (!article) {
    return NextResponse.json({
      status: "missing",
      title: slugToTitle(slug)
    });
  }

  return NextResponse.json({
    status: article.status,
    article: {
      title: article.title,
      summary: article.summary,
      markdown: article.markdown,
      links: JSON.parse(article.linksJson) as string[],
      linkStatuses: getRelatedStatuses(worldId, article.linksJson)
    }
  });
}
