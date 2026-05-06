import { NextResponse } from "next/server";
import {
  getArticle,
  getRelatedStatuses,
  updateArticle
} from "@/lib/db/articles";
import { getWorld } from "@/lib/db/worlds";
import { savePageVersion } from "@/lib/db/pageVersions";
import { slugToTitle } from "@/lib/wiki";
import { articlePatchRequestSchema } from "@/lib/api/schemas";
import { extractAndCommitCanon } from "@/lib/pipeline/generateArticle";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ worldId: string; slug: string }> }
) {
  const { worldId, slug } = await params;
  const world = getWorld(worldId);

  if (!world) {
    return NextResponse.json({ error: "世界不存在。" }, { status: 404 });
  }

  const parsed = articlePatchRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "请求参数无效。" },
      { status: 400 }
    );
  }

  const existing = getArticle(worldId, slug);
  if (!existing) {
    return NextResponse.json({ error: "词条不存在。" }, { status: 404 });
  }

  savePageVersion({
    articleId: existing.id,
    version: (existing.version ?? 1) + 1,
    contentMd: parsed.data.markdown,
    changeReason: "manual_edit"
  });

  const updated = updateArticle(worldId, slug, parsed.data.markdown);
  if (updated) {
    await extractAndCommitCanon({
      worldId,
      articleId: updated.id,
      articleTitle: updated.title,
      markdown: updated.markdown,
      source: "manual_edit"
    });
  }

  return NextResponse.json({ article: updated });
}
