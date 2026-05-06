"use client";

import type { GenerationRun } from "@/lib/db/generationRuns";

export function GenerationTracePanel({ runs }: { runs: GenerationRun[] }) {
  if (!runs.length) {
    return (
      <div className="trace-panel">
        <h3>整理记录</h3>
        <p className="empty-hint">暂无整理记录。</p>
      </div>
    );
  }

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      started: "已启动",
      streaming: "整理中",
      completed: "已完成",
      failed: "需要重试"
    };
    return labels[status] ?? status;
  };

  return (
    <div className="trace-panel">
      <h3>整理记录</h3>
      {runs.map((run) => (
        <details key={run.id} className="trace-item">
          <summary>
            <span className={`badge badge-${run.status}`}>
              {statusLabel(run.status)}
            </span>
            <span className="trace-title">{run.targetTitle}</span>
            <span className="trace-time">
              {run.createdAt?.slice(0, 19).replace("T", " ")}
            </span>
          </summary>
          <div className="trace-detail">
            <p>
              {run.status === "failed"
                ? "这次整理没有完成。正文状态已保留，可以稍后重新整理。"
                : run.status === "completed"
                  ? "词条正文和待确认设定已整理。"
                  : "词条正在整理中。"}
            </p>
            {run.completedAt ? (
              <p className="trace-model">
                完成时间：{run.completedAt.slice(0, 19).replace("T", " ")}
              </p>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
