"use client";

import type { PageVersion } from "@/lib/db/pageVersions";

export function VersionHistoryPanel({ versions }: { versions: PageVersion[] }) {
  return (
    <div className="version-panel">
      <h3>版本历史</h3>
      {!versions.length && <p className="empty-hint">暂无版本记录。</p>}
      {versions.map((version) => (
        <details key={version.id} className="version-item">
          <summary>
            <span className="badge badge-secondary">v{version.version}</span>
            {version.changeReason && (
              <span className="trace-title">{version.changeReason}</span>
            )}
            <span className="trace-time">
              {version.createdAt?.slice(0, 19).replace("T", " ")}
            </span>
          </summary>
          <pre>{version.contentMd}</pre>
        </details>
      ))}
    </div>
  );
}
