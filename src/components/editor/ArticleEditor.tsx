"use client";

import { useState } from "react";

export function ArticleEditor({
  initialMarkdown,
  onSave,
  onCancel,
  errorMessage
}: {
  initialMarkdown: string;
  onSave: (markdown: string) => Promise<void>;
  onCancel: () => void;
  errorMessage?: string;
}) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [saving, setSaving] = useState(false);

  return (
    <div className="article-editor">
      <textarea
        className="editor-textarea"
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
      />
      <div className="editor-actions">
        <button
          className="primary-button"
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(markdown);
            } finally {
              setSaving(false);
            }
          }}
          type="button"
          disabled={saving}
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          className="secondary-button"
          onClick={onCancel}
          type="button"
        >
          取消
        </button>
      </div>
      {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
    </div>
  );
}
