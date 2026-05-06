# ARCHITECTURE.md

Infinite Lore Wiki is a local-first fictional encyclopedia workbench. It generates wiki-style articles with an OpenAI-compatible chat completion API, stores pages in SQLite, extracts structured canon from generated text, and gives the user an editor surface for reviewing facts and constraints.

## Goals

- Preserve a clean reader experience for browsing fictional encyclopedia pages.
- Add an editor mode for canon management, manual editing, fact review, constraints, and generation traces.
- Productize the root page as a local workbench dashboard for continuing existing worlds.
- Support Chinese and English UI chrome, with a path toward per-locale article content.
- Treat LLM output as a draft, not as authoritative canon.
- Use local SQLite as the source of truth.
- Avoid vector databases, graph databases, auth, cloud sync, and multi-user complexity until the structured canon workflow is solid.

## Layers

```text
Presentation Layer
- Home workbench dashboard
- Wiki reader
- Editor mode
- Article renderer
- Selection interactions
- UI locale switcher

API Layer
- Next.js App Router route handlers
- Request validation
- Streaming responses
- Thin calls into domain/pipeline functions

Generation Pipeline
- Entity resolution
- Context retrieval
- Prompt construction
- Article generation
- Locale-aware output selection
- Canon extraction
- Validation
- Commit
- Summary update

Canon Layer
- Entities
- Aliases
- Facts
- Relations
- Constraints
- Page versions
- Generation traces

Persistence Layer
- SQLite
- Migrations
- Domain-specific db modules
- Dashboard aggregate queries
```

## Current Module Shape

```text
src/
├── app/
│   ├── api/
│   └── world/[worldId]/wiki/[slug]/
├── components/
│   ├── editor/
│   └── wiki reader components
└── lib/
    ├── db/
    ├── llm/
    ├── pipeline/
    ├── prompts/
    ├── validation/
    └── wiki/
```

The root files `src/lib/db.ts`, `src/lib/llm.ts`, and `src/lib/wiki.ts` are compatibility facades. New code should prefer importing from domain modules directly when that makes ownership clearer.

## Generation Lifecycle

Target lifecycle:

```text
resolve entity
→ retrieve context
→ build generation prompt
→ stream article markdown
→ save article
→ extract canon
→ validate extracted canon
→ write provisional entities/facts/relations
→ record generation run
→ update world summaries
```

Important rules:

- Streaming article text can reach the client before extraction is finished.
- Extracted facts default to `provisional`.
- Accepted/canonical facts and hard negative constraints must influence future prompts.
- Generation traces should record prompt versions, retrieved context, output, extraction, validation, and status.
- Route handlers should not accumulate pipeline business logic over time.

## Reader Mode

Reader Mode is the default wiki browsing surface.

Expected behavior:

- Render generated articles as encyclopedia pages.
- Keep UI quiet and focused on reading.
- Convert `[[WikiLink]]` syntax to article links.
- Selection opens a selected term as a wiki article.
- Missing articles enter generation flow.

## Home Workbench

The root page should become the product entry point for returning users.

Expected behavior:

- Show recent worlds and their continuation targets.
- Show aggregate counts for worlds, articles, entities, facts, relations, constraints, and generation runs.
- Surface provisional/disputed facts as review work.
- Show recent generation activity.
- Keep first-world creation and new-world creation available without dominating the page when worlds already exist.

The dashboard should render from server-side SQLite queries. Avoid adding client-only analytics state.

## Editor Mode

Editor Mode exposes canon-management tools for the current article/world.

Current and planned tools:

- Reader/Edit toggle.
- Markdown editor.
- Canon inspector.
- Fact review panel.
- Constraint panel.
- Generation trace panel.
- Page version history.
- Regeneration controls.

Editor Mode should remain a professional workbench, not a second reader page with decorative panels.

## Language Model

Language support has two separate concerns:

- UI locale controls application chrome.
- Content locale controls generated and edited article prose.

Initial UI locales:

```text
zh-CN
en
```

Recommended implementation:

- Start with small dictionary modules for UI labels.
- Store the current UI locale in local storage or a cookie so switching is in-page.
- Keep URLs stable until content-locale routing is needed.
- Add explicit locale parameters to prompt builders before adding article translations.
- Treat generated translations as draft article variants, not accepted canon.

Canon data should be as language-neutral as practical. Entities should own stable IDs; aliases can carry localized names.

## API Shape

Current core routes:

```text
POST   /api/worlds
GET    /api/worlds/[worldId]/articles/[slug]
PATCH  /api/worlds/[worldId]/articles/[slug]
POST   /api/worlds/[worldId]/articles/generate
GET    /api/worlds/[worldId]/articles/[slug]/canon
POST   /api/worlds/[worldId]/facts/[factId]/accept
POST   /api/worlds/[worldId]/facts/[factId]/reject
POST   /api/worlds/[worldId]/facts/[factId]/dispute
POST   /api/worlds/[worldId]/facts/[factId]/canonicalize
GET    /api/worlds/[worldId]/constraints
POST   /api/worlds/[worldId]/constraints
GET    /api/worlds/[worldId]/generation-runs/[runId]
```

Likely next routes or server functions:

```text
GET    /api/worlds
GET    /api/workspace/stats
```

These can also be implemented as direct server-side db calls from the homepage if they are not needed by the client.

API principles:

- Mutating routes validate inputs at runtime.
- Mutating routes scope all IDs by `worldId`.
- Errors return consistent JSON.
- LLM output is parsed and validated before canon commit.

## Local-First Boundaries

- API keys stay server-side in `.env.local`.
- API keys are never stored in SQLite.
- Generation traces must not contain request headers or secrets.
- `data/infinite-lore.db` is the local state store.
- Export features should write portable markdown/JSON artifacts without external services.

## Known Near-Term Architecture Debt

- The root page is still creation-first rather than dashboard-first.
- There is no stable persisted continue target per world.
- UI strings are hard-coded Chinese in components.
- Content locale is not represented in the data model.
- `generation_runs` lacks `updatedAt`, `completedAt`, and explicit error metadata.
