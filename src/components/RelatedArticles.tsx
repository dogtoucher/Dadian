import Link from "next/link";
import { titleToSlug } from "@/lib/wiki";

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
  const uniqueLinks = Array.from(new Set(links)).slice(0, 18);

  if (!uniqueLinks.length) {
    return null;
  }

  return (
    <nav className="related" aria-label="相关条目">
      <h2>相关条目</h2>
      <ul>
        {uniqueLinks.map((title) => (
          <li key={title}>
            <Link href={`/world/${worldId}/wiki/${titleToSlug(title)}`}>
              {title}
            </Link>
            <span>{statuses[title] === "ready" ? "已收录" : "待打开"}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
