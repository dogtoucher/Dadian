import type { ChatMessage } from "../llm/provider";

export const extractCanonPrompt = {
  name: "extract_canon" as const,
  version: "0.1.0",

  build(input: {
    articleTitle: string;
    markdown: string;
  }): ChatMessage[] {
    return [
      {
        role: "system",
        content:
          "你是一个严谨的世界观数据提取引擎。你的任务是从 wiki 词条中提取结构化的实体、事实和关系。不要编造词条中没有的内容。"
      },
      {
        role: "user",
        content: `从以下 wiki 词条中提取结构化的世界观数据。

词条标题：${input.articleTitle}

词条正文：
${input.markdown}

严格输出 JSON（不要 Markdown 代码块）：
{
  "entities": [
    {"name": "实体名", "type": "person/place/organization/event/technology/document/other", "aliases": ["别名1"], "summary": "不超过 200 字的简短说明"}
  ],
  "facts": [
    {"subject": "主体", "predicate": "谓语关系", "object": "客体", "factText": "完整的自然语言事实陈述", "certainty": 0.8, "statusHint": "asserted"}
  ],
  "relations": [
    {"source": "源实体", "relationType": "关系类型", "target": "目标实体", "certainty": 0.8}
  ],
  "openQuestions": ["词条中提出的未解问题"]
}

规则：
- entities 最多 15 个，只提取重要实体。
- facts 最多 30 个。statusHint 使用 "asserted"（明确陈述）、"disputed"（词条内存在争议）、"legendary"（传说/传闻/不可考）、"attributed"（据称/有出处）。
- relations 最多 15 个。
- certainty 在 0 到 1 之间，0.5 以下表示不确定或推测。
- 不要重复提取相同的实体名。实体名必须与词条中出现的专名一致。
- 如果一个事实在词条中同时有支持方和反对方，标记为 disputed 并在 factText 中体现争议。`
      }
    ];
  }
};
