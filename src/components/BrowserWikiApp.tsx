import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BrowserSaveManager } from "@/components/BrowserSaveManager";
import { LocalWikiMarkdown } from "@/components/LocalWikiMarkdown";
import { ProviderSettings } from "@/components/ProviderSettings";
import { createBrowserProvider } from "@/lib/llm/browserProvider";
import { buildInitialWorldPrompt } from "@/lib/prompts/createWorld";
import {
  extractValidateAndCommitCanon,
  generateBrowserArticle,
  type BrowserPipelineStageUpdate
} from "@/lib/pipeline/browserPipeline";
import {
  DadianIndexedDb,
  DexieWikiCanonStorageAdapter
} from "@/lib/storage/dexie";
import {
  cleanMetaNarration,
  extractWikiLinks,
  nowIso,
  titleToSlug
} from "@/lib/wiki";
import type { Fact, GenerationRun } from "@/lib/storage/types";
import type { Article, World } from "@/lib/wiki/titles";

type LocalArticlePayload =
  | { status: "empty" }
  | { status: "ready"; world: World; article: Article }
  | { status: "missing"; world: World; title: string; slug: string };

type AppRoute =
  | { name: "home" }
  | { name: "article"; worldId: string; slug: string };

type CanonMemory = {
  facts: Fact[];
  runs: GenerationRun[];
};

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
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute());
  const [seed, setSeed] = useState("");
  const [entryTitle, setEntryTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<BrowserPipelineStageUpdate | null>(null);
  const [providerPanelSignal, setProviderPanelSignal] = useState(0);
  const [exampleMessage, setExampleMessage] = useState("");
  const [canonMemory, setCanonMemory] = useState<CanonMemory | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const entryTitleRef = useRef<HTMLInputElement | null>(null);

  async function refreshWorlds() {
    const nextWorlds = await storage.listWorlds();
    setWorlds(nextWorlds);
  }

  useEffect(() => {
    storage.listWorlds().then(setWorlds).catch(() => null);
  }, [storage]);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHashRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    async function loadRoute() {
      if (route.name === "home") {
        setPayload({ status: "empty" });
        setCanonMemory(null);
        return;
      }

      const world = await database.worlds.get(route.worldId);
      if (!world) {
        setPayload({ status: "empty" });
        return;
      }

      await loadArticle(world, route.slug);
    }

    void loadRoute();
  }, [database, route]);

  useEffect(() => {
    if (payload.status !== "ready") {
      setCanonMemory(null);
      return;
    }

    void refreshCanonMemory(payload.article);
  }, [payload]);

  function goHome() {
    window.location.hash = "#/";
  }

  function openWorld(world: World) {
    const slug = world.entrySlug ?? "";
    if (!slug) {
      goHome();
      return;
    }

    navigateToArticle(world.id, slug);
  }

  function openArticle(world: World, slugOrTitle: string) {
    navigateToArticle(world.id, titleToSlug(slugOrTitle));
  }

  function navigateToArticle(worldId: string, slug: string) {
    window.location.hash = `#/world/${encodeURIComponent(worldId)}/wiki/${encodeURIComponent(slug)}`;
  }

  async function loadArticle(world: World, slugOrTitle: string) {
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

  async function refreshCanonMemory(article: Article) {
    const [facts, runs] = await Promise.all([
      database.facts
        .where("sourceArticleId")
        .equals(article.id)
        .reverse()
        .sortBy("updatedAt"),
      database.generationRuns
        .where("articleId")
        .equals(article.id)
        .reverse()
        .sortBy("createdAt")
    ]);
    setCanonMemory({
      facts: facts.reverse(),
      runs: runs.reverse().slice(0, 4)
    });
  }

  async function updateFactStatus(fact: Fact, status: Fact["status"]) {
    await database.facts.update(fact.id, {
      status,
      updatedAt: nowIso()
    });
    if (payload.status === "ready") {
      await refreshCanonMemory(payload.article);
    }
  }

  async function createWorld(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStage(null);
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
        setProviderPanelSignal((value) => value + 1);
        throw new Error("请先连接模型并保存 API Key。");
      }

      setStage({ stage: "article_generation", label: "正在生成入口词条..." });
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
      await extractValidateAndCommitCanon({
        database,
        provider,
        world,
        article,
        onStage: setStage
      });

      setSeed("");
      setEntryTitle("");
      await refreshWorlds();
      navigateToArticle(world.id, article.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "查询失败。");
    } finally {
      setLoading(false);
      setStage(null);
    }
  }

  async function generateMissingArticle() {
    if (payload.status !== "missing") return;
    setError("");
    setStage(null);
    setLoading(true);

    try {
      const provider = createBrowserProvider();
      if (!provider) {
        setProviderPanelSignal((value) => value + 1);
        throw new Error("请先连接模型并保存 API Key。");
      }

      const article = await generateBrowserArticle({
        database,
        provider,
        world: payload.world,
        title: payload.title,
        slug: payload.slug,
        onStage: setStage
      });
      navigateToArticle(payload.world.id, article.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败。");
    } finally {
      setLoading(false);
      setStage(null);
    }
  }

  if (route.name === "article") {
    return (
      <main className="wiki-layout" id="main-content">
        <section className="wiki-main">
          <header className="wiki-topbar">
            <button className="wiki-wordmark local-nav-button" onClick={goHome} type="button">
              大典
            </button>
            {payload.status === "ready" || payload.status === "missing" ? (
              <span className="wiki-world-title">{payload.world.title}</span>
            ) : null}
          </header>

          {payload.status === "ready" ? (
            <article className="article">
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
                  onOpenTitle={(title) => openArticle(payload.world, title)}
                  worldTitle={payload.world.title}
                />
              </div>
              <CanonMemoryPanel
                memory={canonMemory}
                onUpdateFactStatus={updateFactStatus}
              />
            </article>
          ) : null}

          {payload.status === "missing" ? (
            <article className="article article-draft">
              <header className="article-header">
                <div className="article-namespace">{payload.world.title}</div>
                <h2>{payload.title}</h2>
                <p className="article-summary">这个词条尚未收录。</p>
              </header>
              <button
                className="primary-button"
                disabled={loading}
                onClick={generateMissingArticle}
                type="button"
              >
                {loading ? stage?.label ?? "正在整理..." : "整理这个词条"}
              </button>
              {stage ? <p className="settings-note">{stage.label}</p> : null}
              {error ? <p className="error-text">{error}</p> : null}
            </article>
          ) : null}

          {payload.status === "empty" ? (
            <article className="article article-draft">
              <header className="article-header">
                <div className="article-namespace">未找到</div>
                <h2>词条不可用</h2>
                <p className="article-summary">这个本地世界或词条不存在。</p>
              </header>
              <button className="secondary-button" onClick={goHome} type="button">
                返回首页
              </button>
            </article>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="home home-portal local-browser-shell" id="main-content">
      <header className="home-header home-portal-header">
        <div>
          <h1 className="brand">大典</h1>
          <p className="subtitle">
            输入一个世界设定，生成一座可以继续扩展的百科。
          </p>
        </div>
        <div className="home-utilitybar" aria-label="本地工具">
          <ProviderSettings openSignal={providerPanelSignal} />
          <BrowserSaveManager storage={storage} onImported={refreshWorlds} />
        </div>
      </header>

      <section className="home-panel" aria-labelledby="browser-start-world">
        <div className="section-heading home-form-heading">
          <h2 id="browser-start-world">查询一个世界</h2>
        </div>
        <form className="seed-form" onSubmit={createWorld} ref={formRef}>
          <label className="field">
            <span>世界设定</span>
            <textarea
              className="seed-input"
              minLength={12}
              onChange={(event) => {
                setSeed(event.target.value);
                setExampleMessage("");
              }}
              placeholder="写下这个世界的时代、背景、核心冲突、社会规则或故事气质。"
              required
              value={seed}
            />
          </label>
          <label className="field">
            <span>入口词条</span>
            <input
              className="title-input"
              ref={entryTitleRef}
              maxLength={40}
              minLength={2}
              onChange={(event) => {
                setEntryTitle(event.target.value);
                setExampleMessage("");
              }}
              placeholder="例如：永乐大典、高堡奇人、公共记忆网络"
              required
              value={entryTitle}
            />
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? stage?.label ?? "正在生成..." : "生成入口词条"}
          </button>
          {exampleMessage ? <p className="settings-note">{exampleMessage}</p> : null}
          {stage ? <p className="settings-note">{stage.label}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>

      <details className="archive-disclosure">
        <summary>示例世界</summary>
        <section className="archive-panel" aria-label="示例世界">
          <div className="preset-worlds">
            {DEFAULT_WORLDS.map((world) => (
              <button
                className="preset-world-button"
                key={world.title}
                onClick={() => {
                  setSeed(world.seed);
                  setEntryTitle(world.entryTitle);
                  setError("");
                  setExampleMessage(`已填入「${world.title}」示例，可继续修改后生成。`);
                  window.setTimeout(() => {
                    formRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center"
                    });
                    entryTitleRef.current?.focus();
                  }, 0);
                }}
                type="button"
              >
                <strong>{world.title}</strong>
                <span>填入「{world.entryTitle}」作为入口词条</span>
              </button>
            ))}
          </div>
        </section>
      </details>

      {worlds.length ? (
        <details className="archive-disclosure">
          <summary>追溯已有世界</summary>
          <section className="archive-panel local-world-switcher" aria-label="本地世界">
            {worlds.map((world) => (
              <button
                className="secondary-button"
                key={world.id}
                onClick={() => openWorld(world)}
                type="button"
              >
                {world.title}
              </button>
            ))}
          </section>
        </details>
      ) : null}
    </main>
  );
}

function parseHashRoute(): AppRoute {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "world" && parts[1] && parts[2] === "wiki" && parts[3]) {
    return {
      name: "article",
      worldId: decodeURIComponent(parts[1]),
      slug: decodeURIComponent(parts[3])
    };
  }

  return { name: "home" };
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

function CanonMemoryPanel({
  memory,
  onUpdateFactStatus
}: {
  memory: CanonMemory | null;
  onUpdateFactStatus: (fact: Fact, status: Fact["status"]) => Promise<void>;
}) {
  if (!memory) {
    return null;
  }

  const pendingCount = memory.facts.filter(
    (fact) => fact.status === "provisional" || fact.status === "disputed"
  ).length;

  return (
    <details className="canon-memory-panel">
      <summary>
        <span>设定记忆</span>
        <span className="settings-summary-status">
          {memory.facts.length
            ? `${memory.facts.length} 条事实，${pendingCount} 条待确认`
            : "暂无事实"}
        </span>
      </summary>
      <div className="canon-memory-body">
        <section>
          <h3>待确认设定</h3>
          {!memory.facts.length ? (
            <p className="empty-hint">这个词条暂时没有抽取到可审核的设定。</p>
          ) : (
            <ul className="canon-memory-list">
              {memory.facts.map((fact) => (
                <li className={`fact-item fact-${fact.status}`} key={fact.id}>
                  <div className="fact-text">{fact.factText}</div>
                  <div className="fact-meta">
                    {statusBadge(fact.status)}
                    <span className="fact-certainty">
                      确定度: {Math.round(fact.certainty * 100)}%
                    </span>
                  </div>
                  <div className="fact-actions">
                    {fact.status !== "accepted" && fact.status !== "canonical" ? (
                      <button
                        className="mini-button accept"
                        onClick={() => onUpdateFactStatus(fact, "accepted")}
                        type="button"
                      >
                        确认
                      </button>
                    ) : null}
                    {fact.status !== "canonical" ? (
                      <button
                        className="mini-button canonicalize"
                        onClick={() => onUpdateFactStatus(fact, "canonical")}
                        type="button"
                      >
                        锁定正典
                      </button>
                    ) : null}
                    {fact.status !== "disputed" && fact.status !== "rejected" ? (
                      <button
                        className="mini-button dispute"
                        onClick={() => onUpdateFactStatus(fact, "disputed")}
                        type="button"
                      >
                        标记争议
                      </button>
                    ) : null}
                    {fact.status !== "rejected" ? (
                      <button
                        className="mini-button reject"
                        onClick={() => onUpdateFactStatus(fact, "rejected")}
                        type="button"
                      >
                        拒绝
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3>整理记录</h3>
          {!memory.runs.length ? (
            <p className="empty-hint">暂无整理记录。</p>
          ) : (
            <ul className="activity-list">
              {memory.runs.map((run) => (
                <li key={run.id}>
                  <div>
                    <strong>{run.targetTitle}</strong>
                    <span>
                      {run.model ?? "unknown model"} · {run.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </details>
  );
}

function statusBadge(status: Fact["status"]) {
  const labels: Record<Fact["status"], string> = {
    provisional: "待审核",
    accepted: "已确认",
    canonical: "正典",
    disputed: "争议中",
    rejected: "已拒绝",
    deprecated: "已废弃"
  };
  return <span className={`badge badge-${status}`}>{labels[status]}</span>;
}
