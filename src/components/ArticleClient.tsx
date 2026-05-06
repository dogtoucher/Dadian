"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WikiInline, WikiMarkdown } from "./WikiMarkdown";
import { RelatedArticles } from "./RelatedArticles";
import { SelectionCreateLink } from "./SelectionCreateLink";
import { EditorModeToggle } from "./editor/EditorModeToggle";
import { ArticleEditor } from "./editor/ArticleEditor";
import { CanonInspector } from "./editor/CanonInspector";
import {
  articleApiPath,
  articleCanonApiPath,
  articleGenerateApiPath
} from "@/lib/routes";
import type { Fact } from "@/lib/db/facts";
import type { Constraint } from "@/lib/db/constraints";
import type { GenerationRun } from "@/lib/db/generationRuns";
import type { PageVersion } from "@/lib/db/pageVersions";

type ArticlePayload =
  | {
      status: "ready";
      article: {
        title: string;
        summary: string;
        markdown: string;
        links: string[];
        linkStatuses: Record<string, "ready" | "generating" | "failed" | "missing">;
      };
    }
  | { status: "missing"; title: string }
  | {
      status: "generating" | "failed";
      article: {
        title: string;
        summary: string;
        markdown: string;
        links?: string[];
        linkStatuses?: Record<string, "ready" | "generating" | "failed" | "missing">;
      };
    };

const autoGenerationKeys = new Set<string>();

export function ArticleClient({
  worldId,
  slug,
  initialPayload,
  worldTitle
}: {
  worldId: string;
  slug: string;
  initialPayload: ArticlePayload;
  worldTitle: string;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<ArticlePayload>(initialPayload);
  const [streamText, setStreamText] = useState("");
  const [streamError, setStreamError] = useState("");
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [generationRequestId, setGenerationRequestId] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMarkdown, setEditingMarkdown] = useState(false);
  const [editError, setEditError] = useState("");
  const [editorCanonData, setEditorCanonData] = useState<{
    facts: Fact[];
    constraints: Constraint[];
    runs: GenerationRun[];
    versions: PageVersion[];
  } | null>(null);

  const title = useMemo(() => {
    if ("article" in payload) {
      return payload.article.title;
    }
    return payload.title;
  }, [payload]);

  useEffect(() => {
    if (payload.status !== "missing" || generationRequestId !== 0 || streamError) {
      return;
    }

    const key = `${worldId}/${slug}`;
    if (autoGenerationKeys.has(key)) {
      return;
    }

    autoGenerationKeys.add(key);
    setGenerationRequestId(1);
  }, [generationRequestId, payload.status, slug, streamError, worldId]);

  useEffect(() => {
    if (isEditMode && payload.status === "ready" && !editorCanonData) {
      fetch(articleCanonApiPath(worldId, slug))
        .then((r) => r.json())
        .then((data: {
          facts?: Fact[];
          constraints?: Constraint[];
          recentRuns?: GenerationRun[];
          versions?: PageVersion[];
        }) => {
          setEditorCanonData({
            facts: data.facts ?? [],
            constraints: data.constraints ?? [],
            runs: data.recentRuns ?? [],
            versions: data.versions ?? []
          });
        })
        .catch(() => null);
    }
  }, [isEditMode, payload.status, worldId, slug, editorCanonData]);

  useEffect(() => {
    if (payload.status === "generating") {
      setPollingTimedOut(false);
      const interval = window.setInterval(async () => {
        const response = await fetch(articleApiPath(worldId, slug));
        if (response.ok) {
          const nextPayload = (await response.json()) as ArticlePayload;
          setPayload(nextPayload);
          if (nextPayload.status !== "generating") {
            window.clearInterval(interval);
          }
        }
      }, 1600);
      const timeout = window.setTimeout(() => {
        setPollingTimedOut(true);
      }, 125000);

      return () => {
        window.clearInterval(interval);
        window.clearTimeout(timeout);
      };
    }

    if (
      generationRequestId === 0 ||
      (payload.status !== "missing" && payload.status !== "failed")
    ) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function refreshArticle() {
      router.refresh();
      const articleResponse = await fetch(articleApiPath(worldId, slug));
      if (!cancelled && articleResponse.ok) {
        setPayload((await articleResponse.json()) as ArticlePayload);
      }
    }

    async function generate() {
      setStreamError("");
      setStreamText("");

      try {
        const response = await fetch(articleGenerateApiPath(worldId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
          signal: controller.signal
        });

        if (!response.ok || !response.body) {
          const error = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(error?.error ?? "整理失败。");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            const line = event
              .split("\n")
              .find((part) => part.startsWith("data:"));
            if (!line) {
              continue;
            }

            const data = JSON.parse(line.slice(5)) as
              | { type: "delta"; text: string }
              | { type: "done" }
              | { type: "error"; error: string };

            if (data.type === "delta") {
              setStreamText((current) => current + data.text);
            } else if (data.type === "done") {
              await refreshArticle();
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          }
        }

        await refreshArticle();
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setStreamError(err instanceof Error ? err.message : "整理失败。");
      }
    }

    void generate();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [generationRequestId, payload.status, router, slug, title, worldId]);

  const handleSave = async (markdown: string) => {
    setEditError("");
    const response = await fetch(articleApiPath(worldId, slug), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown })
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setEditError(error?.error ?? "保存失败。");
      throw new Error(error?.error ?? "保存失败。");
    }
    setEditingMarkdown(false);
    setEditorCanonData(null);
    router.refresh();
    const articleResponse = await fetch(articleApiPath(worldId, slug));
    if (articleResponse.ok) {
      setPayload((await articleResponse.json()) as ArticlePayload);
    }
  };

  if (payload.status === "ready") {
    if (isEditMode && editingMarkdown) {
      return (
        <div className="editor-layout">
          <ArticleEditor
            initialMarkdown={payload.article.markdown}
            onSave={handleSave}
            onCancel={() => setEditingMarkdown(false)}
            errorMessage={editError}
          />
        </div>
      );
    }

    return (
      <div className={isEditMode ? "editor-layout" : ""}>
        <article className="article">
          <header className="article-header">
            <div className="article-namespace">词条</div>
            <h2>{payload.article.title}</h2>
            <div className="article-toolbar" aria-label="词条工具">
              <span className="article-tab active">阅读</span>
              <span className="article-tab">源文</span>
              <span className="article-tab">历史</span>
              <span className="article-status">已收录</span>
            </div>
            <p className="article-summary">
              <WikiInline
                text={payload.article.summary}
                worldId={worldId}
                worldTitle={worldTitle}
              />
            </p>
          </header>
          <div className="article-body">
            <WikiMarkdown
              markdown={payload.article.markdown}
              worldId={worldId}
              worldTitle={worldTitle}
            />
            <SelectionCreateLink worldId={worldId} isEditMode={isEditMode} />
          </div>
          <RelatedArticles
            links={payload.article.links}
            statuses={payload.article.linkStatuses}
            worldId={worldId}
          />
        </article>
        {isEditMode && editorCanonData && (
          <aside className="editor-sidebar">
            <EditorModeToggle
              isEditMode={isEditMode}
              onToggle={() => setIsEditMode(false)}
            />
            <button
              className="secondary-button"
              onClick={() => setEditingMarkdown(true)}
              type="button"
              style={{ marginBottom: 16 }}
            >
              编辑词条
            </button>
            <CanonInspector
              worldId={worldId}
              entity={null}
              facts={editorCanonData.facts}
              constraints={editorCanonData.constraints}
              runs={editorCanonData.runs}
              versions={editorCanonData.versions}
            />
          </aside>
        )}
        {!isEditMode && (
          <div className="edit-toggle-wrapper">
            <EditorModeToggle
              isEditMode={isEditMode}
              onToggle={() => setIsEditMode(true)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <article className="article article-draft">
      <header className="article-header">
        <div className="article-namespace">词条</div>
        <h2>{title}</h2>
        <div className="article-toolbar" aria-label="词条工具">
          <span className="article-tab active">阅读</span>
          <span className="article-tab muted">源文</span>
          <span className="article-tab muted">历史</span>
          <span className={`article-status ${payload.status}`}>
            {payload.status === "failed" ? "整理失败" : "整理中"}
          </span>
        </div>
        <p className="article-summary">
          {payload.status === "failed"
            ? "该词条暂时无法整理。"
            : pollingTimedOut
              ? "该词条长时间停留在整理状态，可能是上一次整理被中断。"
              : payload.status === "missing"
                ? "正在查询这个标题。"
                : "该词条正在整理，正文会在整理过程中逐段出现。"}
        </p>
      </header>
      <div className="article-body">
        {streamText ? (
          <WikiMarkdown
            markdown={streamText}
            worldId={worldId}
            worldTitle={worldTitle}
          />
        ) : payload.status === "failed" && generationRequestId === 0 ? (
          <div className="wiki-empty-state">
            <h2>词条整理失败</h2>
            <p>正文已保留为失败状态，可以重新整理这个词条。</p>
            <button
              className="primary-button"
              onClick={() => setGenerationRequestId((current) => current + 1)}
              type="button"
            >
              重新整理
            </button>
          </div>
        ) : (
          <div className="wiki-empty-state" aria-label="正在加载">
            <h2>正在整理词条</h2>
            <p>已收到查询标题，正文尚在整理。</p>
            <div className="reading-skeleton">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {streamError ? (
          <div className="wiki-error-box">
            <p className="error-text">整理失败：{streamError}</p>
            <button
              className="secondary-button"
              onClick={() => {
                setPayload({ status: "missing", title });
                setGenerationRequestId((current) => current + 1);
              }}
              type="button"
            >
              重新整理
            </button>
          </div>
        ) : null}
        {payload.status === "generating" && pollingTimedOut ? (
          <div className="wiki-error-box">
            <p className="error-text">
              如果页面没有继续更新，可以重新整理这个词条。
            </p>
            <button
              className="secondary-button"
              onClick={() => {
                setPayload({ status: "missing", title });
                setGenerationRequestId((current) => current + 1);
              }}
              type="button"
            >
              重新整理词条
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
