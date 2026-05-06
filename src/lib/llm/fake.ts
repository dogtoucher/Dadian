import type { ChatMessage } from "./client";

export type CompleteInput = {
  messages: ChatMessage[];
};

export type StreamInput = {
  messages: ChatMessage[];
};

export interface LlmClient {
  complete(input: CompleteInput): Promise<string>;
  stream(input: StreamInput): AsyncIterable<string>;
}

export class FakeLlmClient implements LlmClient {
  private completions: string[];
  private streamChunks: string[];

  constructor(input: { completions?: string[]; streamChunks?: string[] } = {}) {
    this.completions = [...(input.completions ?? [])];
    this.streamChunks = [...(input.streamChunks ?? [])];
  }

  async complete() {
    return this.completions.shift() ?? "";
  }

  async *stream() {
    for (const chunk of this.streamChunks) {
      yield chunk;
    }
  }
}
