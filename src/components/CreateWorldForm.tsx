"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { wikiArticlePath } from "@/lib/routes";

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

export function CreateWorldForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [seed, setSeed] = useState("");
  const [entryTitle, setEntryTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/worlds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed, entryTitle })
      });
      const data = (await response.json()) as
        | { worldId: string; entrySlug: string }
        | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "查询失败。");
      }

      router.push(wikiArticlePath(data.worldId, data.entrySlug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "查询失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={`seed-form ${compact ? "seed-form-compact" : ""}`} onSubmit={onSubmit}>
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
        <span>查询范围</span>
        <textarea
          className="seed-input"
          value={seed}
          onChange={(event) => setSeed(event.target.value)}
          minLength={12}
          placeholder="写下这个世界的背景、时代、核心冲突、社会规则或故事气质。也可以选择上方默认世界。"
          required
        />
      </label>
      <label className="field">
        <span>入口词条</span>
        <input
          className="title-input"
          value={entryTitle}
          onChange={(event) => setEntryTitle(event.target.value)}
          minLength={2}
          maxLength={40}
          placeholder="例如：永乐大典、高堡奇人、公共记忆网络"
          required
        />
      </label>
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? "正在查询入口词条..." : compact ? "查询" : "查询词条"}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}
