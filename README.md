# Dadian

Browser-first worldbuilding wiki powered by your own LLM key.

Dadian turns a short world premise into a growing encyclopedia. Enter a world seed and an entry title, generate the first article, then follow `[[WikiLink]]` references to expand the setting page by page. Data stays in the browser unless you export it.

## Features

- Static browser app deployable to GitHub Pages
- BYOK model access through OpenAI-compatible `/chat/completions`
- Local persistence with IndexedDB
- Wiki-style article rendering with clickable `[[links]]`
- Missing article generation from the current world context
- JSON import and export for portable local saves
- API keys kept out of exports and local wiki data

## Browser App

Install dependencies:

```bash
npm install
```

Build the static app:

```bash
npm run build
```

The static site is written to:

```text
dist-browser/
```

Deploy `dist-browser/` to GitHub Pages, Cloudflare Pages, Netlify, Vercel Static, or any static file host.

For local preview:

```bash
npm run preview
```

## Using Dadian

1. Open the app.
2. Use **连接模型** to enter an OpenAI-compatible provider URL, model name, and API key.
3. Enter a world premise and an entry title.
4. Generate the entry article.
5. Click `[[linked terms]]` to create and expand more wiki pages.
6. Use **导入 / 导出** to back up or move your local world data.

API keys are stored only in browser storage:

- `sessionStorage` by default
- `localStorage` only if explicitly selected
- never included in JSON exports

## Provider Compatibility

Dadian uses the OpenAI-compatible chat completions shape:

```text
POST {baseUrl}/chat/completions
```

The browser app can call providers that allow browser CORS requests. Providers that block browser-origin requests require an optional proxy.

## Development

Run the local development server:

```bash
npm run dev
```

Run checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The production build is a static Vite app.

## Data Model

The browser app stores wiki data in IndexedDB:

- worlds
- articles
- entities
- aliases
- facts
- relations
- constraints
- summaries
- generation runs

Portable saves use a JSON package format designed to exclude provider secrets.

## License

No license has been declared yet.
