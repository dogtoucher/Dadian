import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArticleClient } from "@/components/ArticleClient";
import { WikiSearch } from "@/components/WikiSearch";
import { getArticle, getRelatedStatuses, getWorld } from "@/lib/db";
import { homePath } from "@/lib/routes";
import { slugToTitle } from "@/lib/wiki";
import type { ArticleStatus } from "@/lib/wiki";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ worldId: string; slug: string }>;
}): Promise<Metadata> {
  const { worldId, slug } = await params;
  const world = getWorld(worldId);
  const article = world ? getArticle(worldId, slug) : null;
  const title = article?.title ?? slugToTitle(slug);

  return {
    title: `${title} - ${world?.title ?? "Dadian"}`,
    description:
      article?.summary || world?.canonSummary || "设定世界中的百科词条。"
  };
}

export default async function WikiArticlePage({
  params
}: {
  params: Promise<{ worldId: string; slug: string }>;
  searchParams?: Promise<{ mode?: string }>;
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
    <main className="wiki-layout" id="main-content">
      <section className="wiki-main">
        <header className="wiki-topbar">
          <Link href={homePath()} className="wiki-wordmark">
            大典
          </Link>
          <span className="wiki-world-title">{world.title}</span>
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
