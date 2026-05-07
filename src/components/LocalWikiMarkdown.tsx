import { cleanMetaNarration } from "@/lib/wiki";

function renderInline(
  text: string,
  onOpenTitle: (title: string) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\[\[([^\]\n]{1,80})\]\]|\*\*([^*\n]+)\*\*|`([^`\n]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      const title = match[2].trim();
      parts.push(
        <button
          className="wiki-link local-wiki-link"
          key={`${title}-${match.index}`}
          onClick={() => onOpenTitle(title)}
          type="button"
        >
          {title}
        </button>
      );
    } else if (match[3]) {
      parts.push(
        <strong key={`strong-${match.index}`}>
          {renderInline(match[3], onOpenTitle)}
        </strong>
      );
    } else if (match[4]) {
      parts.push(<code key={`code-${match.index}`}>{match[4]}</code>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function LocalWikiMarkdown({
  markdown,
  worldTitle,
  onOpenTitle
}: {
  markdown: string;
  worldTitle?: string;
  onOpenTitle: (title: string) => void;
}) {
  const blocks = removeGeneratedRelatedSection(markdown).split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (!listItems.length) return;

    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{renderInline(item, onOpenTitle)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  blocks.forEach((rawLine, index) => {
    const line = cleanMetaNarration(rawLine.trim(), worldTitle);
    if (!line) {
      flushList();
      return;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      return;
    }

    flushList();

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      nodes.push(<hr key={index} />);
    } else if (line.startsWith("### ")) {
      nodes.push(<h3 key={index}>{renderInline(line.slice(4), onOpenTitle)}</h3>);
    } else if (line.startsWith("## ")) {
      nodes.push(<h2 key={index}>{renderInline(line.slice(3), onOpenTitle)}</h2>);
    } else if (line.startsWith("# ")) {
      nodes.push(<h1 key={index}>{renderInline(line.slice(2), onOpenTitle)}</h1>);
    } else {
      nodes.push(<p key={index}>{renderInline(line, onOpenTitle)}</p>);
    }
  });

  flushList();

  return <div className="markdown">{nodes}</div>;
}

function removeGeneratedRelatedSection(markdown: string) {
  const relatedHeadings = new Set([
    "相关条目",
    "相关页面",
    "参见",
    "另见",
    "see also"
  ]);
  const lines = markdown.split("\n");
  const kept: string[] = [];
  let skippingLevel: number | null = null;

  for (const line of lines) {
    const heading = line.trim().match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim().replace(/[:：]$/, "").toLowerCase();

      if (skippingLevel !== null && level <= skippingLevel) {
        skippingLevel = null;
      }

      if (relatedHeadings.has(title)) {
        skippingLevel = level;
        continue;
      }
    }

    if (skippingLevel === null) {
      kept.push(line);
    }
  }

  return kept.join("\n").trim();
}
