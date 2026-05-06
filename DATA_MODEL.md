# DATA_MODEL.md

This document describes the canonical SQLite data model for Infinite Lore Wiki.

The design separates article markdown from structured canon. Articles are presentation artifacts; entities, facts, relations, and constraints are the state future generation should retrieve and respect.

## Migration System

Migrations live in:

```text
src/lib/db/migrations/
├── 0001_initial.sql
├── 0002_canon_tables.sql
└── 0003_summaries.sql
```

The `migrations` table records applied migration IDs:

```sql
CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  appliedAt TEXT NOT NULL
);
```

Migration requirements:

- Apply files in deterministic lexical order.
- Fail loudly on invalid migrations.
- Support clean local databases.
- Support reasonable upgrades of existing local databases without requiring deletion.

Near-term migration themes:

- Dashboard indexes for homepage aggregate queries.
- Language metadata for UI/content locale support.
- Stable continue targets for worlds.

## Core Tables

### `worlds`

Stores one generated world.

Important fields:

- `id`
- `seed`
- `title`
- `defaultLocale` future field
- `entryArticleId` / `entrySlug` future field
- `canonSummary`
- `createdAt`
- `updatedAt`

`canonSummary` remains useful as a compact prose summary, but it should not be the only consistency mechanism.

### `articles`

Stores wiki page markdown.

Important fields:

- `id`
- `worldId`
- `slug`
- `locale` future field
- `title`
- `status`: `ready`, `generating`, `failed`
- `summary`
- `markdown`
- `linksJson`
- `entityId`
- `version`
- `createdAt`
- `updatedAt`

Design intent:

- An article can be linked to an entity.
- Article markdown is editable and versioned.
- Article status controls reader/generation UI state.
- Future article variants should support Chinese and English content without duplicating canon entities.

### `entities`

Stores canonical world objects independent from article pages.

Status values:

```text
provisional
accepted
canonical
rejected
deprecated
```

Design intent:

- Entity resolution should prefer existing entities before creating new ones.
- Entity aliases help avoid duplicate people, places, organizations, events, or concepts.

### `entity_aliases`

Stores normalized aliases for entities.

Design intent:

- Prevent duplicate entities caused by spelling, title, or naming variants.
- Support future alias-aware search and retrieval.
- Future aliases should include locale metadata so Chinese and English names can resolve to the same entity.

### `facts`

Stores extractable world claims.

Status values:

```text
provisional
accepted
canonical
disputed
rejected
deprecated
```

Design intent:

- LLM-extracted facts start as `provisional`.
- User-approved facts become `accepted` or `canonical`.
- Future generation retrieves accepted/canonical facts as high-priority context.
- Disputed and rejected facts should remain visible for review and prompt constraints.

### `relations`

Stores entity-to-entity edges.

Design intent:

- Keep useful graph-like information without introducing a graph database.
- Relations are initially provisional unless user review promotes them later.

### `constraints`

Stores user-approved generation constraints and rejected directions.

Relevant values:

```text
scopeType: world | entity | article
constraintType: negative | style | hard_rule | soft_preference | generation_policy
strength: soft | hard
```

Design intent:

- Hard negative constraints are injected into future prompts.
- Selection-based "Reject direction" creates a world/entity/article scoped constraint.
- Constraints are separate from facts because they are instructions and boundaries, not claims about the world.

### `page_versions`

Stores article markdown history.

Design intent:

- Support rollback, diff views, regeneration comparison, and auditability.
- Manual edits should save prior or resulting content consistently with version numbers.

### `generation_runs`

Stores inspectable LLM generation records.

Important fields:

- `worldId`
- `articleId`
- `targetTitle`
- `targetSlug`
- `model`
- `promptVersionsJson`
- `retrievedContextJson`
- `outputJson`
- `extractionJson`
- `validationJson`
- `status`
- `createdAt`
- `updatedAt` future field
- `completedAt` future field
- `errorMessage` future field

Design intent:

- Make generation behavior explainable after the fact.
- Support editor trace panels.
- Make prompt and retrieval changes auditable.
- Support homepage activity and health summaries.

### `summaries`

Stores generated or edited world-level summaries.

Targets:

```text
world overview
canon brief
entity summary
other future artifacts
```

Design intent:

- `worlds.canonSummary` can remain a compact field.
- Richer overview/canon brief artifacts should live in `summaries`.
- Summary rows should eventually be unique by `(worldId, targetType, targetId)`.

## Language Support Model

Use locale metadata where it affects user-facing prose or name resolution. Do not duplicate canon facts only because the UI language changes.

Recommended fields for a future migration:

```sql
ALTER TABLE worlds ADD COLUMN defaultLocale TEXT NOT NULL DEFAULT 'zh-CN';
ALTER TABLE worlds ADD COLUMN entryArticleId TEXT;
ALTER TABLE articles ADD COLUMN locale TEXT NOT NULL DEFAULT 'zh-CN';
ALTER TABLE entity_aliases ADD COLUMN locale TEXT;
```

Recommended article uniqueness once content variants exist:

```text
UNIQUE(worldId, slug, locale)
```

Migration note: changing the current `UNIQUE(worldId, slug)` constraint in SQLite requires table rebuild. Do this only when actual translated article variants are being implemented.

Language ownership rules:

- UI locale should not mutate persisted canon.
- World `defaultLocale` controls default generation language.
- Article `locale` controls prose language for that article row.
- Entity IDs remain stable across languages.
- Localized aliases resolve language-specific names to the same entity.
- Generated translations remain draft article content until reviewed.

## Dashboard Query Model

The homepage should be backed by explicit aggregate queries over existing tables.

Recommended indexes for a future migration:

```sql
CREATE INDEX IF NOT EXISTS idx_articles_world_updated ON articles(worldId, updatedAt);
CREATE INDEX IF NOT EXISTS idx_facts_world_status ON facts(worldId, status);
CREATE INDEX IF NOT EXISTS idx_entities_world_status ON entities(worldId, status);
CREATE INDEX IF NOT EXISTS idx_entities_world_type ON entities(worldId, type);
CREATE INDEX IF NOT EXISTS idx_generation_runs_world_created ON generation_runs(worldId, createdAt);
CREATE INDEX IF NOT EXISTS idx_constraints_world ON constraints(worldId);
```

Recommended homepage projections:

- Workspace stats: total worlds, articles, entities, facts, relations, constraints, generation runs.
- World overview: title, seed excerpt, canon summary excerpt, article count, entity count, fact counts by status, relation count, last activity.
- Recent activity: recent article updates and generation runs.
- Review queue: provisional/disputed facts grouped by world.

## Future Tables

### `conflicts`

Potential future table for persisted validation conflicts:

```text
newFactId
existingFactId
severity
description
resolution
```

Do not add this table until editor workflows need durable conflict queues.

### `article_search`

Potential future FTS table:

```sql
CREATE VIRTUAL TABLE article_search USING fts5(
  articleId UNINDEXED,
  worldId UNINDEXED,
  title,
  summary,
  markdown
);
```

Do not add this before structured canon retrieval is stable.

## Data Ownership Rules

- `worldId` must scope every user-visible canon mutation.
- `factId`, `entityId`, and `constraintId` should never be trusted without checking ownership.
- LLM JSON must pass runtime validation before commit.
- LLM-extracted claims should never be automatically marked canonical.
- Rejected directions should remain queryable so future generation can avoid them.
