import {
  loadBrowserProviderConfig
} from "./browserSettings.ts";
import { createOpenAICompatibleProvider } from "./provider.ts";

export function createBrowserProvider(
  storage: Pick<Storage, "getItem"> = localStorage,
  session: Pick<Storage, "getItem"> = sessionStorage
) {
  const config = loadBrowserProviderConfig(storage, session);
  if (!config) {
    return null;
  }

  return createOpenAICompatibleProvider(config);
}
