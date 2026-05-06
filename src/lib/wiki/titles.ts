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
  entityId?: string | null;
  version?: number;
  locale?: string;
  createdAt: string;
  updatedAt: string;
};

export type World = {
  id: string;
  seed: string;
  title: string;
  canonSummary: string;
  entrySlug?: string | null;
  defaultLocale?: string;
  createdAt: string;
  updatedAt: string;
};

export type ContextArticle = {
  title: string;
  summary: string;
};
