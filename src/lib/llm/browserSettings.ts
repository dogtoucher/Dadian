export type ApiKeyStorageMode = "session" | "local";

export type BrowserProviderSettings = {
  providerType: "openai-compatible";
  baseUrl: string;
  model: string;
  apiKeyStorageMode: ApiKeyStorageMode;
  hasApiKey: boolean;
};

const SETTINGS_KEY = "dadian.providerSettings";
const SESSION_API_KEY = "dadian.providerApiKey.session";
const LOCAL_API_KEY = "dadian.providerApiKey.local";

export const DEFAULT_BROWSER_PROVIDER_SETTINGS: BrowserProviderSettings = {
  providerType: "openai-compatible",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1-mini",
  apiKeyStorageMode: "session",
  hasApiKey: false
};

export function loadBrowserProviderSettings(
  storage: Pick<Storage, "getItem"> = localStorage,
  session: Pick<Storage, "getItem"> = sessionStorage
): BrowserProviderSettings {
  const parsed = parseSettings(storage.getItem(SETTINGS_KEY));
  const settings = {
    ...DEFAULT_BROWSER_PROVIDER_SETTINGS,
    ...parsed
  };
  return {
    ...settings,
    hasApiKey: Boolean(readStoredApiKey(settings.apiKeyStorageMode, storage, session))
  };
}

export function saveBrowserProviderSettings(
  input: Omit<BrowserProviderSettings, "hasApiKey"> & { apiKey?: string },
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage,
  session: Pick<Storage, "getItem" | "setItem" | "removeItem"> = sessionStorage
) {
  const settings = {
    providerType: input.providerType,
    baseUrl: input.baseUrl,
    model: input.model,
    apiKeyStorageMode: input.apiKeyStorageMode
  } satisfies Omit<BrowserProviderSettings, "hasApiKey">;

  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  if (input.apiKey !== undefined) {
    writeStoredApiKey(input.apiKey, input.apiKeyStorageMode, storage, session);
  }

  return loadBrowserProviderSettings(storage, session);
}

export function clearBrowserProviderApiKey(
  storage: Pick<Storage, "removeItem"> = localStorage,
  session: Pick<Storage, "removeItem"> = sessionStorage
) {
  storage.removeItem(LOCAL_API_KEY);
  session.removeItem(SESSION_API_KEY);
}

export function readBrowserProviderApiKey(
  mode: ApiKeyStorageMode,
  storage: Pick<Storage, "getItem"> = localStorage,
  session: Pick<Storage, "getItem"> = sessionStorage
) {
  return readStoredApiKey(mode, storage, session);
}

export function loadBrowserProviderConfig(
  storage: Pick<Storage, "getItem"> = localStorage,
  session: Pick<Storage, "getItem"> = sessionStorage
) {
  const settings = loadBrowserProviderSettings(storage, session);
  const apiKey = readStoredApiKey(settings.apiKeyStorageMode, storage, session);
  if (!apiKey) {
    return null;
  }

  return {
    providerType: settings.providerType,
    baseUrl: settings.baseUrl,
    model: settings.model,
    apiKey
  } as const;
}

function readStoredApiKey(
  mode: ApiKeyStorageMode,
  storage: Pick<Storage, "getItem">,
  session: Pick<Storage, "getItem">
) {
  return mode === "local" ? storage.getItem(LOCAL_API_KEY) : session.getItem(SESSION_API_KEY);
}

function writeStoredApiKey(
  apiKey: string,
  mode: ApiKeyStorageMode,
  storage: Pick<Storage, "removeItem" | "setItem">,
  session: Pick<Storage, "removeItem" | "setItem">
) {
  if (mode === "local") {
    storage.setItem(LOCAL_API_KEY, apiKey);
    session.removeItem(SESSION_API_KEY);
    return;
  }

  session.setItem(SESSION_API_KEY, apiKey);
  storage.removeItem(LOCAL_API_KEY);
}

function parseSettings(text: string | null) {
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Partial<BrowserProviderSettings>;
    if (parsed.providerType !== "openai-compatible") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
