import Link from "next/link";
import { wikiTitlePath } from "@/lib/routes";

type LinkStatus = "ready" | "generating" | "failed" | "missing";

export function RelatedArticles({
  worldId,
  links,
  statuses
}: {
  worldId: string;
  links: string[];
  statuses: Record<string, LinkStatus>;
}) {
  const uniqueLinks = Array.from(new Set(links));

  if (!uniqueLinks.length) {
    return null;
  }

  return (
    <nav className="related" aria-label="参见">
      <h2>参见</h2>
      <ul>
        {uniqueLinks.map((title) => (
          <li key={title}>
            <Link
              className={statuses[title] === "ready" ? "" : "missing-link"}
              href={wikiTitlePath(worldId, title)}
            >
              {title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
