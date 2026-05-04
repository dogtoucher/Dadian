"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WikiInline, WikiMarkdown } from "./WikiMarkdown";
import { RelatedArticles } from "./RelatedArticles";
import { SelectionCreateLink } from "./SelectionCreateLink";

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

  const title = useMemo(() => {
    if ("article" in payload) {
      return payload.article.title;
    }
    return payload.title;
  }, [payload]);

  useEffect(() => {
    if (payload.status === "generating") {
      const interval = window.setInterval(async () => {
        const response = await fetch(`/api/worlds/${worldId}/articles/${slug}`);
        if (response.ok) {
          const nextPayload = (await response.json()) as ArticlePayload;
          setPayload(nextPayload);
          if (nextPayload.status !== "generating") {
            window.clearInterval(interval);
          }
        }
      }, 1600);

      return () => window.clearInterval(interval);
    }

    if (payload.status !== "missing" && payload.status !== "failed") {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function generate() {
      setStreamError("");
      setStreamText("");

      try {
        const response = await fetch(`/api/worlds/${worldId}/articles/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
          signal: controller.signal
        });

        if (!response.ok || !response.body) {
          const error = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(error?.error ?? "生成失败。");
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
              router.refresh();
              const articleResponse = await fetch(
                `/api/worlds/${worldId}/articles/${slug}`
              );
              if (!cancelled && articleResponse.ok) {
                setPayload((await articleResponse.json()) as ArticlePayload);
              }
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setStreamError(err instanceof Error ? err.message : "生成失败。");
      }
    }

    void generate();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [payload.status, router, slug, title, worldId]);

  if (payload.status === "ready") {
    return (
      <article className="article">
        <header className="article-header">
          <h2>{payload.article.title}</h2>
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
          <SelectionCreateLink worldId={worldId} />
        </div>
        <RelatedArticles
          links={payload.article.links}
          statuses={payload.article.linkStatuses}
          worldId={worldId}
        />
      </article>
    );
  }

  return (
    <section className="status-panel">
      <h2>{title}</h2>
      <p>{payload.status === "failed" ? "这一页暂时无法打开。" : "正在打开档案。"}</p>
      {streamText ? (
        <div className="stream-box markdown">
          <WikiMarkdown
            markdown={streamText}
            worldId={worldId}
            worldTitle={worldTitle}
          />
        </div>
      ) : (
        <div className="reading-skeleton" aria-label="正在加载">
          <span />
          <span />
          <span />
        </div>
      )}
      {streamError ? (
        <>
          <p className="error-text">档案服务暂时不可用：{streamError}</p>
          <button
            className="secondary-button"
            onClick={() => setPayload({ status: "missing", title })}
            type="button"
          >
            重试生成
          </button>
        </>
      ) : null}
    </section>
  );
}
