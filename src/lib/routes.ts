import { titleToSlug } from "@/lib/wiki";

export function homePath() {
  return "/";
}

export function wikiArticlePath(worldId: string, slug: string) {
  return `/world/${worldId}/wiki/${slug}`;
}

export function wikiTitlePath(worldId: string, title: string) {
  return wikiArticlePath(worldId, titleToSlug(title));
}

export function articleApiPath(worldId: string, slug: string) {
  return `/api/worlds/${worldId}/articles/${slug}`;
}

export function articleCanonApiPath(worldId: string, slug: string) {
  return `${articleApiPath(worldId, slug)}/canon`;
}

export function articleGenerateApiPath(worldId: string) {
  return `/api/worlds/${worldId}/articles/generate`;
}

export function constraintsApiPath(worldId: string) {
  return `/api/worlds/${worldId}/constraints`;
}
