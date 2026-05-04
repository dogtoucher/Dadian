import { notFound } from "next/navigation";
import { ArticleClient } from "@/components/ArticleClient";
import { WikiSearch } from "@/components/WikiSearch";
import { WikiInline } from "@/components/WikiMarkdown";
import { getArticle, getRelatedStatuses, getWorld } from "@/lib/db";
import { slugToTitle } from "@/lib/wiki";
import type { ArticleStatus } from "@/lib/wiki";

export const dynamic = "force-dynamic";

export default async function WikiArticlePage({
  params
}: {
  params: Promise<{ worldId: string; slug: string }>;
}) {
  const { worldId, slug } = await params;
  const world = getWorld(worldId);

  if (!world) {
    notFound();
  }

  const article = getArticle(worldId, slug);
  const initialPayload = (() => {
    if (!article) {
      return {
        status: "missing" as const,
        title: slugToTitle(slug)
      };
    }

    const articlePayload = {
      title: article.title,
      summary: article.summary,
      markdown: article.markdown,
      links: JSON.parse(article.linksJson) as string[],
      linkStatuses: getRelatedStatuses(worldId, article.linksJson)
    };

    if (article.status === "ready") {
      return {
        status: "ready" as const,
        article: articlePayload
      };
    }

    return {
      status: article.status as Exclude<ArticleStatus, "ready">,
      article: articlePayload
    };
  })();

  return (
    <main className="wiki-layout">
      <aside className="wiki-sidebar">
        <h1>{world.title}</h1>
        <p>
          <WikiInline
            text={world.canonSummary}
            worldId={worldId}
            worldTitle={world.title}
          />
        </p>
        <a className="secondary-button" href="/">
          新世界
        </a>
      </aside>
      <section className="wiki-main">
        <header className="wiki-topbar">
          <a href="/" className="wiki-wordmark">
            Infinite Lore Wiki
          </a>
          <WikiSearch worldId={worldId} />
        </header>
        <ArticleClient
          initialPayload={initialPayload}
          slug={slug}
          worldId={worldId}
          worldTitle={world.title}
        />
      </section>
    </main>
  );
}
