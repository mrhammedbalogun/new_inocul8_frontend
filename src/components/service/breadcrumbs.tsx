import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { name: string; path: string };

/** Visual breadcrumb trail. Pair with breadcrumbSchema() for JSON-LD. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-1.5">
              {last ? (
                <span className="font-medium text-ink-800" aria-current="page">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} className="transition-colors hover:text-brand-700">
                  {c.name}
                </Link>
              )}
              {!last && <ChevronRight className="size-3.5 text-ink-900/30" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
