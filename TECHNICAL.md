# Dadian Technical Notes

## Architecture

Dadian is a browser-only React app built with Vite and deployed as static files to GitHub Pages.

- UI: React
- Build: Vite
- Local persistence: IndexedDB through Dexie
- Model calls: OpenAI-compatible `/chat/completions`
- Deployment artifact: `dist-browser/`

There is no server database, authentication system, or backend API in the deployed version.

## Browser Data Model

The browser database stores:

- `worlds`
- `articles`
- `entities`
- `aliases`
- `facts`
- `relations`
- `constraints`
- `summaries`
- `generationRuns`

Articles are readable wiki pages. Facts, entities, relations, constraints, and generation runs form the local canon memory layer.

Newly extracted facts default to `provisional`. Accepted and canonical facts are used as stronger context for later generation. Rejected facts and hard negative constraints are used to avoid unwanted directions.

## Model Providers

The provider settings are browser-local. Current presets:

- OpenAI: `https://api.openai.com/v1`, default model `gpt-5.4-mini`
- DeepSeek: `https://api.deepseek.com`, default model `deepseek-v4-flash`
- OpenRouter: `https://openrouter.ai/api/v1`, default model `openai/gpt-5.4-mini`
- Custom: user-provided OpenAI-compatible base URL and model

API keys can be stored for the current session or in local browser storage. Save exports exclude API keys and redact known secret patterns.

## Local Development

```bash
npm install
npm run dev
```

Checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Production build output:

```text
dist-browser/
```

## GitHub Pages Deployment

The GitHub Actions workflow builds the static browser app and deploys `dist-browser/`.

Repository Pages source should be:

```text
GitHub Actions
```

The workflow currently runs on pushes to `main` and manual dispatches.

---

# 大典技术说明

## 架构

Dadian 是一个 browser-only 的 React 应用，用 Vite 构建，并以静态文件部署到 GitHub Pages。

- UI：React
- 构建：Vite
- 本地持久化：IndexedDB + Dexie
- 模型调用：OpenAI-compatible `/chat/completions`
- 部署产物：`dist-browser/`

部署版本没有服务端数据库、登录系统或后端 API。

## 浏览器数据模型

浏览器数据库保存：

- `worlds`
- `articles`
- `entities`
- `aliases`
- `facts`
- `relations`
- `constraints`
- `summaries`
- `generationRuns`

文章是可阅读的 wiki 页面。事实、实体、关系、约束和整理记录构成本地 canon memory。

新抽取的事实默认为 `provisional`。用户确认或锁定为正典的事实会作为后续生成的更强上下文。被拒绝的事实和硬性负向约束会用于避免不希望出现的方向。

## 模型服务

模型设置只保存在浏览器中。当前预设：

- OpenAI：`https://api.openai.com/v1`，默认模型 `gpt-5.4-mini`
- DeepSeek：`https://api.deepseek.com`，默认模型 `deepseek-v4-flash`
- OpenRouter：`https://openrouter.ai/api/v1`，默认模型 `openai/gpt-5.4-mini`
- 自定义：用户填写 OpenAI-compatible 服务地址和模型

API Key 可以保存在本次会话或本地浏览器存储中。导出的 JSON 不包含 API Key，并会清理常见 secret 字符串。

## 本地开发

```bash
npm install
npm run dev
```

检查命令：

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

生产构建输出：

```text
dist-browser/
```

## GitHub Pages 部署

GitHub Actions 会构建静态浏览器应用，并部署 `dist-browser/`。

仓库 Pages source 应设置为：

```text
GitHub Actions
```

当前 workflow 在推送到 `main` 或手动触发时运行。
