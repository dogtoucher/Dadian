# Infinite Lore Wiki

本地运行的生成式世界观 Wiki。用户输入一个中文世界种子并指定入口词条后，应用会生成主词条；词条中的 `[[中文专名]]` 会变成可点击 wiki 链接，未打开过的词条会自动 streaming 生成并写入本地 SQLite。

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

`OPENAI_BASE_URL` 使用 OpenAI-compatible `/chat/completions` 接口，因此也可以指向 OpenRouter、LM Studio 或其他兼容服务。

打开 <http://localhost:3000>。

## MVP behavior

- `/` 输入世界种子和入口词条并生成主词条。
- `/world/[worldId]/wiki/[slug]` 浏览词条。
- 点击缺失 `[[WikiLink]]` 后自动进入 streaming 生成状态。
- 词条、链接、状态和世界 canon summary 存储在 `data/infinite-lore.db`。
- 第一版只读探索，不包含编辑、登录、云同步、图谱或 Canon Lock。
