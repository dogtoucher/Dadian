"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CreateWorldForm() {
  const router = useRouter();
  const [seed, setSeed] = useState(
    "近未来的东亚沿海城市群中，人们通过公共记忆网络保存亲属、职业和地方史。一次长期断网后，不同社区开始争夺谁有权修订共同记忆。"
  );
  const [entryTitle, setEntryTitle] = useState("公共记忆网络");
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
        throw new Error("error" in data ? data.error : "创建世界失败。");
      }

      router.push(`/world/${data.worldId}/wiki/${data.entrySlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建世界失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="seed-form" onSubmit={onSubmit}>
      <label className="field">
        <span>世界设定</span>
        <textarea
          className="seed-input"
          value={seed}
          onChange={(event) => setSeed(event.target.value)}
          minLength={12}
          placeholder="写下这个世界的类型、时代、冲突、气质或核心规则..."
          required
        />
      </label>
      <label className="field">
        <span>起始词条</span>
        <input
          className="title-input"
          value={entryTitle}
          onChange={(event) => setEntryTitle(event.target.value)}
          minLength={2}
          maxLength={40}
          placeholder="例如：公共记忆网络、玄算机、火星租界、灰港案"
          required
        />
      </label>
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? "正在打开入口词条..." : "进入 Wiki"}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}
