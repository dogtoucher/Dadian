import type { World } from "./wiki";

type ContextArticle = {
  title: string;
  summary: string;
};

export function buildInitialWorldPrompt(seed: string, entryTitle: string) {
  return [
    {
      role: "system",
      content:
        "你是一个严谨的中文世界观 Wiki 编纂引擎。你生成的是可持续扩展的 canon，不是短篇小说。必须尊重用户给出的题材：可以是写实、历史、科幻、悬疑、超现实、奇幻或混合类型，不要默认转向玄幻。"
    },
    {
      role: "user",
      content: `根据用户的世界种子，创建一个世界观 Wiki 的入口词条。

世界种子：
${seed}

用户指定的入口词条标题：
${entryTitle}

严格输出 JSON，不要输出 Markdown 代码块。JSON 字段：
{
  "worldTitle": "世界名，中文",
  "canonSummary": "不超过 260 字的世界总设定摘要",
  "articleSummary": "不超过 160 字的词条摘要",
  "markdown": "中文 Markdown 词条正文"
}

正文要求：
- 必须像 wiki，不像小说。
- 词条必须围绕用户指定的入口词条，不要擅自更换标题或题材。
- 绝对不要写“在某某世界中”“在本设定中”“在这条世界线中”“该宇宙里”等元叙述；正文必须假定自己描述的是唯一真实历史。
- 不要称呼用户、作者、世界种子、设定、canon 或世界观。
- 根据题材选择自然的栏目，但必须包含这些二级标题：摘要、背景、关键关系、争议与未解问题、相关条目。
- 必须插入 5 到 10 个 [[中文专名]]。
- 只给世界内重要实体、组织、地点、事件、制度、技术、作品、人物或案件加 [[链接]]，不要链接普通名词。
- 如果设定偏写实，保持克制和文献感；如果设定偏科幻，优先使用技术、机构、协议、事件；只有用户种子明显要求时才使用玄幻/魔法意象。
- 不要使用表格。`
    }
  ];
}

export function buildArticlePrompt(input: {
  world: World;
  title: string;
  sourceArticle?: ContextArticle;
  relatedArticles: ContextArticle[];
}) {
  const related = input.relatedArticles.length
    ? input.relatedArticles
        .map((article) => `- ${article.title}: ${article.summary}`)
        .join("\n")
    : "- 暂无相关旧词条。";

  return [
    {
      role: "system",
      content:
        "你是一个严谨的中文世界观 Wiki 编纂引擎。你必须维护 canon 一致性，不能推翻已知设定。必须延续用户给出的题材风格，不要默认转向玄幻。"
    },
    {
      role: "user",
      content: `为同一个架空或设定化世界生成一个新的 wiki 词条。

世界名：${input.world.title}
世界种子：
${input.world.seed}

已锁定世界摘要：
${input.world.canonSummary}

当前要生成的词条标题：${input.title}

来源词条：
${
  input.sourceArticle
    ? `${input.sourceArticle.title}: ${input.sourceArticle.summary}`
    : "用户直接访问或系统入口。"
}

最近已存在词条摘要：
${related}

输出要求：
- 只输出中文 Markdown 正文，不要解释。
- 必须像百科/wiki 条目，不要写成小说片段。
- 绝对不要写“在某某世界中”“在本设定中”“在这条世界线中”“该宇宙里”等元叙述；正文必须假定自己描述的是唯一真实历史。
- 不要称呼用户、作者、世界种子、设定、canon 或世界观。
- 根据题材选择自然措辞，但必须包含这些二级标题：摘要、背景、关键关系、争议与未解问题、相关条目。
- 必须插入 5 到 10 个 [[中文专名]]，其中一部分可以是新词条。
- 只链接世界内重要实体、组织、地点、事件、制度、技术、作品、文献、人物或案件，不链接普通名词。
- 如果设定偏写实，保持克制、档案化和可考据的语气；如果设定偏科幻，优先扩展技术、机构、协议、事件；只有 canon 已经明确存在玄幻元素时才使用法术、神祇、帝国秘史等意象。
- 不要推翻已知 canon；新内容只能扩展、解释、补充矛盾来源或制造局部悬念。
- 不要使用表格。`
    }
  ];
}

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
