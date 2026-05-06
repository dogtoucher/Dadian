import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { nowIso } from "../wiki/slug";

export type EntityAlias = {
  id: string;
  worldId: string;
  entityId: string;
  alias: string;
  normalizedAlias: string;
  locale: string | null;
  createdAt: string;
};

function normalize(text: string) {
  return text.trim().toLowerCase();
}

export function addAlias(
  worldId: string,
  entityId: string,
  alias: string,
  locale?: string
) {
  const normalized = normalize(alias);
  const existing = getDb()
    .prepare(
      "SELECT * FROM entity_aliases WHERE worldId = ? AND normalizedAlias = ?"
    )
    .get(worldId, normalized) as EntityAlias | undefined;

  if (existing) return existing;

  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO entity_aliases (id, worldId, entityId, alias, normalizedAlias, locale, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, worldId, entityId, alias, normalized, locale ?? null, nowIso());

  return getDb()
    .prepare("SELECT * FROM entity_aliases WHERE id = ?")
    .get(id) as EntityAlias;
}

export function findEntityByAlias(worldId: string, alias: string) {
  const normalized = normalize(alias);
  return getDb()
    .prepare(
      "SELECT entityId FROM entity_aliases WHERE worldId = ? AND normalizedAlias = ?"
    )
    .get(worldId, normalized) as { entityId: string } | undefined;
}
