import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { nowIso } from "../wiki/slug";

export type RelationStatus =
  | "provisional"
  | "accepted"
  | "canonical"
  | "disputed"
  | "rejected"
  | "deprecated";

export type Relation = {
  id: string;
  worldId: string;
  sourceEntityId: string;
  relationType: string;
  targetEntityId: string;
  status: RelationStatus;
  certainty: number;
  sourceArticleId: string | null;
  createdAt: string;
};

export function insertRelation(input: {
  worldId: string;
  sourceEntityId: string;
  relationType: string;
  targetEntityId: string;
  status?: RelationStatus;
  certainty?: number;
  sourceArticleId?: string;
}) {
  const id = randomUUID();
  const timestamp = nowIso();

  getDb()
    .prepare(
      `INSERT INTO relations
       (id, worldId, sourceEntityId, relationType, targetEntityId, status, certainty, sourceArticleId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.worldId,
      input.sourceEntityId,
      input.relationType,
      input.targetEntityId,
      input.status ?? "provisional",
      input.certainty ?? 0.7,
      input.sourceArticleId ?? null,
      timestamp
    );

  return getDb()
    .prepare("SELECT * FROM relations WHERE id = ?")
    .get(id) as Relation;
}

export function listRelationsByEntity(worldId: string, entityId: string) {
  return getDb()
    .prepare(
      `SELECT * FROM relations
       WHERE worldId = ? AND (sourceEntityId = ? OR targetEntityId = ?)
       ORDER BY createdAt DESC`
    )
    .all(worldId, entityId, entityId) as Relation[];
}
