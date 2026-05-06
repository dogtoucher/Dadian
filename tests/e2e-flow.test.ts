import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { runMigrations } from "../src/lib/db/migrations.ts";
import { extractWikiLinks } from "../src/lib/wiki/links.ts";
import { summarizeMarkdown } from "../src/lib/wiki/markdown.ts";

test("schema supports the workbench continue flow", () => {
  const db = new Database(":memory:");
  runMigrations(db);

  db.prepare(
    `INSERT INTO worlds
     (id, seed, title, canonSummary, entrySlug, createdAt, updatedAt)
     VALUES ('world-1', '一个足够长的世界种子。', '测试世界', '世界摘要', '入口词条', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();
  db.prepare(
    `INSERT INTO articles
     (id, worldId, slug, title, status, summary, markdown, linksJson, createdAt, updatedAt)
     VALUES ('article-1', 'world-1', '入口词条', '入口词条', 'ready', '入口摘要', '入口正文，指向 [[旁支词条]]。', '["旁支词条"]', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
  ).run();

  const row = db
    .prepare(
      `SELECT
         COALESCE(
           w.entrySlug,
           (SELECT slug FROM articles a WHERE a.worldId = w.id AND a.status = 'ready' ORDER BY a.updatedAt DESC LIMIT 1)
         ) AS continueSlug,
         (SELECT COUNT(*) FROM articles a WHERE a.worldId = w.id AND a.status = 'ready') AS articleCount
       FROM worlds w
       WHERE w.id = 'world-1'`
    )
    .get() as { continueSlug: string; articleCount: number };

  assert.equal(row.continueSlug, "入口词条");
  assert.equal(row.articleCount, 1);
});

test("manual article edits can refresh summary and related links", () => {
  const markdown =
    "## 新段落\n\n这是一段长度足够的修订正文，明确指向 [[新链接]] 并移除旧链接。";

  assert.match(summarizeMarkdown(markdown), /修订正文/);
  assert.deepEqual(extractWikiLinks(markdown), ["新链接"]);
});
