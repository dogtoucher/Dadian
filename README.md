# Dadian (大典)

Query a world. Watch its encyclopedia unfold.

本地运行的世界观 Wiki / canon workbench。用户输入世界背景并查询入口词条后，应用会整理主词条；词条中的 `[[专名]]` 会变成可点击 wiki 链接，未收录的词条会在打开后自动整理并写入本地 SQLite。

项目当前目标是从只读 wiki 逐步演进为本地优先的世界观工作台：文章仍然以百科页面呈现，整理出的实体、设定、关系、约束和修订记录会被结构化保存，方便人工审核和后续检索。

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

编辑 `.env.local`：

```bash
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_BASE_URL` 使用 OpenAI 风格的 `/chat/completions` 接口，因此也可以指向 OpenRouter、LM Studio 或其他同类服务。

打开 <http://localhost:3000>。

## Current behavior

- `/` 提供世界查询入口、默认世界选项和可折叠的已有世界追溯入口。
- `/world/[worldId]/wiki/[slug]` 浏览词条。
- 打开缺失 `[[WikiLink]]` 后自动进入 streaming 整理状态。
- 词条、链接、状态、结构化 canon 数据、约束、页面版本和整理记录存储在 `data/infinite-lore.db`。
- Reader Mode 保持接近 Wikipedia 的阅读体验。
- Editor Mode 支持文章编辑、设定审核、约束管理、整理记录查看和版本历史查看。
- 手动编辑会保存页面版本，并重新整理待确认设定；新设定默认不是正典，需要人工审核。

## Product direction

The home page should stay query-first rather than exposing implementation details:

- Keep the main action centered on querying an entry point.
- Offer curated default worlds for fast starts.
- Keep existing worlds behind an explicit追溯 entry instead of showing history by default.
- Move detailed canon review and generation traces into article editor mode.
- Avoid exposing SQLite, runs, or other debug language in primary user-facing copy.

The current data model already supports this direction through `worlds`, `articles`, `entities`, `facts`, `relations`, `constraints`, and `generation_runs`.

## Language support direction

The current app is Chinese-first, but the intended language model is bilingual Chinese/English with in-page switching.

Recommended behavior:

- UI chrome can switch between `zh-CN` and `en` without changing the current world.
- Each world should have a default content locale.
- Articles should eventually support per-locale content variants.
- Canon entities, facts, relations, and constraints should remain language-neutral where possible.
- Aliases should carry locale metadata so search can resolve both Chinese and English names.
- Missing translations should fall back to the world's default locale.

Do not translate accepted/canonical facts automatically into canon without review. Generated translations should be draft content until reviewed or explicitly accepted.

## Local-first boundaries

- API key 只从本地 `.env.local` 读取，不进入客户端 bundle。
- API key 不写入 SQLite，也不应进入整理记录。
- 本地 SQLite 是当前唯一持久化状态。
- 暂不包含登录、多用户、云同步、向量库、图数据库或游戏机制。

## Project docs

- [TODO.md](TODO.md): 当前一到两个迭代内的执行清单。
- [HIGH_LEVEL_DESIGN.md](HIGH_LEVEL_DESIGN.md): 产品意图、系统边界和关键设计决策。
- [ARCHITECTURE.md](ARCHITECTURE.md): 系统分层、生成生命周期和 API 原则。
- [DATA_MODEL.md](DATA_MODEL.md): SQLite 表职责、状态枚举和数据所有权规则。
- [ROADMAP.md](ROADMAP.md): 长期阶段路线。
