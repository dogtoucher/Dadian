import type { ChatMessage } from "../llm/client";
import type { World, ContextArticle } from "../wiki/titles";

const ANTI_META_RULES = `- 只输出指定语言的 Markdown 正文，不要解释。
- 必须像一份冷静的百科档案、调查记录、馆藏说明或地方志条目，不要写成小说片段。
- 绝对不要写"在某某世界中""在本设定中""在这条世界线中""该宇宙里"等元叙述；正文必须假定自己描述的是唯一真实历史。
- 不要称呼用户、作者、世界种子、设定、canon 或世界观。
- 不要写“据说这是一个……的世界”“这个故事”“本条目设定”等出戏措辞。
- 绝对不要输出创作笔记、自检意见、括号批注、替代写法、解释某段为什么虚构、或“此处应省略/照应/canon”这类工作痕迹。`;

const FORMAT_RULES = `- 不要套用固定栏目，不要固定使用“摘要/背景/关键关系/争议与未解问题”。
- 按词条对象自然分节：人物可用“生平”“失踪”“档案记载”“评价”；地点可用“地理”“沿革”“行政”“异常记录”；组织可用“沿革”“结构”“活动”“争议”；事件可用“经过”“调查”“影响”“后续处置”；技术或制度可用“原理”“实施”“监管”“事故记录”。
- 第一段直接给出定义、年代、地点、归属或档案编号等硬信息，像已经存在的百科条目。
- 不要输出“相关条目”“参见”“另见”章节；页面会根据正文里的 [[链接]] 自动生成参见列表。
- 首次写到会影响后续设定扩展、值得单独建档的专有名词时，使用 [[中文专名]] 链接。
- 优先链接实体、组织、公司、部门、地点、事件、制度、技术、产品线、项目、作品、文献、人物或案件；不链接普通名词、一次性描写、宽泛类别或当前词条本身。
- 不要为了凑数量堆链接；短词条可以只有少量链接，但包含多个重要专名时不能完全没有内部链接。
- 使用伪纪录片/档案片质感：克制、具体、带出处感，可出现年份、机构名、文件名、修订记录、调查编号、地方俗称，但不要真的列参考文献。
- 如果设定偏写实，保持克制、档案化和可考据的语气；如果设定偏科幻，优先扩展技术、机构、协议、事故、监管；只有 canon 已经明确存在玄幻元素时才使用法术、神祇、帝国秘史等意象。
- 不要推翻已知 canon；新内容只能扩展、解释、补充矛盾来源或制造局部悬念。
- 如果某个年代、纪念日、制度来源没有足够依据，直接省略，不要把推理过程写进正文。
- 不要使用表格。`;

export const generateArticlePrompt = {
  name: "generate_article" as const,
  version: "0.2.0",

  build(input: {
    world: World;
    title: string;
    sourceArticle?: ContextArticle;
    relatedArticles: ContextArticle[];
    acceptedFacts?: string[];
    disputedClaims?: string[];
    rejectedDirections?: string[];
    hardFacts?: string[];
  }) {
    const outputLanguage =
      input.world.defaultLocale === "en" ? "English" : "中文";
    const related = input.relatedArticles.length
      ? input.relatedArticles
          .map((article) => `- ${article.title}: ${article.summary}`)
          .join("\n")
      : "- 暂无相关旧词条。";

    let constraintsBlock = "";

    if (input.hardFacts?.length) {
      constraintsBlock += `\n不可违背的硬事实（必须严格遵守）：\n${input.hardFacts.map((f) => `- ${f}`).join("\n")}`;
    }

    if (input.acceptedFacts?.length) {
      constraintsBlock += `\n已确认的 canon 事实（请尊重并扩展，不要推翻）：\n${input.acceptedFacts.map((f) => `- ${f}`).join("\n")}`;
    }

    if (input.disputedClaims?.length) {
      constraintsBlock += `\n存在争议的说法（可以作为史学争议呈现，但不要当作确凿事实陈述）：\n${input.disputedClaims.map((f) => `- ${f}`).join("\n")}`;
    }

    if (input.rejectedDirections?.length) {
      constraintsBlock += `\n已被拒绝的方向（绝对不要写入，不要暗示）：\n${input.rejectedDirections.map((f) => `- ${f}`).join("\n")}`;
    }

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "你是一个中文伪纪录百科档案编纂员。你写出的内容应像馆藏条目、调查档案、地方志或百科修订稿，冷静、可信、克制。你必须维护 canon 一致性，不能推翻已知设定。必须延续用户给出的题材风格，不要默认转向玄幻。"
      },
      {
        role: "user",
        content: `为同一个架空或设定化世界整理一个新的 wiki 词条。

世界名：${input.world.title}
世界种子：
${input.world.seed}

已锁定世界摘要：
${input.world.canonSummary}

当前要生成的词条标题：${input.title}
输出语言：${outputLanguage}

来源词条：
${
  input.sourceArticle
    ? `${input.sourceArticle.title}: ${input.sourceArticle.summary}`
    : "用户直接访问或系统入口。"
}

最近已存在词条摘要：
${related}${constraintsBlock}

输出要求：
${ANTI_META_RULES}
${FORMAT_RULES}`
      }
    ];

    return messages;
  }
};
