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

export function enrichWikiLinks(
  markdown: string,
  candidateTitles: string[],
  currentTitle: string
) {
  const linkedTitles = new Set(extractWikiLinks(markdown));
  const current = currentTitle.trim();
  const candidates = Array.from(new Set(candidateTitles.map((title) => title.trim())))
    .filter(
      (title) =>
        title &&
        title !== current &&
        title.length >= 2 &&
        !linkedTitles.has(title)
    )
    .sort((a, b) => b.length - a.length);

  let nextMarkdown = markdown;
  for (const title of candidates) {
    nextMarkdown = linkTitleOnce(nextMarkdown, title);
  }

  return nextMarkdown;
}

export function stripWikiSyntax(text: string) {
  return text.replace(/\[\[([^\]]+)\]\]/g, "$1");
}

function linkTitleOnce(markdown: string, title: string) {
  const lines = markdown.split("\n");
  let linked = false;
  let inFence = false;

  const nextLines = lines.map((line) => {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      return line;
    }

    if (linked || inFence || line.trimStart().startsWith("#")) {
      return line;
    }

    const parts = line.split(/(\[\[[^\]\n]{1,80}\]\]|`[^`\n]+`)/g);
    const nextParts = parts.map((part) => {
      if (linked || part.startsWith("[[") || part.startsWith("`")) {
        return part;
      }

      const index = part.indexOf(title);
      if (index === -1) {
        return part;
      }

      linked = true;
      return `${part.slice(0, index)}[[${title}]]${part.slice(index + title.length)}`;
    });

    return nextParts.join("");
  });

  return nextLines.join("\n");
}
