import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { runMigrations } from "../src/lib/db/migrations.ts";

function columnNames(db: Database.Database, tableName: string) {
  return (
    db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[]
  ).map((row) => row.name);
}

test("runMigrations creates the current schema on a clean database", () => {
  const db = new Database(":memory:");
  runMigrations(db);

  assert.deepEqual(
    ["entityId", "version"].every((name) =>
      columnNames(db, "articles").includes(name)
    ),
    true
  );
  assert.deepEqual(
    ["entrySlug", "defaultLocale"].every((name) =>
      columnNames(db, "worlds").includes(name)
    ),
    true
  );
  assert.equal(columnNames(db, "articles").includes("locale"), true);
  assert.equal(columnNames(db, "entity_aliases").includes("locale"), true);
  assert.deepEqual(
    ["updatedAt", "completedAt", "errorMessage", "errorJson"].every((name) =>
      columnNames(db, "generation_runs").includes(name)
    ),
    true
  );
  assert.equal(
    (
      db
        .prepare("SELECT COUNT(*) AS count FROM migrations")
        .get() as { count: number }
    ).count,
    4
  );
});

test("runMigrations records migrations in deterministic order", () => {
  const db = new Database(":memory:");
  runMigrations(db);

  assert.deepEqual(
    (
      db
        .prepare("SELECT id FROM migrations ORDER BY id")
        .all() as { id: string }[]
    ).map((row) => row.id),
    [
      "0001_initial",
      "0002_canon_tables",
      "0003_summaries",
      "0004_workbench_dashboard"
    ]
  );
});
