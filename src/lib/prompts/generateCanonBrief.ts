import type { World } from "../wiki/titles";

export function buildCanonSummaryPrompt(input: {
  world: World;
  newTitle: string;
  newSummary: string;
}) {
  return [
    {
      role: "system",
      content: "你负责维护世界观 Wiki 的短 canon summary。"
    },
    {
      role: "user",
      content: `把新词条摘要合并进世界总摘要，保持中文，最多 320 字。

旧摘要：
${input.world.canonSummary}

新词条：${input.newTitle}
新摘要：${input.newSummary}

只输出更新后的摘要。`
    }
  ];
}
