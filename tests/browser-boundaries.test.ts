import test from "node:test";
import assert from "node:assert/strict";
import {
  createWikiCanonSavePackage,
  datasetFromWikiCanonSavePackage,
  wikiCanonSavePackageSchema
} from "../src/lib/save/package.ts";
import type {
  WikiCanonDataset,
  WikiCanonStorageAdapter
} from "../src/lib/storage/types.ts";
import {
  clearBrowserProviderApiKey,
  loadBrowserProviderConfig,
  loadBrowserProviderSettings,
  saveBrowserProviderSettings
} from "../src/lib/llm/browserSettings.ts";
import { createBrowserProvider } from "../src/lib/llm/browserProvider.ts";
import {
  OpenAICompatibleProviderAdapter,
  redactSecretText
} from "../src/lib/llm/provider.ts";

const timestamp = "2026-01-01T00:00:00.000Z";

const dataset: WikiCanonDataset = {
  worlds: [
    {
      id: "world-1",
      seed: "一个足够长的世界种子。",
      title: "测试世界",
      canonSummary: "世界摘要",
      entrySlug: "入口词条",
      defaultLocale: "zh-CN",
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ],
  articles: [
    {
      id: "article-1",
      worldId: "world-1",
      slug: "入口词条",
      title: "入口词条",
      status: "ready",
      summary: "入口摘要",
      markdown: "正文指向 [[旁支词条]]。",
      linksJson: "[\"旁支词条\"]",
      version: 1,
      locale: "zh-CN",
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ],
  entities: [],
  aliases: [],
  facts: [],
  relations: [],
  constraints: [],
  summaries: [],
  generationRuns: [
    {
      id: "run-1",
      worldId: "world-1",
      articleId: "article-1",
      targetTitle: "入口词条",
      targetSlug: "入口词条",
      model: "test-model",
      promptVersionsJson: null,
      retrievedContextJson: null,
      outputJson: "{\"note\":\"Authorization: Bearer sk-testsecret123456\"}",
      extractionJson: null,
      validationJson: null,
      status: "completed",
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: timestamp,
      errorMessage: null,
      errorJson: null
    }
  ]
};

test("save package validates and excludes provider secrets", async () => {
  const savePackage = await createWikiCanonSavePackage(new MemoryStorage(dataset));

  wikiCanonSavePackageSchema.parse(savePackage);
  assert.equal(savePackage.kind, "wiki-canon-save-package");
  assert.equal(savePackage.metadata.secretPolicy, "secrets-excluded");
  assert.match(savePackage.data.generationRuns[0]?.outputJson ?? "", /\[redacted\]/);
  assert.deepEqual(datasetFromWikiCanonSavePackage(savePackage).worlds[0]?.id, "world-1");
});

test("OpenAI-compatible provider sends browser BYOK compatible requests", async () => {
  const originalFetch = globalThis.fetch;
  const capturedRequests: { url: string; headers: Headers; body: unknown }[] = [];

  globalThis.fetch = (async (input, init) => {
    capturedRequests.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body))
    });

    return new Response(
      JSON.stringify({
        model: "test-model",
        usage: { total_tokens: 12 },
        choices: [{ message: { content: "  完成  " } }]
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  }) as typeof fetch;

  try {
    const provider = new OpenAICompatibleProviderAdapter({
      providerType: "openai-compatible",
      baseUrl: "https://provider.example/v1/",
      apiKey: "sk-testsecret123456",
      model: "test-model"
    });

    const output = await provider.complete({
      messages: [{ role: "user", content: "测试" }],
      options: { temperature: 0.2 }
    });

    const request = capturedRequests[0];
    assert.ok(request);
    assert.equal(output.content, "完成");
    assert.equal(request.url, "https://provider.example/v1/chat/completions");
    assert.equal(request.headers.get("Authorization"), "Bearer sk-testsecret123456");
    assert.deepEqual(request.body, {
      model: "test-model",
      messages: [{ role: "user", content: "测试" }],
      temperature: 0.2,
      stream: false
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("browser provider settings keep API keys out of provider metadata", () => {
  const local = new MemoryWebStorage();
  const session = new MemoryWebStorage();

  const settings = saveBrowserProviderSettings(
    {
      providerType: "openai-compatible",
      baseUrl: "https://provider.example/v1",
      model: "test-model",
      apiKeyStorageMode: "session",
      apiKey: "sk-testsecret123456"
    },
    local,
    session
  );

  assert.equal(settings.hasApiKey, true);
  assert.equal(local.getItem("dadian.providerSettings")?.includes("sk-test"), false);
  assert.equal(session.getItem("dadian.providerApiKey.session"), "sk-testsecret123456");
  assert.deepEqual(loadBrowserProviderConfig(local, session), {
    providerType: "openai-compatible",
    baseUrl: "https://provider.example/v1",
    model: "test-model",
    apiKey: "sk-testsecret123456"
  });
  assert.equal(createBrowserProvider(local, session)?.providerType, "openai-compatible");

  clearBrowserProviderApiKey(local, session);
  assert.equal(loadBrowserProviderSettings(local, session).hasApiKey, false);
});

test("provider error redaction removes bearer and sk-style secrets", () => {
  assert.equal(
    redactSecretText("Authorization Bearer sk-testsecret123456 failed"),
    "Authorization Bearer [redacted] failed"
  );
});

class MemoryStorage implements WikiCanonStorageAdapter {
  constructor(private readonly data: WikiCanonDataset) {}

  async listWorlds() {
    return this.data.worlds;
  }

  async exportDataset() {
    return this.data;
  }
}

class MemoryWebStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
