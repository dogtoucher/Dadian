# Dadian

Generate a living encyclopedia for a fictional world.

Dadian starts with a world premise and an entry title, then builds a wiki-style archive one article at a time. Follow `[[WikiLink]]` references to expand people, places, institutions, events, technologies, documents, and unresolved cases into a connected setting bible.

## Highlights

- Generate encyclopedia-style world entries from a short premise
- Expand the archive by clicking linked terms
- Keep each world in the current browser
- Import and export JSON save files
- Connect your own OpenAI-compatible model provider
- Deploy as a static site

## Use

1. Open Dadian.
2. Connect a model provider from **连接模型**.
3. Describe the world you want to explore.
4. Choose the first entry title.
5. Generate the entry article.
6. Click linked terms to expand the encyclopedia.
7. Export a JSON backup when you want to move or preserve a world.

## Model Providers

Dadian calls OpenAI-compatible chat completion endpoints:

```text
POST {baseUrl}/chat/completions
```

You provide:

- provider URL
- model name
- API key

The API key is stored in browser storage only. It is not included in JSON exports.

Some providers block browser-origin requests. Those providers require a compatible endpoint, gateway, or proxy that allows CORS.

## Local Data

Dadian stores worlds and articles in the browser with IndexedDB. No account or server database is required.

Use **导入 / 导出** to create portable JSON save files.

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

The static site is written to:

```text
dist-browser/
```

Check the project:

```bash
npm run typecheck
npm run lint
npm test
```

## Deployment

The included GitHub Actions workflow builds the static app and deploys `dist-browser/` to GitHub Pages.

In the repository settings, set Pages source to:

```text
GitHub Actions
```

Then push to `main`.

## License

No license has been declared yet.
