CREATE TABLE IF NOT EXISTS summaries (
  id TEXT PRIMARY KEY,
  worldId TEXT NOT NULL,
  targetType TEXT NOT NULL,
  targetId TEXT,
  summaryMd TEXT,
  summaryJson TEXT,
  status TEXT NOT NULL DEFAULT 'generated',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY(worldId) REFERENCES worlds(id)
);
