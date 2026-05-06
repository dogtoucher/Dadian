import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrations";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "infinite-lore.db");

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    mkdirSync(dataDir, { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
  }

  return db;
}

export { runMigrations };
