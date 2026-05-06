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
