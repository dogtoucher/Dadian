CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  appliedAt TEXT NOT NULL
);

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
