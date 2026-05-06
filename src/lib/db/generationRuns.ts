import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { nowIso } from "../wiki/slug";

export type GenerationRunStatus = "started" | "streaming" | "completed" | "failed";

export type GenerationRun = {
  id: string;
  worldId: string;
  articleId: string | null;
  targetTitle: string;
  targetSlug: string;
  model: string | null;
  promptVersionsJson: string | null;
  retrievedContextJson: string | null;
  outputJson: string | null;
  extractionJson: string | null;
  validationJson: string | null;
  status: GenerationRunStatus;
  createdAt: string;
  updatedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  errorJson: string | null;
};

export function createGenerationRun(input: {
  worldId: string;
  articleId?: string;
  targetTitle: string;
  targetSlug: string;
  model?: string;
  promptVersionsJson?: string;
}) {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO generation_runs
       (id, worldId, articleId, targetTitle, targetSlug, model, promptVersionsJson, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'started', ?, ?)`
    )
    .run(
      id,
      input.worldId,
      input.articleId ?? null,
      input.targetTitle,
      input.targetSlug,
      input.model ?? null,
      input.promptVersionsJson ?? null,
      nowIso(),
      nowIso()
    );

  return getDb()
    .prepare("SELECT * FROM generation_runs WHERE id = ?")
    .get(id) as GenerationRun;
}

export function updateGenerationRun(
  runId: string,
  updates: {
    status?: GenerationRunStatus;
    articleId?: string;
    retrievedContextJson?: string;
    outputJson?: string;
    extractionJson?: string;
    validationJson?: string;
    completedAt?: string;
    errorMessage?: string | null;
    errorJson?: string | null;
  }
) {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    sets.push("status = ?");
    values.push(updates.status);
  }
  if (updates.articleId !== undefined) {
    sets.push("articleId = ?");
    values.push(updates.articleId);
  }
  if (updates.retrievedContextJson !== undefined) {
    sets.push("retrievedContextJson = ?");
    values.push(updates.retrievedContextJson);
  }
  if (updates.outputJson !== undefined) {
    sets.push("outputJson = ?");
    values.push(updates.outputJson);
  }
  if (updates.extractionJson !== undefined) {
    sets.push("extractionJson = ?");
    values.push(updates.extractionJson);
  }
  if (updates.validationJson !== undefined) {
    sets.push("validationJson = ?");
    values.push(updates.validationJson);
  }
  if (updates.completedAt !== undefined) {
    sets.push("completedAt = ?");
    values.push(updates.completedAt);
  }
  if (updates.errorMessage !== undefined) {
    sets.push("errorMessage = ?");
    values.push(updates.errorMessage);
  }
  if (updates.errorJson !== undefined) {
    sets.push("errorJson = ?");
    values.push(updates.errorJson);
  }

  if (!sets.length) return;

  sets.push("updatedAt = ?");
  values.push(nowIso());
  values.push(runId);
  getDb()
    .prepare(`UPDATE generation_runs SET ${sets.join(", ")} WHERE id = ?`)
    .run(...values);
}

export function getGenerationRun(runId: string) {
  return getDb()
    .prepare("SELECT * FROM generation_runs WHERE id = ?")
    .get(runId) as GenerationRun | undefined;
}

export function listGenerationRuns(worldId: string, limit = 20) {
  return getDb()
    .prepare(
      "SELECT * FROM generation_runs WHERE worldId = ? ORDER BY createdAt DESC LIMIT ?"
    )
    .all(worldId, limit) as GenerationRun[];
}
