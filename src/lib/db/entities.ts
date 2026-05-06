import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { nowIso } from "../wiki/slug";

export type EntityStatus =
  | "provisional"
  | "accepted"
  | "canonical"
  | "rejected"
  | "deprecated";

export type Entity = {
  id: string;
  worldId: string;
  canonicalName: string;
  slug: string;
  type: string | null;
  summary: string | null;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export function getEntity(worldId: string, slug: string) {
  return getDb()
    .prepare("SELECT * FROM entities WHERE worldId = ? AND slug = ?")
    .get(worldId, slug) as Entity | undefined;
}

export function getEntityById(id: string) {
  return getDb()
    .prepare("SELECT * FROM entities WHERE id = ?")
    .get(id) as Entity | undefined;
}

export function listEntities(worldId: string) {
  return getDb()
    .prepare(
      "SELECT * FROM entities WHERE worldId = ? ORDER BY canonicalName"
    )
    .all(worldId) as Entity[];
}

export function upsertEntity(input: {
  worldId: string;
  canonicalName: string;
  slug: string;
  type?: string;
  summary?: string;
  status?: EntityStatus;
}) {
  const database = getDb();
  const timestamp = nowIso();
  const existing = getEntity(input.worldId, input.slug);

  if (existing) {
    database
      .prepare(
        `UPDATE entities
         SET canonicalName = ?, type = COALESCE(?, type),
             summary = COALESCE(?, summary), updatedAt = ?
         WHERE worldId = ? AND slug = ?`
      )
      .run(
        input.canonicalName,
        input.type ?? null,
        input.summary ?? null,
        timestamp,
        input.worldId,
        input.slug
      );
    return getEntity(input.worldId, input.slug)!;
  }

  const id = randomUUID();
  database
    .prepare(
      `INSERT INTO entities (id, worldId, canonicalName, slug, type, summary, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.worldId,
      input.canonicalName,
      input.slug,
      input.type ?? null,
      input.summary ?? null,
      input.status ?? "provisional",
      timestamp,
      timestamp
    );

  return getEntity(input.worldId, input.slug)!;
}

export function updateEntityStatus(
  worldId: string,
  entityId: string,
  status: EntityStatus
) {
  getDb()
    .prepare("UPDATE entities SET status = ?, updatedAt = ? WHERE id = ? AND worldId = ?")
    .run(status, nowIso(), entityId, worldId);
}
