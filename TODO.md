# TODO.md

Purpose: track the active implementation work for turning Infinite Lore Wiki into a productized local-first canon workbench.

Long-form design lives in:

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DATA_MODEL.md](DATA_MODEL.md)
- [HIGH_LEVEL_DESIGN.md](HIGH_LEVEL_DESIGN.md)
- [ROADMAP.md](ROADMAP.md)

Keep this file short. A task belongs here only if it is actionable in the next one or two implementation passes.

## P1 Language Support

- [ ] Add UI locale switching for Chinese and English chrome.
  - Target: a small locale switcher and dictionary-based labels for navigation, buttons, empty states, and editor panels.
  - Acceptance: users can switch UI language in-page without changing route or regenerating content.

- [ ] Complete content locale variant support.
  - Target: build on `worlds.defaultLocale`, article locale, and locale-aware aliases with a variant strategy.
  - Acceptance: Chinese and English article variants can be represented without duplicating canon entities.

- [ ] Make prompts locale-aware.
  - Target: generation, extraction, validation, and summary prompts receive requested output locale and world default locale.
  - Acceptance: new article generation can intentionally produce Chinese or English prose.

## P2 Canon Workbench

- [ ] Add homepage-facing indexes in a migration.
  - Target: article recency, facts by status, entities by status/type, and generation runs by world recency.
  - Acceptance: dashboard aggregate queries are explicit and covered by migration tests.

- [ ] Start using `summaries` for editable world overview and canon brief.
  - Target: populate `summaryMd` / `summaryJson` for world-level artifacts.
  - Acceptance: homepage can show a world overview card without relying only on `worlds.canonSummary`.

- [ ] Add `PROMPTS.md` after locale-aware prompt versions stabilize.

## Recently Completed

- [x] Replace the root page with a workbench dashboard.
- [x] Add world overview queries: `listWorldOverviews`, `getWorkspaceStats`, and `getRecentActivity`.
- [x] Add stable `entrySlug` continue target for worlds.
- [x] Add homepage-facing indexes in a migration.
- [x] Make missing article creation an explicit user action.
- [x] Refresh article summary and related links after manual edits.
- [x] Rename user-facing generation trace language to整理/修订 wording.
- [x] Add basic local content-locale fields on worlds, articles, and aliases.
- [x] Restore `GET /api/worlds/[worldId]/articles/[slug]`.
- [x] Scope fact mutation routes by `worldId`.
- [x] Move article generation orchestration out of the route handler.
- [x] Add runtime validation for mutating API bodies.
- [x] Re-extract canon after manual article edits.
- [x] Show page version history in Editor Mode.
- [x] Add deterministic fake LLM support for pipeline tests.
- [x] Add migration tests against temporary SQLite databases.
- [x] Add slug/link/wiki markdown unit tests.

## Current Working Definition

The important product transition is:

```text
single-entry generated wiki
```

to:

```text
productized local-first canon workbench with bilingual UI and inspectable LLM generation
```

The immediate priority is the homepage/dashboard and language foundation. Most earlier correctness and architecture cleanup items are already complete.
