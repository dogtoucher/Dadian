import { useEffect, useState } from "react";
import {
  DEFAULT_BROWSER_PROVIDER_SETTINGS,
  clearBrowserProviderApiKey,
  loadBrowserProviderSettings,
  saveBrowserProviderSettings,
  type ApiKeyStorageMode
} from "@/lib/llm/browserSettings";

export function ProviderSettings() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BROWSER_PROVIDER_SETTINGS.baseUrl);
  const [model, setModel] = useState(DEFAULT_BROWSER_PROVIDER_SETTINGS.model);
  const [apiKey, setApiKey] = useState("");
  const [storageMode, setStorageMode] = useState<ApiKeyStorageMode>("session");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const settings = loadBrowserProviderSettings();
    setBaseUrl(settings.baseUrl);
    setModel(settings.model);
    setStorageMode(settings.apiKeyStorageMode);
    setHasApiKey(settings.hasApiKey);
  }, []);

  return (
    <details className="settings-disclosure">
      <summary>
        <span>连接模型</span>
        <span className="settings-summary-status">
          {hasApiKey ? "已配置" : "未配置"}
        </span>
      </summary>
      <form
        className="settings-panel"
        onSubmit={(event) => {
          event.preventDefault();
          const settings = saveBrowserProviderSettings({
            providerType: "openai-compatible",
            baseUrl,
            model,
            apiKeyStorageMode: storageMode,
            apiKey: apiKey || undefined
          });
          setHasApiKey(settings.hasApiKey);
          setApiKey("");
          setSaved(true);
        }}
      >
        <label className="field">
          <span>服务地址</span>
          <input
            className="title-input"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.openai.com/v1"
            type="url"
          />
        </label>
        <label className="field">
          <span>模型</span>
          <input
            className="title-input"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="gpt-4.1-mini"
          />
        </label>
        <label className="field">
          <span>API Key</span>
          <input
            className="title-input"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={hasApiKey ? "已保存，留空则保持不变" : "仅保存在本浏览器"}
            type="password"
          />
        </label>
        <label className="field">
          <span>Key 保存方式</span>
          <select
            className="title-input"
            value={storageMode}
            onChange={(event) => setStorageMode(event.target.value as ApiKeyStorageMode)}
          >
            <option value="session">本次会话</option>
            <option value="local">长期保存在此浏览器</option>
          </select>
        </label>
        <div className="settings-actions">
          <button className="primary-button" type="submit">
            保存设置
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              clearBrowserProviderApiKey();
              setHasApiKey(false);
              setApiKey("");
              setSaved(false);
            }}
            type="button"
          >
            清除 Key
          </button>
        </div>
        {saved ? <p className="settings-note">设置已保存。本地导出不会包含 API Key。</p> : null}
      </form>
    </details>
  );
}
