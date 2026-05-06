import { createChatCompletion, createStreamingChatCompletion } from "./client";
import type { ChatMessage } from "./client";
import type { World } from "../wiki/titles";
import { buildInitialWorldPrompt } from "../prompts/createWorld";
import { generateArticlePrompt } from "../prompts/generateArticle";
import { buildCanonSummaryPrompt } from "../prompts/generateCanonBrief";
import { linkArticlePrompt } from "../prompts/linkArticle";
import { extractWikiLinks } from "../wiki/links";

type InitialWorld = {
  worldTitle: string;
  canonSummary: string;
  articleSummary: string;
  markdown: string;
};

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

  if (!extractWikiLinks(parsed.markdown).length) {
    parsed.markdown = await addWikiLinksToArticle({
      title: entryTitle,
      markdown: parsed.markdown
    });
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
  acceptedFacts?: string[];
  disputedClaims?: string[];
  rejectedDirections?: string[];
  hardFacts?: string[];
}) {
  return createStreamingChatCompletion(
    generateArticlePrompt.build(input) as ChatMessage[]
  );
}

export async function addWikiLinksToArticle(input: {
  title: string;
  markdown: string;
}) {
  const linked = await createChatCompletion(
    linkArticlePrompt.build(input) as ChatMessage[],
    { temperature: 0.2 }
  );

  return linked || input.markdown;
}
