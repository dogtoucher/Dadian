import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { nowIso } from "../wiki/slug";

export type FactStatus =
  | "provisional"
  | "accepted"
  | "canonical"
  | "disputed"
  | "rejected"
  | "deprecated";

export type Fact = {
  id: string;
  worldId: string;
  subjectEntityId: string | null;
  predicate: string | null;
  objectEntityId: string | null;
  objectText: string | null;
  factText: string;
  status: FactStatus;
  certainty: number;
  sourceArticleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function listFacts(worldId: string, status?: FactStatus) {
  const database = getDb();
  if (status) {
    return database
      .prepare(
        "SELECT * FROM facts WHERE worldId = ? AND status = ? ORDER BY createdAt DESC"
      )
      .all(worldId, status) as Fact[];
  }
  return database
    .prepare(
      "SELECT * FROM facts WHERE worldId = ? ORDER BY createdAt DESC"
    )
    .all(worldId) as Fact[];
}

export function listFactsByEntity(worldId: string, entityId: string) {
  return getDb()
    .prepare(
      `SELECT * FROM facts
       WHERE worldId = ? AND (subjectEntityId = ? OR objectEntityId = ?)
       ORDER BY createdAt DESC`
    )
    .all(worldId, entityId, entityId) as Fact[];
}

export function listAcceptedFacts(worldId: string) {
  return getDb()
    .prepare(
      `SELECT * FROM facts
       WHERE worldId = ? AND status IN ('accepted', 'canonical')
       ORDER BY createdAt DESC`
    )
    .all(worldId) as Fact[];
}

export function insertFact(input: {
  worldId: string;
  subjectEntityId?: string;
  predicate?: string;
  objectEntityId?: string;
  objectText?: string;
  factText: string;
  status?: FactStatus;
  certainty?: number;
  sourceArticleId?: string;
}) {
  const id = randomUUID();
  const timestamp = nowIso();

  getDb()
    .prepare(
      `INSERT INTO facts
       (id, worldId, subjectEntityId, predicate, objectEntityId, objectText,
        factText, status, certainty, sourceArticleId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.worldId,
      input.subjectEntityId ?? null,
      input.predicate ?? null,
      input.objectEntityId ?? null,
      input.objectText ?? null,
      input.factText,
      input.status ?? "provisional",
      input.certainty ?? 0.7,
      input.sourceArticleId ?? null,
      timestamp,
      timestamp
    );

  return getDb().prepare("SELECT * FROM facts WHERE id = ?").get(id) as Fact;
}

export function updateFactStatus(factId: string, status: FactStatus) {
  getDb()
    .prepare("UPDATE facts SET status = ?, updatedAt = ? WHERE id = ?")
    .run(status, nowIso(), factId);
}

export function updateFactStatusForWorld(
  worldId: string,
  factId: string,
  status: FactStatus
) {
  getDb()
    .prepare(
      "UPDATE facts SET status = ?, updatedAt = ? WHERE id = ? AND worldId = ?"
    )
    .run(status, nowIso(), factId, worldId);

  return getFact(factId);
}

export function getFact(factId: string) {
  return getDb()
    .prepare("SELECT * FROM facts WHERE id = ?")
    .get(factId) as Fact | undefined;
}

export function listAcceptedFactTexts(worldId: string) {
  return (
    getDb()
      .prepare(
        `SELECT factText FROM facts
         WHERE worldId = ? AND status IN ('accepted', 'canonical')
         ORDER BY createdAt DESC`
      )
      .all(worldId) as { factText: string }[]
  ).map((r) => r.factText);
}
