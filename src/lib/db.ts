import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Article, ArticleStatus, World } from "./wiki";
import { nowIso, titleToSlug } from "./wiki";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "infinite-lore.db");

let db: Database.Database | null = null;

function getDb() {
  if (!db) {
    mkdirSync(dataDir, { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS worlds (
        id TEXT PRIMARY KEY,
        seed TEXT NOT NULL,
        title TEXT NOT NULL,
        canonSummary TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        worldId TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('ready', 'generating', 'failed')),
        summary TEXT NOT NULL,
        markdown TEXT NOT NULL,
        linksJson TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(worldId, slug),
        FOREIGN KEY(worldId) REFERENCES worlds(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_articles_world_status ON articles(worldId, status);
    `);
  }

  return db;
}

export function createWorld(seed: string, title: string, canonSummary: string) {
  const database = getDb();
  const id = randomUUID();
  const timestamp = nowIso();

  database
    .prepare(
      `INSERT INTO worlds (id, seed, title, canonSummary, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, seed, title, canonSummary, timestamp, timestamp);

  return getWorld(id);
}

export function getWorld(worldId: string) {
  return (
    getDb()
      .prepare("SELECT * FROM worlds WHERE id = ?")
      .get(worldId) as World | undefined
  );
}

export function updateCanonSummary(worldId: string, canonSummary: string) {
  getDb()
    .prepare("UPDATE worlds SET canonSummary = ?, updatedAt = ? WHERE id = ?")
    .run(canonSummary, nowIso(), worldId);
}

export function getArticle(worldId: string, slug: string) {
  return (
    getDb()
      .prepare("SELECT * FROM articles WHERE worldId = ? AND slug = ?")
      .get(worldId, slug) as Article | undefined
  );
}

export function listReadyArticleSummaries(worldId: string, limit = 8) {
  return getDb()
    .prepare(
      `SELECT title, summary FROM articles
       WHERE worldId = ? AND status = 'ready'
       ORDER BY updatedAt DESC
       LIMIT ?`
    )
    .all(worldId, limit) as Pick<Article, "title" | "summary">[];
}

export function upsertReadyArticle(input: {
  worldId: string;
  title: string;
  summary: string;
  markdown: string;
  links: string[];
}) {
  const database = getDb();
  const timestamp = nowIso();
  const slug = titleToSlug(input.title);
  const existing = getArticle(input.worldId, slug);

  if (existing) {
    database
      .prepare(
        `UPDATE articles
         SET title = ?, status = 'ready', summary = ?, markdown = ?, linksJson = ?, updatedAt = ?
         WHERE worldId = ? AND slug = ?`
      )
      .run(
        input.title,
        input.summary,
        input.markdown,
        JSON.stringify(input.links),
        timestamp,
        input.worldId,
        slug
      );
    return getArticle(input.worldId, slug);
  }

  database
    .prepare(
      `INSERT INTO articles
       (id, worldId, slug, title, status, summary, markdown, linksJson, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'ready', ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      input.worldId,
      slug,
      input.title,
      input.summary,
      input.markdown,
      JSON.stringify(input.links),
      timestamp,
      timestamp
    );

  return getArticle(input.worldId, slug);
}

export function markArticleGenerating(worldId: string, title: string) {
  const database = getDb();
  const slug = titleToSlug(title);
  const timestamp = nowIso();
  const existing = getArticle(worldId, slug);

  if (existing?.status === "ready") {
    return { article: existing, acquired: false };
  }

  if (existing?.status === "generating") {
    return { article: existing, acquired: false };
  }

  if (existing) {
    database
      .prepare(
        `UPDATE articles
         SET status = 'generating', title = ?, updatedAt = ?
         WHERE worldId = ? AND slug = ?`
      )
      .run(title, timestamp, worldId, slug);
    return { article: getArticle(worldId, slug), acquired: true };
  }

  database
    .prepare(
      `INSERT INTO articles
       (id, worldId, slug, title, status, summary, markdown, linksJson, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'generating', '', '', '[]', ?, ?)`
    )
    .run(randomUUID(), worldId, slug, title, timestamp, timestamp);

  return { article: getArticle(worldId, slug), acquired: true };
}

export function markArticleFailed(worldId: string, title: string, message: string) {
  const slug = titleToSlug(title);
  getDb()
    .prepare(
      `UPDATE articles
       SET status = 'failed', summary = ?, markdown = ?, updatedAt = ?
       WHERE worldId = ? AND slug = ?`
    )
    .run("生成失败", message, nowIso(), worldId, slug);
}

export function getArticleStatuses(worldId: string, titles: string[]) {
  const database = getDb();
  const statement = database.prepare(
    "SELECT slug, status FROM articles WHERE worldId = ? AND slug = ?"
  );

  return Object.fromEntries(
    titles.map((title) => {
      const slug = titleToSlug(title);
      const row = statement.get(worldId, slug) as
        | { slug: string; status: ArticleStatus }
        | undefined;
      return [title, row?.status ?? "missing"];
    })
  );
}

export function getRelatedStatuses(worldId: string, linksJson: string) {
  try {
    const titles = JSON.parse(linksJson) as string[];
    return getArticleStatuses(worldId, titles) as Record<
      string,
      ArticleStatus | "missing"
    >;
  } catch {
    return {} as Record<string, ArticleStatus | "missing">;
  }
}
