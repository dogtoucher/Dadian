# HIGH_LEVEL_DESIGN.md

This document describes the high-level product and system design for Infinite Lore Wiki. It is intentionally less detailed than [ARCHITECTURE.md](ARCHITECTURE.md) and [DATA_MODEL.md](DATA_MODEL.md); its job is to make product intent, boundaries, and major design choices easy to evaluate before implementation.

## 1. Product Summary

Infinite Lore Wiki is a local-first fictional world workbench.

The user starts with a world seed and an entry article. The system generates wiki-style articles, extracts structured canon from the prose, and lets the user review, edit, constrain, and continue the world over time.

The product is not just a text generator. It should behave like a lightweight local knowledge base for a fictional setting:

- Articles are readable wiki pages.
- Entities, facts, relations, and constraints are structured canon state.
- LLM output is draft material until the user accepts it.
- The user can inspect how a page was generated.
- The system can grow a coherent world without requiring a cloud backend.

## 2. Core User Experience

The product has three primary surfaces.

### Home Workbench

The home page is the project entry point.

It should show:

- Recent worlds.
- Continue buttons for existing worlds.
- Workspace-level counts.
- Pending canon review work.
- Recent generation activity.
- A compact new-world creation flow.

For a returning user, the primary action should be continuing work, not creating another world from scratch.

### Reader Mode

Reader Mode is the default article browsing experience.

It should feel like a quiet wiki:

- Article title, summary, and body.
- Clickable wiki links.
- Missing article generation.
- Related/missing page affordances.
- Minimal editor chrome.

Reader Mode optimizes for immersion and scanning.

### Editor Mode

Editor Mode is the canon workbench for the current world/article.

It should expose:

- Markdown editing.
- Fact review.
- Constraint management.
- Generation traces.
- Page version history.
- Regeneration or re-extraction controls.

Editor Mode optimizes for control, auditability, and repeat work.

## 3. High-Level System Shape

```text
Browser UI
  |
  | Next.js App Router
  v
Route Handlers / Server Components
  |
  | domain calls
  v
Generation Pipeline
  |
  | reads/writes
  v
SQLite Canon Store
```

Major modules:

- Presentation: home dashboard, wiki reader, editor panels.
- API: request validation, streaming, mutation boundaries.
- Pipeline: entity resolution, retrieval, generation, extraction, validation, commit.
- Persistence: SQLite migrations and typed db modules.
- Prompting: versioned prompt builders for generation, extraction, validation, and summaries.

The route layer should stay thin. Business logic belongs in domain or pipeline modules.

## 4. Source Of Truth

SQLite is the source of truth.

Primary persisted concepts:

- `worlds`: world identity and compact canon summary.
- `articles`: rendered wiki pages and article versions.
- `entities`: canonical objects independent from prose.
- `entity_aliases`: alternate names and future locale-specific names.
- `facts`: extracted claims with review status.
- `relations`: graph-like entity edges.
- `constraints`: user-approved generation boundaries.
- `generation_runs`: inspectable generation records.
- `summaries`: richer world and canon brief artifacts.

Article markdown is not the only state. Structured canon is the state future generation should retrieve and respect.

## 5. Canon Policy

LLM output is draft material.

Default policy:

- New facts start as `provisional`.
- User-approved facts become `accepted` or `canonical`.
- Rejected/disputed facts stay visible for review and future avoidance.
- Constraints are instructions and boundaries, not facts.
- Future generation should prefer accepted/canonical facts and hard constraints.

The system should never silently promote new generated claims to canonical truth.

## 6. Generation Lifecycle

Target flow:

```text
resolve entity
-> retrieve world context
-> build prompt
-> stream article
-> save article
-> extract canon
-> validate against accepted canon and constraints
-> commit provisional canon
-> update summaries
-> record generation trace
```

Important behavior:

- The article may stream to the user before extraction finishes.
- Generation traces must be inspectable after the fact.
- Prompt versions should be recorded.
- Failed generations should leave enough metadata to debug.

## 7. Language Design

Language support has two layers.

UI locale:

- Controls buttons, labels, panels, validation messages, and dashboard chrome.
- Initial locales: `zh-CN`, `en`.
- Should switch in-page without mutating world content.

Content locale:

- Controls generated and edited prose.
- Each world should have a default content locale.
- Article variants may eventually exist per locale.
- Entity IDs should remain stable across languages.
- Aliases should resolve Chinese and English names to the same entity.

Generated translations are draft article variants. They do not automatically create accepted canon.

## 8. Non-Goals

Current non-goals:

- No authentication.
- No multi-user collaboration.
- No cloud sync.
- No graph database.
- No vector database before structured retrieval is stable.
- No game mechanics.
- No automatic canon promotion.
- No heavy orchestration framework unless the local pipeline becomes difficult to maintain.

These constraints keep the project local, inspectable, and easy to reason about.

## 9. Key Design Decisions

### Local-first over cloud-first

The project should work with a local database and local environment variables. This keeps user data and API keys out of external product infrastructure.

### SQLite over graph/vector databases

Structured canon is small and relational enough for SQLite. A graph or vector database would add operational complexity before the product proves it needs one.

### Wiki pages plus structured canon

Articles are the human-readable surface. Structured canon is the machine-retrievable state. Keeping both avoids forcing prose to serve as the only consistency mechanism.

### Review before canon

Human review is the consistency boundary. The model proposes; the user accepts, rejects, disputes, or constrains.

### Product dashboard before feature expansion

The next product step should make existing state visible and actionable. A dashboard turns the app from a demo flow into a workbench.

## 10. Near-Term Implementation Plan

Recommended next sequence:

1. Add homepage aggregate queries.
2. Replace the root page with the Home Workbench.
3. Add a stable continue target for each world.
4. Add lightweight UI locale dictionaries and switcher.
5. Add locale fields and indexes in migrations.
6. Make prompt builders locale-aware.
7. Start filling `summaries` with editable world overview and canon brief artifacts.

This sequence improves product value before adding more generation features.

## 11. Open Questions

- Should content locale live on `articles`, or should translated content move into a separate `article_translations` table?
- Should `worlds` persist `entryArticleId`, `entrySlug`, or both?
- Should facts have localized display text, or only language-neutral structure plus generated display formatting?
- Should summaries be generated automatically after every article, or refreshed manually from the dashboard?
- Should UI locale be stored in a cookie, local storage, or route segment?

These questions should be resolved when the related implementation work starts, not all upfront.
