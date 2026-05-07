import type { ChatMessage } from "../llm/provider";

export const validateCanonPrompt = {
  name: "validate_canon" as const,
  version: "0.1.0",

  build(input: {
    newFacts: string[];
    existingAcceptedFacts: string[];
    rejectedDirections: string[];
    hardConstraints: string[];
  }): ChatMessage[] {
    return [
      {
        role: "system",
        content:
          "你是一个严格的世界观一致性验证引擎。你的任务是检查新提取的事实是否与已有的 canon 冲突。"
      },
      {
        role: "user",
        content: `检查以下新提取的事实是否与已有的 canon 冲突。

已确认的事实（canonical/accepted）：
${input.existingAcceptedFacts.map((f) => `- ${f}`).join("\n") || "暂无"}

已被拒绝的方向：
${input.rejectedDirections.map((d) => `- ${d}`).join("\n") || "暂无"}

硬性约束：
${input.hardConstraints.map((c) => `- ${c}`).join("\n") || "暂无"}

新提取的事实：
${input.newFacts.map((f) => `- ${f}`).join("\n")}

严格输出 JSON：
{
  "safeToCommit": true,
  "conflicts": [
    {
      "severity": "low",
      "newClaim": "新主张内容",
      "existingClaim": "冲突的已有主张",
      "recommendation": "mark_disputed"
    }
  ]
}

- severity: low/medium/high
- recommendation: accept（无冲突或轻微）/ reject（严重冲突）/ mark_disputed（可共存为争议）/ requires_user_review（需要人工判断）
- 如果新事实与被拒绝的方向明显相似，标记为 high severity 并推荐 reject。
- 如果新事实直接推翻硬约束，标记为 high severity 并推荐 reject。`
      }
    ];
  }
};
