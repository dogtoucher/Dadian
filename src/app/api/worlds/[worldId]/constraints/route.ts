import { NextResponse } from "next/server";
import { addConstraint, listConstraints } from "@/lib/db/constraints";
import { getWorld } from "@/lib/db/worlds";
import { constraintCreateRequestSchema } from "@/lib/api/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ worldId: string }> }
) {
  const { worldId } = await params;
  if (!getWorld(worldId)) {
    return NextResponse.json({ error: "世界不存在。" }, { status: 404 });
  }

  return NextResponse.json({ constraints: listConstraints(worldId) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ worldId: string }> }
) {
  const { worldId } = await params;
  if (!getWorld(worldId)) {
    return NextResponse.json({ error: "世界不存在。" }, { status: 404 });
  }

  const parsed = constraintCreateRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "缺少约束参数。" },
      { status: 400 }
    );
  }

  const constraint = addConstraint({
    worldId,
    scopeType: parsed.data.scopeType,
    scopeId: parsed.data.scopeId,
    constraintType: parsed.data.constraintType,
    text: parsed.data.text,
    strength: parsed.data.strength ?? "soft"
  });

  return NextResponse.json({ constraint });
}
