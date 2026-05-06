import type { ChatMessage } from "../llm/client";

export const linkArticlePrompt = {
  name: "link_article" as const,
  version: "0.1.0",

  build(input: { title: string; markdown: string }) {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "你是中文 wiki 正文编辑。你的任务只是在已有 Markdown 正文中添加 [[内部链接]]，不能改写事实、语气、段落顺序或标题。"
      },
      {
        role: "user",
        content: `为下面这篇词条补充 wiki 内部链接。

词条标题：${input.title}

规则：
- 只输出修订后的 Markdown 正文，不要解释。
- 保持原文内容、段落、标题、句子和标点基本不变，只允许给已有词语加 [[...]]。
- 给首次出现且值得后续单独建档的专有名词加 [[链接]]：人物、公司、部门、芯片、产品线、组织、地点、事件、制度、技术、项目、文件或案件。
- 不要链接普通名词、宽泛类别、修饰语或当前词条标题本身。
- 不要新增“相关条目”“参见”“另见”章节。
- 如果正文确实没有任何值得单独建档的专名，原样输出。

正文：
${input.markdown}`
      }
    ];

    return messages;
  }
};
