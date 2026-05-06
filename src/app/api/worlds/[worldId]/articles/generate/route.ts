import { NextResponse } from "next/server";
import { getWorld } from "@/lib/db";
import { generateArticle } from "@/lib/pipeline/generateArticle";
import { generateArticleRequestSchema } from "@/lib/api/schemas";

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
  if (!getWorld(worldId)) {
    return NextResponse.json({ error: "世界不存在。" }, { status: 404 });
  }

  const parsed = generateArticleRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "请求参数无效。" },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const result = await generateArticle({
        worldId,
        title: parsed.data.title,
        sourceSlug: parsed.data.sourceSlug,
        onDelta: (delta) => {
          controller.enqueue(encoder.encode(sse({ type: "delta", text: delta })));
        }
      });

      controller.enqueue(encoder.encode(sse(result)));
      controller.close();
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
