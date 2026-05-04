export type ArticleStatus = "ready" | "generating" | "failed";

export type Article = {
  id: string;
  worldId: string;
  slug: string;
  title: string;
  status: ArticleStatus;
  summary: string;
  markdown: string;
  linksJson: string;
  createdAt: string;
  updatedAt: string;
};

export type World = {
  id: string;
  seed: string;
  title: string;
  canonSummary: string;
  createdAt: string;
  updatedAt: string;
};

export function nowIso() {
  return new Date().toISOString();
}

export function titleToSlug(title: string) {
  return encodeURIComponent(title.trim()).replaceAll("%", "~");
}

export function slugToTitle(slug: string) {
  return decodeURIComponent(slug.replaceAll("~", "%"));
}

export function extractWikiLinks(markdown: string) {
  const links = new Set<string>();
  const regex = /\[\[([^\]\n]{1,80})\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const title = match[1].trim();
    if (title) {
      links.add(title);
    }
  }

  return Array.from(links);
}

export function summarizeMarkdown(markdown: string) {
  const firstParagraph = markdown
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^#+\s*/gm, "").trim())
    .find((part) => part.length > 24);

  if (!firstParagraph) {
    return markdown.replace(/\s+/g, " ").slice(0, 160);
  }

  return firstParagraph.replace(/\[\[([^\]]+)\]\]/g, "$1").slice(0, 180);
}

export function stripWikiSyntax(text: string) {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1");
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function cleanMetaNarration(text: string, worldTitle?: string) {
  let cleaned = text;

  if (worldTitle?.trim()) {
    const title = escapeRegExp(worldTitle.trim());
    cleaned = cleaned
      .replace(new RegExp(`在[“"]?${title}[”"]?世界(?:线)?中[，,]?`, "g"), "")
      .replace(new RegExp(`在[“"]?${title}[”"]?(?:这个)?设定(?:里|中)[，,]?`, "g"), "");
  }

  return cleaned
    .replace(/在(?:本|该|这个)世界(?:线)?中[，,]?/g, "")
    .replace(/在(?:本|该|这个)设定(?:里|中)[，,]?/g, "")
    .replace(/在(?:本|该|这个)宇宙(?:里|中)[，,]?/g, "");
}
