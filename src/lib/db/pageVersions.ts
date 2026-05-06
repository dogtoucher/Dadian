import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { nowIso } from "../wiki/slug";

export type PageVersion = {
  id: string;
  articleId: string;
  version: number;
  contentMd: string;
  changeReason: string | null;
  createdAt: string;
};

export function savePageVersion(input: {
  articleId: string;
  version: number;
  contentMd: string;
  changeReason?: string;
}) {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO page_versions (id, articleId, version, contentMd, changeReason, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.articleId,
      input.version,
      input.contentMd,
      input.changeReason ?? null,
      nowIso()
    );
  return getDb()
    .prepare("SELECT * FROM page_versions WHERE id = ?")
    .get(id) as PageVersion;
}

export function listPageVersions(articleId: string) {
  return getDb()
    .prepare(
      "SELECT * FROM page_versions WHERE articleId = ? ORDER BY version DESC"
    )
    .all(articleId) as PageVersion[];
}
