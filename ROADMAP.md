# ROADMAP.md

This roadmap captures the longer-term product and engineering direction. It is intentionally broader than [TODO.md](TODO.md), which tracks only immediate work. High-level product and system intent lives in [HIGH_LEVEL_DESIGN.md](HIGH_LEVEL_DESIGN.md).

## Product Direction

Infinite Lore Wiki should evolve from:

```text
single-entry generated wiki
```

to:

```text
productized local-first canon workbench with bilingual UI and inspectable LLM generation
```

Two modes should remain distinct:

- Reader Mode: clean wiki browsing.
- Editor Mode: canon management, fact review, constraints, traces, exports.

The homepage should act as the workbench entry point: recent worlds, continuation targets, canon review queues, generation activity, and compact world creation.

## Language Direction

The app should support Chinese and English at two different layers:

- UI locale: labels, buttons, empty states, editor panels, validation messages, and dashboard chrome.
- Content locale: generated and edited article prose, summaries, aliases, and search behavior.

Important rules:

- UI language switching should be in-page and should not mutate world content.
- Each world should have a default content locale.
- Canon entities, facts, relations, and constraints should remain stable across languages where possible.
- Aliases should become locale-aware so Chinese and English names can resolve to the same entity.
- Generated translations are drafts until reviewed; they should not silently create accepted canon.

## Non-Goals For The Current Phase

- No game mechanics.
- No multi-user or auth system.
- No cloud sync.
- No graph database.
- No vector database before structured canon retrieval works.
- No LangChain-style framework dependency unless the local pipeline becomes too complex to maintain.
- No automatic promotion of LLM output to canon.

## Phase 1: Stabilize Current Canon Workbench

Goals:

- Restore article GET behavior.
- Scope fact mutations by world.
- Harden migrations.
- Move route orchestration into pipeline functions.
- Add runtime validation for mutating routes.

Exit criteria:

- `npm run typecheck` passes.
- `npm run build` passes.
- Missing article generation transitions correctly to ready state.
- Existing local databases can migrate safely.

Status: mostly complete in the current codebase.

## Phase 2: Complete Editor Mode v0

Goals:

- Markdown editing.
- Page version history.
- Manual edit canon re-extraction.
- Fact accept/reject/dispute/canonicalize.
- Constraint creation from selected text.
- Generation trace visibility.

Exit criteria:

- A user can generate an article, inspect extracted facts, reject a direction, edit markdown, and see the history.
- Future generation respects accepted facts and hard negative constraints.

Status: mostly complete in the current codebase.

## Phase 3: Productize The Home Workbench

Goals:

- Replace the root page creation-only flow with a dashboard.
- List recent worlds with article/entity/fact/relation counts.
- Add a stable continue target for every world.
- Show pending canon review and generation activity.
- Keep world creation available as a compact action.

Exit criteria:

- Returning users can continue work from `/`.
- Dashboard data renders from server-side SQLite queries.
- Empty state still creates the first world cleanly.

## Phase 4: Bilingual UI And Content Locale

Goals:

- Add in-page UI locale switching for Chinese and English.
- Add locale-aware labels without introducing a heavy i18n framework prematurely.
- Add default content locale to worlds.
- Add article/alias locale support in the data model.
- Make prompts explicitly request the target output language.

Exit criteria:

- UI chrome can switch between Chinese and English without changing content.
- New article generation can target Chinese or English prose.
- Search and entity resolution can use aliases across both languages.

## Phase 5: Improve Retrieval And Validation

Goals:

- Make context retrieval deterministic and inspectable.
- Add conflict checks for duplicates and hard constraint violations.
- Improve entity resolution with aliases.
- Add tests for slug/link extraction, migrations, retrieval, and validation.

Exit criteria:

- Pipeline tests can run without network through a fake LLM.
- Generation context is reproducible from `generation_runs`.
- Rejected directions are reliably prevented or flagged.

## Phase 6: Synthesis Artifacts

Goals:

- Generate world overview.
- Generate canon brief.
- Allow editing of overview/canon brief.
- Use canon brief as high-priority prompt context.

Exit criteria:

- User can maintain a concise world bible.
- Article generation uses structured facts plus edited high-level summaries.

## Phase 7: Export

Goals:

- Export JSON canon.
- Export Markdown world bible.
- Export prompt pack.

Suggested markdown export:

```text
world-bible/
├── overview.md
├── canon-brief.md
├── entities.md
├── facts.md
├── constraints.md
├── open-questions.md
└── wiki/
    ├── article-one.md
    └── article-two.md
```

Exit criteria:

- Export requires no external service.
- Exported JSON contains worlds, entities, aliases, facts, relations, constraints, summaries, and articles.

## Phase 8: Search And Navigation

Goals:

- Search existing articles before navigating to missing pages.
- Search aliases.
- Add recent pages and missing links.
- Consider SQLite FTS only after article/canon data flows are stable.

Exit criteria:

- Users can navigate an expanding world without relying only on links inside generated prose.

## Phase 9: Documentation

Goals:

- Update `README.md`.
- Keep `ARCHITECTURE.md` current.
- Keep `DATA_MODEL.md` current.
- Add `PROMPTS.md` after prompt formats stabilize.
- Document local-first security boundaries.

Exit criteria:

- A reviewer can understand the project purpose, setup, architecture, data model, limitations, and roadmap without reading all source files.
