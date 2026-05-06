import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { nowIso, titleToSlug } from "../wiki/slug";
import { extractWikiLinks } from "../wiki/links";
import { summarizeMarkdown } from "../wiki/markdown";
import type { Article, ArticleStatus } from "../wiki/titles";

const GENERATION_LOCK_TTL_MS = 2 * 60 * 1000;

function isStaleGeneratingArticle(article: Article) {
  return (
    article.status === "generating" &&
    Date.now() - new Date(article.updatedAt).getTime() > GENERATION_LOCK_TTL_MS
  );
}

export function getArticle(worldId: string, slug: string) {
  return getDb()
    .prepare("SELECT * FROM articles WHERE worldId = ? AND slug = ?")
    .get(worldId, slug) as Article | undefined;
}

export function getArticleById(id: string) {
  return getDb()
    .prepare("SELECT * FROM articles WHERE id = ?")
    .get(id) as Article | undefined;
}

export function listReadyArticleSummaries(worldId: string, limit = 8) {
  return getDb()
    .prepare(
      `SELECT title, summary, slug FROM articles
       WHERE worldId = ? AND status = 'ready'
       ORDER BY updatedAt DESC
       LIMIT ?`
    )
    .all(worldId, limit) as Pick<Article, "title" | "summary" | "slug">[];
}

export function listReadyArticleTitles(worldId: string, limit = 80) {
  return getDb()
    .prepare(
      `SELECT title FROM articles
       WHERE worldId = ? AND status = 'ready'
       ORDER BY updatedAt DESC
       LIMIT ?`
    )
    .all(worldId, limit)
    .map((row) => (row as Pick<Article, "title">).title);
}

export function listReadyArticlesByEntityIds(worldId: string, entityIds: string[]) {
  if (!entityIds.length) return [];
  const placeholders = entityIds.map(() => "?").join(",");
  return getDb()
    .prepare(
      `SELECT title, summary, slug, entityId FROM articles
       WHERE worldId = ? AND status = 'ready' AND entityId IN (${placeholders})
       ORDER BY updatedAt DESC`
    )
    .all(worldId, ...entityIds) as Pick<
    Article,
    "title" | "summary" | "slug" | "entityId"
  >[];
}

export function upsertReadyArticle(input: {
  worldId: string;
  title: string;
  summary: string;
  markdown: string;
  links: string[];
  entityId?: string;
}) {
  const database = getDb();
  const timestamp = nowIso();
  const slug = titleToSlug(input.title);
  const existing = getArticle(input.worldId, slug);

  if (existing) {
    const newVersion = (existing.version ?? 1) + 1;
    database
      .prepare(
        `UPDATE articles
         SET title = ?, status = 'ready', summary = ?, markdown = ?, linksJson = ?,
             updatedAt = ?, entityId = COALESCE(?, entityId), version = ?
         WHERE worldId = ? AND slug = ?`
      )
      .run(
        input.title,
        input.summary,
        input.markdown,
        JSON.stringify(input.links),
        timestamp,
        input.entityId ?? null,
        newVersion,
        input.worldId,
        slug
      );
    return getArticle(input.worldId, slug);
  }

  database
    .prepare(
      `INSERT INTO articles
       (id, worldId, slug, title, status, summary, markdown, linksJson, entityId, version, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'ready', ?, ?, ?, ?, 1, ?, ?)`
    )
    .run(
      randomUUID(),
      input.worldId,
      slug,
      input.title,
      input.summary,
      input.markdown,
      JSON.stringify(input.links),
      input.entityId ?? null,
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

  if (existing?.status === "generating" && !isStaleGeneratingArticle(existing)) {
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
       (id, worldId, slug, title, status, summary, markdown, linksJson, version, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, 'generating', '', '', '[]', 1, ?, ?)`
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

export function updateArticle(worldId: string, slug: string, markdown: string) {
  const database = getDb();
  const timestamp = nowIso();
  const existing = getArticle(worldId, slug);
  if (!existing) return null;

  const newVersion = (existing.version ?? 1) + 1;

  database
    .prepare(
      `UPDATE articles
       SET summary = ?, markdown = ?, linksJson = ?, updatedAt = ?, version = ?
       WHERE worldId = ? AND slug = ?`
    )
    .run(
      summarizeMarkdown(markdown),
      markdown,
      JSON.stringify(extractWikiLinks(markdown)),
      timestamp,
      newVersion,
      worldId,
      slug
    );

  return getArticle(worldId, slug);
}

export function getArticleStatuses(worldId: string, titles: string[]) {
  return Object.fromEntries(
    titles.map((title) => {
      const slug = titleToSlug(title);
      const row = getArticle(worldId, slug);
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
