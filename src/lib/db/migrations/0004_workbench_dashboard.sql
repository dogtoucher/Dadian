ALTER TABLE worlds ADD COLUMN entrySlug TEXT;
ALTER TABLE worlds ADD COLUMN defaultLocale TEXT NOT NULL DEFAULT 'zh-CN';
ALTER TABLE articles ADD COLUMN locale TEXT NOT NULL DEFAULT 'zh-CN';
ALTER TABLE entity_aliases ADD COLUMN locale TEXT;

UPDATE worlds
SET entrySlug = (
  SELECT slug
  FROM articles
  WHERE articles.worldId = worlds.id AND articles.status = 'ready'
  ORDER BY articles.createdAt ASC
  LIMIT 1
)
WHERE entrySlug IS NULL;

ALTER TABLE generation_runs ADD COLUMN updatedAt TEXT;
ALTER TABLE generation_runs ADD COLUMN completedAt TEXT;
ALTER TABLE generation_runs ADD COLUMN errorMessage TEXT;
ALTER TABLE generation_runs ADD COLUMN errorJson TEXT;

UPDATE generation_runs
SET updatedAt = createdAt
WHERE updatedAt IS NULL;

CREATE INDEX IF NOT EXISTS idx_worlds_updated_at ON worlds(updatedAt);
CREATE INDEX IF NOT EXISTS idx_articles_world_updated ON articles(worldId, updatedAt);
CREATE INDEX IF NOT EXISTS idx_articles_world_locale ON articles(worldId, locale);
CREATE INDEX IF NOT EXISTS idx_aliases_world_locale ON entity_aliases(worldId, locale);
CREATE INDEX IF NOT EXISTS idx_facts_world_status_updated ON facts(worldId, status, updatedAt);
CREATE INDEX IF NOT EXISTS idx_generation_runs_world_created ON generation_runs(worldId, createdAt);
CREATE INDEX IF NOT EXISTS idx_entities_world_status ON entities(worldId, status);
