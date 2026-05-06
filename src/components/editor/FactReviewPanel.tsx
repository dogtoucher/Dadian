"use client";

import { useState, useCallback } from "react";
import type { Fact } from "@/lib/db/facts";

export function FactReviewPanel({
  worldId,
  facts
}: {
  worldId: string;
  facts: Fact[];
}) {
  const [localFacts, setLocalFacts] = useState(facts);
  const [error, setError] = useState("");

  const handleAction = useCallback(
    async (factId: string, action: "accept" | "reject" | "dispute" | "canonicalize") => {
      const actionMap: Record<string, string> = {
        accept: "accept",
        reject: "reject",
        dispute: "dispute",
        canonicalize: "canonicalize"
      };
      try {
        setError("");
        const response = await fetch(
          `/api/worlds/${worldId}/facts/${factId}/${actionMap[action]}`,
          { method: "POST" }
        );
        const data = (await response.json().catch(() => null)) as
          | { fact?: Fact; error?: string }
          | null;
        if (!response.ok || !data?.fact) {
          throw new Error(data?.error ?? "设定状态更新失败。");
        }
        setLocalFacts((prev) =>
          prev.map((f) =>
            f.id === factId ? data.fact! : f
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "设定状态更新失败。");
      }
    },
    [worldId]
  );

  const statusBadge = (status: string) => {
    const labels: Record<string, string> = {
      provisional: "待审核",
      accepted: "已确认",
      canonical: "正典",
      disputed: "争议中",
      rejected: "已拒绝",
      deprecated: "已废弃"
    };
    return (
      <span className={`badge badge-${status}`}>
        {labels[status] ?? status}
      </span>
    );
  };

  return (
    <div className="fact-review-panel">
      <h3>待确认设定</h3>
      {!localFacts.length && (
        <p className="empty-hint">暂无待确认设定。</p>
      )}
      {error ? <p className="error-text">{error}</p> : null}
      <ul>
        {localFacts.map((fact) => (
          <li key={fact.id} className={`fact-item fact-${fact.status}`}>
            <div className="fact-text">{fact.factText}</div>
            <div className="fact-meta">
              {statusBadge(fact.status)}
              <span className="fact-certainty">
                确定度: {Math.round(fact.certainty * 100)}%
              </span>
            </div>
            <div className="fact-actions">
              {fact.status !== "accepted" && fact.status !== "canonical" && (
                <button
                  className="mini-button accept"
                  onClick={() => handleAction(fact.id, "accept")}
                  type="button"
                >
                  确认
                </button>
              )}
              {fact.status !== "canonical" && (
                <button
                  className="mini-button canonicalize"
                  onClick={() => handleAction(fact.id, "canonicalize")}
                  type="button"
                >
                  锁定正典
                </button>
              )}
              {fact.status !== "disputed" && fact.status !== "rejected" && (
                <button
                  className="mini-button dispute"
                  onClick={() => handleAction(fact.id, "dispute")}
                  type="button"
                >
                  标记争议
                </button>
              )}
              {fact.status !== "rejected" && (
                <button
                  className="mini-button reject"
                  onClick={() => handleAction(fact.id, "reject")}
                  type="button"
                >
                  拒绝
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
