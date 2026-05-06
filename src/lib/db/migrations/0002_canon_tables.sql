CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  worldId TEXT NOT NULL,
  canonicalName TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'provisional',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(worldId, slug),
  FOREIGN KEY(worldId) REFERENCES worlds(id)
);

CREATE TABLE IF NOT EXISTS entity_aliases (
  id TEXT PRIMARY KEY,
  worldId TEXT NOT NULL,
  entityId TEXT NOT NULL,
  alias TEXT NOT NULL,
  normalizedAlias TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(worldId, normalizedAlias),
  FOREIGN KEY(entityId) REFERENCES entities(id)
);

CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  worldId TEXT NOT NULL,
  subjectEntityId TEXT,
  predicate TEXT,
  objectEntityId TEXT,
  objectText TEXT,
  factText TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisional',
  certainty REAL DEFAULT 0.7,
  sourceArticleId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY(worldId) REFERENCES worlds(id),
  FOREIGN KEY(subjectEntityId) REFERENCES entities(id),
  FOREIGN KEY(objectEntityId) REFERENCES entities(id),
  FOREIGN KEY(sourceArticleId) REFERENCES articles(id)
);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  worldId TEXT NOT NULL,
  sourceEntityId TEXT NOT NULL,
  relationType TEXT NOT NULL,
  targetEntityId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisional',
  certainty REAL DEFAULT 0.7,
  sourceArticleId TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(worldId) REFERENCES worlds(id),
  FOREIGN KEY(sourceEntityId) REFERENCES entities(id),
  FOREIGN KEY(targetEntityId) REFERENCES entities(id),
  FOREIGN KEY(sourceArticleId) REFERENCES articles(id)
);

CREATE TABLE IF NOT EXISTS constraints (
  id TEXT PRIMARY KEY,
  worldId TEXT NOT NULL,
  scopeType TEXT NOT NULL,
  scopeId TEXT,
  constraintType TEXT NOT NULL,
  text TEXT NOT NULL,
  strength TEXT NOT NULL DEFAULT 'soft',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY(worldId) REFERENCES worlds(id)
);

CREATE TABLE IF NOT EXISTS page_versions (
  id TEXT PRIMARY KEY,
  articleId TEXT NOT NULL,
  version INTEGER NOT NULL,
  contentMd TEXT NOT NULL,
  changeReason TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(articleId) REFERENCES articles(id)
);

CREATE TABLE IF NOT EXISTS generation_runs (
  id TEXT PRIMARY KEY,
  worldId TEXT NOT NULL,
  articleId TEXT,
  targetTitle TEXT NOT NULL,
  targetSlug TEXT NOT NULL,
  model TEXT,
  promptVersionsJson TEXT,
  retrievedContextJson TEXT,
  outputJson TEXT,
  extractionJson TEXT,
  validationJson TEXT,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(worldId) REFERENCES worlds(id),
  FOREIGN KEY(articleId) REFERENCES articles(id)
);

ALTER TABLE articles ADD COLUMN entityId TEXT;
ALTER TABLE articles ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
