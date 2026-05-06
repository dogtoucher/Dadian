import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "migrations"
);

function getMigrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function ensureMigrationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      appliedAt TEXT NOT NULL
    );
  `);
}

function getAppliedMigrationIds(db: Database.Database): Set<string> {
  ensureMigrationsTable(db);
  const rows = db.prepare("SELECT id FROM migrations ORDER BY id").all() as {
    id: string;
  }[];
  return new Set(rows.map((r) => r.id));
}

export function runMigrations(db: Database.Database) {
  ensureMigrationsTable(db);
  const applied = getAppliedMigrationIds(db);
  const files = getMigrationFiles();

  for (const file of files) {
    const migrationId = file.replace(/\.sql$/, "");
    if (applied.has(migrationId)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = readFileSync(filePath, "utf-8");

    db.exec(sql);

    db.prepare("INSERT INTO migrations (id, appliedAt) VALUES (?, ?)").run(
      migrationId,
      new Date().toISOString()
    );
  }
}
