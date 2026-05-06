"use client";

import { useState, useCallback } from "react";
import type { Constraint } from "@/lib/db/constraints";

export function ConstraintPanel({
  worldId,
  constraints,
  scopeType,
  scopeId
}: {
  worldId: string;
  constraints: Constraint[];
  scopeType?: string;
  scopeId?: string;
}) {
  const [text, setText] = useState("");
  const [localConstraints, setLocalConstraints] = useState(constraints);

  const addRejected = useCallback(async () => {
    if (!text.trim()) return;
    try {
      const res = await fetch(`/api/worlds/${worldId}/constraints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopeType: scopeType ?? "world",
          scopeId,
          constraintType: "negative",
          text: text.trim(),
          strength: "hard"
        })
      });
      if (res.ok) {
        const data = (await res.json()) as { constraint: Constraint };
        setLocalConstraints((prev) => [data.constraint, ...prev]);
        setText("");
      }
    } catch {
      // silently ignore
    }
  }, [text, worldId, scopeType, scopeId]);

  return (
    <div className="constraint-panel">
      <h3>约束管理</h3>
      <div className="constraint-add">
        <input
          className="constraint-input"
          placeholder="添加被拒绝的方向..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="mini-button reject"
          onClick={addRejected}
          type="button"
          disabled={!text.trim()}
        >
          添加拒绝方向
        </button>
      </div>
      {!localConstraints.length && (
        <p className="empty-hint">暂无约束。</p>
      )}
      <ul>
        {localConstraints.map((c) => (
          <li key={c.id} className="constraint-item">
            <span className={`badge badge-${c.strength}`}>
              {c.strength === "hard" ? "硬约束" : "软约束"}
            </span>
            <span className="badge badge-secondary">{c.constraintType}</span>
            <span>{c.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
