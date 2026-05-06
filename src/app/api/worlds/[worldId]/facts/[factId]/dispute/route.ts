import { NextResponse } from "next/server";
import { getFact, updateFactStatusForWorld } from "@/lib/db/facts";
import { getWorld } from "@/lib/db/worlds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ worldId: string; factId: string }> }
) {
  const { worldId, factId } = await params;
  if (!getWorld(worldId)) {
    return NextResponse.json({ error: "世界不存在。" }, { status: 404 });
  }

  const existing = getFact(factId);
  if (!existing || existing.worldId !== worldId) {
    return NextResponse.json({ error: "事实不存在。" }, { status: 404 });
  }

  const fact = updateFactStatusForWorld(worldId, factId, "disputed");
  return NextResponse.json({ fact });
}
