import { CreateWorldForm } from "@/components/CreateWorldForm";
import Link from "next/link";
import { listWorldOverviews } from "@/lib/db";
import { wikiArticlePath } from "@/lib/routes";
import { cleanMetaNarration } from "@/lib/wiki";

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export default function Home() {
  const worlds = listWorldOverviews(12);

  return (
    <main className="home home-portal" id="main-content">
      <header className="home-header home-portal-header">
        <div>
          <h1 className="brand">织典</h1>
          <p className="subtitle">
            输入一个世界背景和想查询的入口词条，让人物、地点、组织和事件自然延展成一座可追溯的百科。
          </p>
        </div>
      </header>

      <section className="home-panel" aria-labelledby="start-world">
        <div className="section-heading home-form-heading">
          <h2 id="start-world">查询一个世界</h2>
        </div>
        <CreateWorldForm />
      </section>

      {worlds.length > 0 ? (
        <details className="archive-disclosure">
          <summary>追溯已有世界</summary>
          <section className="archive-panel" aria-label="已有世界">
            <div className="world-list">
              {worlds.map((world) => (
                <article className="world-row" key={world.id}>
                  <div>
                    <h3>{world.title}</h3>
                    <p>{cleanMetaNarration(world.canonSummary, world.title)}</p>
                    <div className="world-meta">
                      <span>{formatNumber(world.articleCount)} 篇词条</span>
                      <span>{formatNumber(world.entityCount)} 个实体</span>
                    </div>
                  </div>
                  {world.continueSlug ? (
                    <Link
                      className="secondary-button"
                      href={wikiArticlePath(world.id, world.continueSlug)}
                    >
                      进入
                    </Link>
                  ) : (
                    <span className="badge badge-secondary">尚无入口</span>
                  )}
                </article>
              ))}
            </div>
          </section>
        </details>
      ) : null}
    </main>
  );
}
