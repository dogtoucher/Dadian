import { useState } from "react";
import {
  createWikiCanonSavePackage,
  datasetFromWikiCanonSavePackage,
  wikiCanonSavePackageSchema
} from "@/lib/save";
import type { DexieWikiCanonStorageAdapter } from "@/lib/storage/dexie";

export function BrowserSaveManager({
  storage,
  onImported
}: {
  storage: DexieWikiCanonStorageAdapter;
  onImported: () => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function exportJson() {
    setMessage("");
    setError("");
    try {
      const savePackage = await createWikiCanonSavePackage(storage);
      const blob = new Blob([JSON.stringify(savePackage, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `dadian-browser-save-${savePackage.exportedAt.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("已导出 JSON。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败。");
    }
  }

  return (
    <details className="settings-disclosure">
      <summary>
        <span>导入 / 导出</span>
      </summary>
      <div className="settings-panel">
        <p className="settings-note">浏览器本地存档，不包含 API Key。</p>
        <div className="settings-actions">
          <button className="secondary-button" onClick={exportJson} type="button">
            导出 JSON
          </button>
          <label className="secondary-button file-button">
            导入 JSON
            <input
              accept="application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                setMessage("");
                setError("");
                try {
                  const parsed = wikiCanonSavePackageSchema.parse(
                    JSON.parse(await file.text())
                  );
                  await storage.importDataset(datasetFromWikiCanonSavePackage(parsed));
                  onImported();
                  setMessage("导入完成。");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "导入失败。");
                } finally {
                  event.target.value = "";
                }
              }}
              type="file"
            />
          </label>
        </div>
        {message ? <p className="settings-note">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </details>
  );
}
