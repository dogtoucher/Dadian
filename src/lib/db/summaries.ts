import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { nowIso } from "../wiki/slug";

export type SummaryTarget = "overview" | "canon_brief";
export type SummaryStatus = "generated" | "edited";

export type Summary = {
  id: string;
  worldId: string;
  targetType: SummaryTarget;
  targetId: string | null;
  summaryMd: string | null;
  summaryJson: string | null;
  status: SummaryStatus;
  createdAt: string;
  updatedAt: string;
};

export function getSummary(
  worldId: string,
  targetType: SummaryTarget,
  targetId: string | null = null
) {
  return getDb()
    .prepare(
      "SELECT * FROM summaries WHERE worldId = ? AND targetType = ? AND targetId IS ?"
    )
    .get(worldId, targetType, targetId) as Summary | undefined;
}

export function upsertSummary(input: {
  worldId: string;
  targetType: SummaryTarget;
  targetId?: string;
  summaryMd?: string;
  summaryJson?: string;
  status?: SummaryStatus;
}) {
  const database = getDb();
  const timestamp = nowIso();
  const existing = getSummary(input.worldId, input.targetType, input.targetId ?? null);

  if (existing) {
    database
      .prepare(
        `UPDATE summaries
         SET summaryMd = COALESCE(?, summaryMd),
             summaryJson = COALESCE(?, summaryJson),
             status = COALESCE(?, status),
             updatedAt = ?
         WHERE id = ?`
      )
      .run(
        input.summaryMd ?? null,
        input.summaryJson ?? null,
        input.status ?? null,
        timestamp,
        existing.id
      );
    return getSummary(input.worldId, input.targetType, input.targetId ?? null)!;
  }

  const id = randomUUID();
  database
    .prepare(
      `INSERT INTO summaries
       (id, worldId, targetType, targetId, summaryMd, summaryJson, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.worldId,
      input.targetType,
      input.targetId ?? null,
      input.summaryMd ?? null,
      input.summaryJson ?? null,
      input.status ?? "generated",
      timestamp,
      timestamp
    );

  return getSummary(input.worldId, input.targetType, input.targetId ?? null)!;
}
