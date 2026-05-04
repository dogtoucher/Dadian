import {
  buildArticlePrompt,
  buildCanonSummaryPrompt,
  buildInitialWorldPrompt
} from "./prompts";
import type { World } from "./wiki";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type InitialWorld = {
  worldTitle: string;
  canonSummary: string;
  articleSummary: string;
  markdown: string;
};

function config() {
  return {
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
  };
}

async function createChatCompletion(messages: ChatMessage[]) {
  const { baseUrl, apiKey, model } = config();
  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY，请先创建 .env.local。");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85
    })
  });

  if (!response.ok) {
    throw new Error(`LLM 请求失败：${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

async function createStreamingChatCompletion(messages: ChatMessage[]) {
  const { baseUrl, apiKey, model } = config();
  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY，请先创建 .env.local。");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    throw new Error(`LLM streaming 请求失败：${response.status} ${await response.text()}`);
  }

  return response.body;
}

function parseJsonPayload(text: string) {
  const trimmed = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(trimmed) as InitialWorld;
}

export async function generateInitialWorld(seed: string, entryTitle: string) {
  const content = await createChatCompletion(
    buildInitialWorldPrompt(seed, entryTitle) as ChatMessage[]
  );
  const parsed = parseJsonPayload(content);

  if (
    !parsed.worldTitle ||
    !parsed.canonSummary ||
    !parsed.articleSummary ||
    !parsed.markdown
  ) {
    throw new Error("LLM 初始世界输出缺少必要字段。");
  }

  return parsed;
}

export async function updateCanonSummary(input: {
  world: World;
  newTitle: string;
  newSummary: string;
}) {
  return createChatCompletion(buildCanonSummaryPrompt(input) as ChatMessage[]);
}

export async function streamArticleGeneration(input: {
  world: World;
  title: string;
  sourceArticle?: { title: string; summary: string };
  relatedArticles: { title: string; summary: string }[];
}) {
  return createStreamingChatCompletion(buildArticlePrompt(input) as ChatMessage[]);
}

export async function* decodeOpenAIStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") {
        return;
      }

      const json = JSON.parse(data) as {
        choices?: { delta?: { content?: string } }[];
      };
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }
}
