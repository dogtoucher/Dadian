"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { wikiTitlePath } from "@/lib/routes";

export function WikiSearch({ worldId }: { worldId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = query.trim();
    if (!title) {
      return;
    }
    router.push(wikiTitlePath(worldId, title));
  }

  return (
    <form className="wiki-search" onSubmit={onSubmit}>
      <input
        aria-label="搜索或打开词条"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索或打开词条"
      />
      <button type="submit">打开</button>
    </form>
  );
}
