import { NextResponse } from "next/server";
import { createWorld, upsertReadyArticle } from "@/lib/db";
import { generateInitialWorld } from "@/lib/llm";
import { extractWikiLinks, titleToSlug } from "@/lib/wiki";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { seed?: string; entryTitle?: string };
    const seed = body.seed?.trim();
    const entryTitle = body.entryTitle?.trim();

    if (!seed || seed.length < 12) {
      return NextResponse.json(
        { error: "请至少输入 12 个字符的世界种子。" },
        { status: 400 }
      );
    }
    if (!entryTitle || entryTitle.length < 2 || entryTitle.length > 40) {
      return NextResponse.json(
        { error: "请输入 2 到 40 个字符的起始词条。" },
        { status: 400 }
      );
    }

    const initial = await generateInitialWorld(seed, entryTitle);
    const world = createWorld(seed, initial.worldTitle, initial.canonSummary, entryTitle);

    if (!world) {
      throw new Error("查询失败。");
    }

    upsertReadyArticle({
      worldId: world.id,
      title: entryTitle,
      summary: initial.articleSummary,
      markdown: initial.markdown,
      links: extractWikiLinks(initial.markdown)
    });

    return NextResponse.json({
      worldId: world.id,
      entrySlug: titleToSlug(entryTitle)
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "查询失败。" },
      { status: 500 }
    );
  }
}
