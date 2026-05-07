import { z } from "zod";
import { nowIso } from "../wiki/slug.ts";
import type { WikiCanonDataset, WikiCanonStorageAdapter } from "../storage/types";

export const WIKI_CANON_SAVE_PACKAGE_VERSION = 1;

const nullableString = z.string().nullable();

export const wikiCanonSavePackageSchema = z.object({
  kind: z.literal("wiki-canon-save-package"),
  schemaVersion: z.literal(WIKI_CANON_SAVE_PACKAGE_VERSION),
  exportedAt: z.string(),
  metadata: z.object({
    appName: z.literal("dadian"),
    exportFormat: z.literal("json"),
    secretPolicy: z.literal("secrets-excluded")
  }),
  data: z.object({
    worlds: z.array(z.record(z.string(), z.unknown())),
    articles: z.array(z.record(z.string(), z.unknown())),
    entities: z.array(z.record(z.string(), z.unknown())),
    aliases: z.array(z.record(z.string(), z.unknown())),
    facts: z.array(z.record(z.string(), z.unknown())),
    relations: z.array(z.record(z.string(), z.unknown())),
    constraints: z.array(z.record(z.string(), z.unknown())),
    summaries: z.array(z.record(z.string(), z.unknown())),
    generationRuns: z.array(
      z.record(z.string(), z.unknown()).and(
        z.object({
          promptVersionsJson: nullableString.optional(),
          retrievedContextJson: nullableString.optional(),
          outputJson: nullableString.optional(),
          extractionJson: nullableString.optional(),
          validationJson: nullableString.optional(),
          errorJson: nullableString.optional()
        })
      )
    ),
    settings: z.object({
      providerConfigs: z.array(
        z.object({
          id: z.string(),
          providerType: z.string(),
          baseUrl: z.string().optional(),
          model: z.string().optional(),
          hasApiKey: z.boolean().optional()
        })
      )
    })
  })
});

export type WikiCanonSavePackage = z.infer<typeof wikiCanonSavePackageSchema>;

const SECRET_KEY_NAMES = new Set([
  "apiKey",
  "api_key",
  "authorization",
  "Authorization",
  "accessToken",
  "access_token",
  "secret",
  "providerSecret"
]);

const SECRET_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /sk-[A-Za-z0-9_-]{8,}/g,
  /OPENAI_API_KEY\s*=\s*[^\s"']+/gi
];

export async function createWikiCanonSavePackage(
  storage: WikiCanonStorageAdapter
): Promise<WikiCanonSavePackage> {
  const dataset = await storage.exportDataset();
  const savePackage = {
    kind: "wiki-canon-save-package",
    schemaVersion: WIKI_CANON_SAVE_PACKAGE_VERSION,
    exportedAt: nowIso(),
    metadata: {
      appName: "dadian",
      exportFormat: "json",
      secretPolicy: "secrets-excluded"
    },
    data: {
      ...sanitizeDataset(dataset),
      settings: {
        providerConfigs: []
      }
    }
  } satisfies WikiCanonSavePackage;

  return wikiCanonSavePackageSchema.parse(savePackage);
}

export function datasetFromWikiCanonSavePackage(
  savePackage: WikiCanonSavePackage
): WikiCanonDataset {
  const parsed = wikiCanonSavePackageSchema.parse(savePackage);
  return {
    worlds: parsed.data.worlds as WikiCanonDataset["worlds"],
    articles: parsed.data.articles as WikiCanonDataset["articles"],
    entities: parsed.data.entities as WikiCanonDataset["entities"],
    aliases: parsed.data.aliases as WikiCanonDataset["aliases"],
    facts: parsed.data.facts as WikiCanonDataset["facts"],
    relations: parsed.data.relations as WikiCanonDataset["relations"],
    constraints: parsed.data.constraints as WikiCanonDataset["constraints"],
    summaries: parsed.data.summaries as WikiCanonDataset["summaries"],
    generationRuns: parsed.data.generationRuns as WikiCanonDataset["generationRuns"]
  };
}

export function assertNoSecretsInSavePackage(savePackage: WikiCanonSavePackage) {
  const text = JSON.stringify(savePackage);
  if (/Bearer\s+[A-Za-z0-9._~+/=-]+/i.test(text) || /sk-[A-Za-z0-9_-]{8,}/.test(text)) {
    throw new Error("Save package contains provider secret material.");
  }
}

function sanitizeDataset(dataset: WikiCanonDataset) {
  return {
    worlds: redactSecrets(dataset.worlds),
    articles: redactSecrets(dataset.articles),
    entities: redactSecrets(dataset.entities),
    aliases: redactSecrets(dataset.aliases),
    facts: redactSecrets(dataset.facts),
    relations: redactSecrets(dataset.relations),
    constraints: redactSecrets(dataset.constraints),
    summaries: redactSecrets(dataset.summaries),
    generationRuns: redactSecrets(dataset.generationRuns)
  };
}

function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        SECRET_KEY_NAMES.has(key) ? "[redacted]" : redactSecrets(entry)
      ])
    ) as T;
  }

  if (typeof value === "string") {
    let text: string = value;
    for (const pattern of SECRET_VALUE_PATTERNS) {
      text = text.replace(pattern, "[redacted]");
    }
    return text as T;
  }

  return value;
}
