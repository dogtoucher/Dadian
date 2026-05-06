export function nowIso() {
  return new Date().toISOString();
}

export function titleToSlug(title: string) {
  return title.trim().replaceAll("/", "／");
}

export function slugToTitle(slug: string) {
  return decodeURIComponent(slug).replaceAll("／", "/");
}
