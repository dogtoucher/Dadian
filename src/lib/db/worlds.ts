import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { nowIso, titleToSlug } from "../wiki/slug";
import type { World } from "../wiki/titles";

export type WorldOverview = Pick<
  World,
  "id" | "title" | "seed" | "canonSummary" | "entrySlug" | "createdAt" | "updatedAt"
> & {
  articleCount: number;
  entityCount: number;
  factCount: number;
  pendingFactCount: number;
  generationRunCount: number;
  continueSlug: string | null;
  continueTitle: string | null;
};

export type WorkspaceStats = {
  worldCount: number;
  articleCount: number;
  entityCount: number;
  factCount: number;
  pendingFactCount: number;
  relationCount: number;
  constraintCount: number;
  generationRunCount: number;
};

export type RecentActivity = {
  id: string;
  worldId: string;
  worldTitle: string;
  type: "article" | "fact" | "run";
  title: string;
  status: string;
  slug: string | null;
  occurredAt: string;
};

export function createWorld(
  seed: string,
  title: string,
  canonSummary: string,
  entryTitle?: string
) {
  const database = getDb();
  const id = randomUUID();
  const timestamp = nowIso();
  const entrySlug = entryTitle ? titleToSlug(entryTitle) : null;

  database
    .prepare(
      `INSERT INTO worlds
       (id, seed, title, canonSummary, entrySlug, defaultLocale, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'zh-CN', ?, ?)`
    )
    .run(id, seed, title, canonSummary, entrySlug, timestamp, timestamp);

  return getWorld(id);
}

export function getWorld(worldId: string) {
  return getDb()
    .prepare("SELECT * FROM worlds WHERE id = ?")
    .get(worldId) as World | undefined;
}

export function updateCanonSummary(worldId: string, canonSummary: string) {
  getDb()
    .prepare("UPDATE worlds SET canonSummary = ?, updatedAt = ? WHERE id = ?")
    .run(canonSummary, nowIso(), worldId);
}

export function listWorldOverviews(limit = 12) {
  return getDb()
    .prepare(
      `SELECT
         w.id,
         w.title,
         w.seed,
         w.canonSummary,
         w.entrySlug,
         w.createdAt,
         w.updatedAt,
         (SELECT COUNT(*) FROM articles a WHERE a.worldId = w.id AND a.status = 'ready') AS articleCount,
         (SELECT COUNT(*) FROM entities e WHERE e.worldId = w.id) AS entityCount,
         (SELECT COUNT(*) FROM facts f WHERE f.worldId = w.id) AS factCount,
         (SELECT COUNT(*) FROM facts f WHERE f.worldId = w.id AND f.status IN ('provisional', 'disputed')) AS pendingFactCount,
         (SELECT COUNT(*) FROM generation_runs gr WHERE gr.worldId = w.id) AS generationRunCount,
         COALESCE(
           w.entrySlug,
           (SELECT slug FROM articles a WHERE a.worldId = w.id AND a.status = 'ready' ORDER BY a.updatedAt DESC LIMIT 1)
         ) AS continueSlug,
         COALESCE(
           (SELECT title FROM articles a WHERE a.worldId = w.id AND a.slug = w.entrySlug LIMIT 1),
           (SELECT title FROM articles a WHERE a.worldId = w.id AND a.status = 'ready' ORDER BY a.updatedAt DESC LIMIT 1)
         ) AS continueTitle
       FROM worlds w
       ORDER BY w.updatedAt DESC
       LIMIT ?`
    )
    .all(limit) as WorldOverview[];
}

export function getWorkspaceStats() {
  return getDb()
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM worlds) AS worldCount,
         (SELECT COUNT(*) FROM articles WHERE status = 'ready') AS articleCount,
         (SELECT COUNT(*) FROM entities) AS entityCount,
         (SELECT COUNT(*) FROM facts) AS factCount,
         (SELECT COUNT(*) FROM facts WHERE status IN ('provisional', 'disputed')) AS pendingFactCount,
         (SELECT COUNT(*) FROM relations) AS relationCount,
         (SELECT COUNT(*) FROM constraints) AS constraintCount,
         (SELECT COUNT(*) FROM generation_runs) AS generationRunCount`
    )
    .get() as WorkspaceStats;
}

export function getRecentActivity(limit = 12) {
  return getDb()
    .prepare(
      `SELECT * FROM (
         SELECT
           a.id AS id,
           w.id AS worldId,
           w.title AS worldTitle,
           'article' AS type,
           a.title AS title,
           a.status AS status,
           a.slug AS slug,
           a.updatedAt AS occurredAt
         FROM articles a
         JOIN worlds w ON w.id = a.worldId
         UNION ALL
         SELECT
           f.id AS id,
           w.id AS worldId,
           w.title AS worldTitle,
           'fact' AS type,
           f.factText AS title,
           f.status AS status,
           NULL AS slug,
           f.updatedAt AS occurredAt
         FROM facts f
         JOIN worlds w ON w.id = f.worldId
         UNION ALL
         SELECT
           gr.id AS id,
           w.id AS worldId,
           w.title AS worldTitle,
           'run' AS type,
           gr.targetTitle AS title,
           gr.status AS status,
           gr.targetSlug AS slug,
           COALESCE(gr.updatedAt, gr.createdAt) AS occurredAt
         FROM generation_runs gr
         JOIN worlds w ON w.id = gr.worldId
       )
       ORDER BY occurredAt DESC
       LIMIT ?`
    )
    .all(limit) as RecentActivity[];
}
