export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderConfig = {
  providerType: "openai-compatible";
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ChatCompletionOptions = {
  temperature?: number;
  stream?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type ChatCompletionInput = {
  messages: ChatMessage[];
  options?: ChatCompletionOptions;
};

export type ChatCompletionOutput = {
  content: string;
  model: string;
  usage?: unknown;
  raw: unknown;
};

export interface ProviderAdapter {
  readonly providerType: ProviderConfig["providerType"];
  complete(input: ChatCompletionInput): Promise<ChatCompletionOutput>;
  stream(input: ChatCompletionInput): Promise<ReadableStream<Uint8Array>>;
}

export class OpenAICompatibleProviderAdapter implements ProviderAdapter {
  readonly providerType = "openai-compatible" as const;

  constructor(private readonly config: ProviderConfig) {}

  async complete(input: ChatCompletionInput): Promise<ChatCompletionOutput> {
    const json = (await this.request(input, false).then((response) =>
      response.json()
    )) as {
      model?: string;
      usage?: unknown;
      choices?: { message?: { content?: string } }[];
    };

    return {
      content: json.choices?.[0]?.message?.content?.trim() ?? "",
      model: json.model ?? this.config.model,
      usage: json.usage,
      raw: json
    };
  }

  async stream(input: ChatCompletionInput) {
    const response = await this.request(input, true);
    if (!response.body) {
      throw new Error("LLM streaming response did not include a body.");
    }

    return response.body;
  }

  private async request(input: ChatCompletionInput, stream: boolean) {
    const controller =
      input.options?.timeoutMs && !input.options.signal
        ? new AbortController()
        : undefined;
    const timeout = controller
      ? setTimeout(() => controller.abort(), input.options?.timeoutMs)
      : undefined;

    try {
      const response = await fetch(
        `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: input.messages,
            temperature: input.options?.temperature ?? 0.85,
            stream
          }),
          signal: input.options?.signal ?? controller?.signal
        }
      );

      if (!response.ok) {
        throw new Error(
          `LLM 请求失败：${response.status} ${redactSecretText(await response.text())}`
        );
      }

      return response;
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}

export function redactSecretText(text: string) {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]");
}

export function createOpenAICompatibleProvider(config: ProviderConfig) {
  return new OpenAICompatibleProviderAdapter(config);
}
