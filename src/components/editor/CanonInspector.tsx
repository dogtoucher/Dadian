"use client";

import { useState } from "react";
import type { Entity } from "@/lib/db/entities";
import type { Fact } from "@/lib/db/facts";
import type { Constraint } from "@/lib/db/constraints";
import type { GenerationRun } from "@/lib/db/generationRuns";
import { FactReviewPanel } from "./FactReviewPanel";
import { ConstraintPanel } from "./ConstraintPanel";
import { GenerationTracePanel } from "./GenerationTracePanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import type { PageVersion } from "@/lib/db/pageVersions";

export function CanonInspector({
  worldId,
  entity,
  facts,
  constraints,
  runs,
  versions = []
}: {
  worldId: string;
  entity?: Entity | null;
  facts: Fact[];
  constraints: Constraint[];
  runs: GenerationRun[];
  versions?: PageVersion[];
}) {
  const [tab, setTab] = useState<
    "facts" | "constraints" | "trace" | "versions"
  >("facts");

  return (
    <div className="canon-inspector">
      <div className="inspector-tabs">
        <button
          className={`tab-button ${tab === "facts" ? "active" : ""}`}
          onClick={() => setTab("facts")}
          type="button"
        >
          设定 ({facts.length})
        </button>
        <button
          className={`tab-button ${tab === "constraints" ? "active" : ""}`}
          onClick={() => setTab("constraints")}
          type="button"
        >
          约束 ({constraints.length})
        </button>
        <button
          className={`tab-button ${tab === "trace" ? "active" : ""}`}
          onClick={() => setTab("trace")}
          type="button"
        >
          整理记录 ({runs.length})
        </button>
        <button
          className={`tab-button ${tab === "versions" ? "active" : ""}`}
          onClick={() => setTab("versions")}
          type="button"
        >
          版本 ({versions.length})
        </button>
      </div>
      {entity && (
        <div className="entity-header">
          <span className="badge">实体</span>
          <strong>{entity.canonicalName}</strong>
          {entity.type && <span className="badge badge-secondary">{entity.type}</span>}
          <span className={`badge badge-${entity.status}`}>{entity.status}</span>
        </div>
      )}
      <div className="inspector-content">
        {tab === "facts" && <FactReviewPanel worldId={worldId} facts={facts} />}
        {tab === "constraints" && (
          <ConstraintPanel
            worldId={worldId}
            constraints={constraints}
            scopeId={entity?.id}
          />
        )}
        {tab === "trace" && <GenerationTracePanel runs={runs} />}
        {tab === "versions" && <VersionHistoryPanel versions={versions} />}
      </div>
    </div>
  );
}
