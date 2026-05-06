import { NextResponse } from "next/server";
import { getGenerationRun } from "@/lib/db/generationRuns";
import { getWorld } from "@/lib/db/worlds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ worldId: string; runId: string }> }
) {
  const { worldId, runId } = await params;
  if (!getWorld(worldId)) {
    return NextResponse.json({ error: "世界不存在。" }, { status: 404 });
  }

  const run = getGenerationRun(runId);
  if (!run || run.worldId !== worldId) {
    return NextResponse.json({ error: "运行记录不存在。" }, { status: 404 });
  }

  return NextResponse.json({ run });
}
