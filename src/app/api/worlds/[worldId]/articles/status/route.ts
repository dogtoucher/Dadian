import { NextResponse } from "next/server";
import { getArticleStatuses, getWorld } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ worldId: string }> }
) {
  const { worldId } = await params;

  if (!getWorld(worldId)) {
    return NextResponse.json({ error: "世界不存在。" }, { status: 404 });
  }

  const body = (await request.json()) as { titles?: string[] };
  const titles = Array.isArray(body.titles) ? body.titles : [];

  return NextResponse.json({
    statuses: getArticleStatuses(worldId, titles)
  });
}
