import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { nowIso } from "../wiki/slug";

export type ConstraintScope = "world" | "entity" | "article";
export type ConstraintType =
  | "negative"
  | "style"
  | "hard_rule"
  | "soft_preference"
  | "generation_policy";
export type ConstraintStrength = "soft" | "hard";

export type Constraint = {
  id: string;
  worldId: string;
  scopeType: ConstraintScope;
  scopeId: string | null;
  constraintType: ConstraintType;
  text: string;
  strength: ConstraintStrength;
  createdAt: string;
  updatedAt: string;
};

export function addConstraint(input: {
  worldId: string;
  scopeType: ConstraintScope;
  scopeId?: string;
  constraintType: ConstraintType;
  text: string;
  strength?: ConstraintStrength;
}) {
  const id = randomUUID();
  const timestamp = nowIso();

  getDb()
    .prepare(
      `INSERT INTO constraints
       (id, worldId, scopeType, scopeId, constraintType, text, strength, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.worldId,
      input.scopeType,
      input.scopeId ?? null,
      input.constraintType,
      input.text,
      input.strength ?? "soft",
      timestamp,
      timestamp
    );

  return getDb()
    .prepare("SELECT * FROM constraints WHERE id = ?")
    .get(id) as Constraint;
}

export function listConstraints(
  worldId: string,
  scopeType?: ConstraintScope,
  scopeId?: string
) {
  let sql =
    "SELECT * FROM constraints WHERE worldId = ?";
  const params: (string | null)[] = [worldId];

  if (scopeType) {
    sql += " AND scopeType = ?";
    params.push(scopeType);
  }
  if (scopeId) {
    sql += " AND scopeId = ?";
    params.push(scopeId);
  }

  return getDb()
    .prepare(
      `${sql} ORDER BY createdAt DESC`
    )
    .all(...params) as Constraint[];
}

export function listHardNegativeConstraints(worldId: string) {
  return getDb()
    .prepare(
      `SELECT * FROM constraints
       WHERE worldId = ? AND constraintType = 'negative' AND strength = 'hard'
       ORDER BY createdAt DESC`
    )
    .all(worldId) as Constraint[];
}

export function listRejectedDirections(worldId: string) {
  return (
    getDb()
      .prepare(
        `SELECT text FROM constraints
         WHERE worldId = ? AND constraintType = 'negative'
         ORDER BY createdAt DESC`
      )
      .all(worldId) as { text: string }[]
  ).map((r) => r.text);
}
