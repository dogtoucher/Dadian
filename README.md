# Dadian

Build a living encyclopedia for any fictional world, directly in your browser.

Dadian starts with a premise and an entry title, then grows a wiki one article at a time. Click linked names, places, institutions, events, technologies, documents, or unresolved cases to keep expanding the archive.

## What It Does

- Generates quiet encyclopedia-style entries from a short world premise
- Expands the archive through clickable `[[WikiLink]]` references
- Keeps your worlds in the current browser
- Extracts facts into a reviewable memory layer
- Lets you confirm, reject, dispute, or lock facts as canon
- Imports and exports portable JSON save files
- Connects to OpenAI-compatible model providers with your own API key

## Try It

1. Open Dadian.
2. Connect a model provider from **连接模型**.
3. Describe the world you want to explore.
4. Choose the first entry title.
5. Generate the entry article.
6. Open **设定记忆** on an article to review extracted facts.
7. Click wiki links to continue expanding the world.

## Model Providers

Dadian includes presets for:

- OpenAI
- DeepSeek
- OpenRouter
- Custom OpenAI-compatible endpoints

Your API key stays in your browser. It is not included in exported save files.

Some providers block direct browser requests. If a provider does not allow browser-origin traffic, use a compatible gateway or proxy that supports CORS.

## 中文说明

Dadian（大典）是在浏览器里运行的架空世界百科生成器。

你输入一个世界设定和入口词条，它会生成第一篇百科条目；条目中的 `[[专名]]` 可以继续打开并生成新的词条。Dadian 还会从正文里抽取事实，形成可审核的“设定记忆”。你可以确认、拒绝、标记争议，或把事实锁定为正典，让后续生成更一致。

### 适合用来

- 搭建小说、游戏、TRPG、影视项目的世界观档案
- 逐步扩展人物、地点、组织、事件、技术和文献
- 保存可迁移的本地世界资料
- 在没有后端账号和数据库的情况下维护设定

### 使用方式

1. 打开 Dadian。
2. 在 **连接模型** 中选择 OpenAI、DeepSeek、OpenRouter 或自定义服务。
3. 输入世界设定和入口词条。
4. 生成入口词条。
5. 在词条页打开 **设定记忆**，审核抽取出的事实。
6. 点击正文中的链接，继续扩展百科。
7. 需要备份或迁移时，通过 **导入 / 导出** 保存 JSON。

## More

Technical notes are kept out of this product README. See [TECHNICAL.md](TECHNICAL.md) for architecture, local development, storage, deployment, and provider details.

No license has been declared yet.
