export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionOptions = {
  temperature?: number;
  stream?: boolean;
};

function config() {
  return {
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
  };
}

export function getModelName() {
  return config().model;
}

export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
) {
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
      temperature: options.temperature ?? 0.85,
      stream: options.stream ?? false
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

export async function createStreamingChatCompletion(messages: ChatMessage[]) {
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
