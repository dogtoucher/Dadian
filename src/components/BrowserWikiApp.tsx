import { FormEvent, useEffect, useMemo, useState } from "react";
import { BrowserSaveManager } from "@/components/BrowserSaveManager";
import { LocalWikiMarkdown } from "@/components/LocalWikiMarkdown";
import { ProviderSettings } from "@/components/ProviderSettings";
import { createBrowserProvider } from "@/lib/llm/browserProvider";
import { buildInitialWorldPrompt } from "@/lib/prompts/createWorld";
import { generateArticlePrompt } from "@/lib/prompts/generateArticle";
import {
  DadianIndexedDb,
  DexieWikiCanonStorageAdapter
} from "@/lib/storage/dexie";
import {
  cleanMetaNarration,
  extractWikiLinks,
  nowIso,
  summarizeMarkdown,
  titleToSlug
} from "@/lib/wiki";
import type { Article, World } from "@/lib/wiki/titles";

type LocalArticlePayload =
  | { status: "empty" }
  | { status: "ready"; world: World; article: Article }
  | { status: "missing"; world: World; title: string; slug: string };

const DEFAULT_WORLDS = [
  {
    title: "永乐大典",
    entryTitle: "永乐大典",
    seed:
      "明代《永乐大典》并未彻底散佚。十六世纪起，西方传教士、商人和间谍陆续偷取、转译其中关于农政、天文、工艺、矿冶、航海、医学和制度治理的卷册。欧洲近代科技革命因此部分建立在被隐去来源的东方知识体系上。围绕残卷追索、译本伪造、学术归属和国家竞争，形成了一条横跨明清、欧洲启蒙时代和现代科技史的隐秘档案线。"
  },
  {
    title: "高堡奇人",
    entryTitle: "高堡奇人",
    seed:
      "轴心国赢得第二次世界大战后，北美大陆被分割为日本太平洋国、纳粹德国控制区和落基山脉自由区。1962年前后，一批地下读者开始流传禁书《草蜢身重》，书中记载了同盟国获胜的另一种历史。日本太平洋国、纳粹德国驻美机构和自由区抵抗网络围绕这本书展开审查、走私和政治清洗。"
  }
];

export function BrowserWikiApp() {
  const database = useMemo(() => new DadianIndexedDb("dadian-browser"), []);
  const storage = useMemo(
    () => new DexieWikiCanonStorageAdapter(database),
    [database]
  );
  const [worlds, setWorlds] = useState<World[]>([]);
  const [payload, setPayload] = useState<LocalArticlePayload>({ status: "empty" });
  const [seed, setSeed] = useState("");
  const [entryTitle, setEntryTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refreshWorlds() {
    const nextWorlds = await storage.listWorlds();
    setWorlds(nextWorlds);
  }

  useEffect(() => {
    storage.listWorlds().then(setWorlds).catch(() => null);
  }, [storage]);

  async function openWorld(world: World) {
    const slug = world.entrySlug ?? "";
    if (!slug) {
      setPayload({ status: "empty" });
      return;
    }

    await openArticle(world, slug);
  }

  async function openArticle(world: World, slugOrTitle: string) {
    const slug = titleToSlug(slugOrTitle);
    const article = await database.articles
      .where("[worldId+slug]")
      .equals([world.id, slug])
      .first();

    if (article?.status === "ready") {
      setPayload({ status: "ready", world, article });
      return;
    }

    setPayload({
      status: "missing",
      world,
      title: slugOrTitle,
      slug
    });
  }

  async function createWorld(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (seed.trim().length < 12) {
        throw new Error("请至少输入 12 个字符的世界种子。");
      }
      if (entryTitle.trim().length < 2) {
        throw new Error("请输入入口词条。");
      }

      const provider = createBrowserProvider();
      if (!provider) {
        throw new Error("请先在“连接模型”中保存 API Key。");
      }

      const content = await provider.complete({
        messages: buildInitialWorldPrompt(seed.trim(), entryTitle.trim()) as {
          role: "system" | "user" | "assistant";
          content: string;
        }[]
      });
      const parsed = parseInitialWorld(content.content);
      const timestamp = nowIso();
      const worldId = crypto.randomUUID();
      const articleId = crypto.randomUUID();
      const slug = titleToSlug(entryTitle.trim());
      const world: World = {
        id: worldId,
        seed: seed.trim(),
        title: parsed.worldTitle,
        canonSummary: parsed.canonSummary,
        entrySlug: slug,
        defaultLocale: "zh-CN",
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const article: Article = {
        id: articleId,
        worldId,
        slug,
        title: entryTitle.trim(),
        status: "ready",
        summary: parsed.articleSummary,
        markdown: parsed.markdown,
        linksJson: JSON.stringify(extractWikiLinks(parsed.markdown)),
        version: 1,
        locale: "zh-CN",
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await database.transaction("rw", database.worlds, database.articles, async () => {
        await database.worlds.put(world);
        await database.articles.put(article);
      });

      setSeed("");
      setEntryTitle("");
      setPayload({ status: "ready", world, article });
      await refreshWorlds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "查询失败。");
    } finally {
      setLoading(false);
    }
  }

  async function generateMissingArticle() {
    if (payload.status !== "missing") return;
    setError("");
    setLoading(true);

    try {
      const provider = createBrowserProvider();
      if (!provider) {
        throw new Error("请先在“连接模型”中保存 API Key。");
      }

      const relatedArticles = await database.articles
        .where("worldId")
        .equals(payload.world.id)
        .filter((article) => article.status === "ready")
        .reverse()
        .limit(8)
        .toArray();
      const output = await provider.complete({
        messages: generateArticlePrompt.build({
          world: payload.world,
          title: payload.title,
          relatedArticles: relatedArticles.map((article) => ({
            title: article.title,
            summary: article.summary
          }))
        })
      });
      const timestamp = nowIso();
      const markdown = cleanMetaNarration(output.content, payload.world.title);
      const article: Article = {
        id: crypto.randomUUID(),
        worldId: payload.world.id,
        slug: payload.slug,
        title: payload.title,
        status: "ready",
        summary: summarizeMarkdown(markdown),
        markdown,
        linksJson: JSON.stringify(extractWikiLinks(markdown)),
        version: 1,
        locale: payload.world.defaultLocale ?? "zh-CN",
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await database.articles.put(article);
      setPayload({ status: "ready", world: payload.world, article });
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败。");
    } finally {
      setLoading(false);
    }
  }

  const currentWorld = payload.status === "ready" || payload.status === "missing"
    ? payload.world
    : null;

  return (
    <main className="home local-browser-shell" id="main-content">
      <header className="home-header home-portal-header">
        <div>
          <h1 className="brand">大典</h1>
          <p className="subtitle">
            输入一个世界设定，生成一座可以继续扩展的百科。
          </p>
        </div>
        <div className="home-utilitybar" aria-label="本地工具">
          <ProviderSettings />
          <BrowserSaveManager storage={storage} onImported={refreshWorlds} />
        </div>
      </header>

      <section className="home-panel" aria-labelledby="browser-start-world">
        <div className="section-heading home-form-heading">
          <h2 id="browser-start-world">查询一个世界</h2>
        </div>
        <form className="seed-form" onSubmit={createWorld}>
          <div className="preset-worlds" aria-label="默认世界">
            {DEFAULT_WORLDS.map((world) => (
              <button
                className="preset-world-button"
                key={world.title}
                onClick={() => {
                  setSeed(world.seed);
                  setEntryTitle(world.entryTitle);
                  setError("");
                }}
                type="button"
              >
                <strong>{world.title}</strong>
                <span>{world.entryTitle}</span>
              </button>
            ))}
          </div>
          <label className="field">
            <span>世界设定</span>
            <textarea
              className="seed-input"
              minLength={12}
              onChange={(event) => setSeed(event.target.value)}
              placeholder="写下这个世界的时代、背景、核心冲突、社会规则或故事气质。"
              required
              value={seed}
            />
          </label>
          <label className="field">
            <span>入口词条</span>
            <input
              className="title-input"
              maxLength={40}
              minLength={2}
              onChange={(event) => setEntryTitle(event.target.value)}
              placeholder="例如：永乐大典、高堡奇人、公共记忆网络"
              required
              value={entryTitle}
            />
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "正在生成..." : "生成入口词条"}
          </button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>

      {worlds.length ? (
        <section className="home-panel local-world-switcher" aria-label="本地世界">
          {worlds.map((world) => (
            <button
              className="secondary-button"
              key={world.id}
              onClick={() => void openWorld(world)}
              type="button"
            >
              {world.title}
            </button>
          ))}
        </section>
      ) : null}

      {payload.status === "ready" ? (
        <article className="article local-article">
          <header className="article-header">
            <div className="article-namespace">词条</div>
            <h2>{payload.article.title}</h2>
            <p className="article-summary">
              {cleanMetaNarration(payload.article.summary, payload.world.title)}
            </p>
          </header>
          <div className="article-body">
            <LocalWikiMarkdown
              markdown={payload.article.markdown}
              onOpenTitle={(title) => void openArticle(payload.world, title)}
              worldTitle={payload.world.title}
            />
          </div>
        </article>
      ) : null}

      {payload.status === "missing" ? (
        <article className="article article-draft local-article">
          <header className="article-header">
            <div className="article-namespace">{currentWorld?.title}</div>
            <h2>{payload.title}</h2>
            <p className="article-summary">这个词条尚未收录。</p>
          </header>
          <button
            className="primary-button"
            disabled={loading}
            onClick={generateMissingArticle}
            type="button"
          >
            {loading ? "正在整理..." : "整理这个词条"}
          </button>
        </article>
      ) : null}
    </main>
  );
}

type InitialWorld = {
  worldTitle: string;
  canonSummary: string;
  articleSummary: string;
  markdown: string;
};

function parseInitialWorld(text: string) {
  const trimmed = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(trimmed) as InitialWorld;
  if (
    !parsed.worldTitle ||
    !parsed.canonSummary ||
    !parsed.articleSummary ||
    !parsed.markdown
  ) {
    throw new Error("模型输出缺少必要字段。");
  }
  return parsed;
}
