import { NextResponse } from "next/server";
import {
  getArticle,
  getWorld,
  listReadyArticleSummaries,
  markArticleFailed,
  markArticleGenerating,
  updateCanonSummary as saveCanonSummary,
  upsertReadyArticle
} from "@/lib/db";
import {
  decodeOpenAIStream,
  streamArticleGeneration,
  updateCanonSummary
} from "@/lib/llm";
import {
  extractWikiLinks,
  summarizeMarkdown,
  titleToSlug
} from "@/lib/wiki";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ worldId: string }> }
) {
  const { worldId } = await params;
  const body = (await request.json()) as {
    title?: string;
    sourceSlug?: string;
  };
  const title = body.title?.trim();
  const world = getWorld(worldId);

  if (!world) {
    return NextResponse.json({ error: "世界不存在。" }, { status: 404 });
  }

  if (!title) {
    return NextResponse.json({ error: "缺少词条标题。" }, { status: 400 });
  }

  const lock = markArticleGenerating(worldId, title);
  if (!lock.acquired && lock.article?.status === "ready") {
    return new Response(sse({ type: "done", slug: titleToSlug(title) }), {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });
  }
  if (!lock.acquired && lock.article?.status === "generating") {
    return new Response(
      sse({ type: "error", error: "这一页仍在整理，请稍后刷新。" }),
      {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache"
        }
      }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let markdown = "";

      try {
        const sourceArticle = body.sourceSlug
          ? getArticle(worldId, body.sourceSlug)
          : undefined;
        const relatedArticles = listReadyArticleSummaries(worldId, 8);
        const llmBody = await streamArticleGeneration({
          world,
          title,
          sourceArticle: sourceArticle
            ? { title: sourceArticle.title, summary: sourceArticle.summary }
            : undefined,
          relatedArticles
        });

        for await (const delta of decodeOpenAIStream(llmBody)) {
          markdown += delta;
          controller.enqueue(encoder.encode(sse({ type: "delta", text: delta })));
        }

        const summary = summarizeMarkdown(markdown);
        const links = extractWikiLinks(markdown);
        upsertReadyArticle({
          worldId,
          title,
          summary,
          markdown,
          links
        });

        const latestWorld = getWorld(worldId);
        if (latestWorld) {
          const canonSummary = await updateCanonSummary({
            world: latestWorld,
            newTitle: title,
            newSummary: summary
          });
          saveCanonSummary(worldId, canonSummary);
        }

        controller.enqueue(
          encoder.encode(sse({ type: "done", slug: titleToSlug(title) }))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "生成失败。";
        markArticleFailed(worldId, title, message);
        controller.enqueue(encoder.encode(sse({ type: "error", error: message })));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
