"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, ArrowRight, Clock } from "lucide-react";
import index from "@/lib/data/blog-search-index.json";

type Entry = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingMinutes: number;
  categories: string[];
  tags: string[];
  keyword: string;
};

const entries = index as Entry[];

function haystack(e: Entry): string {
  return [e.title, e.excerpt, e.keyword, ...e.categories, ...e.tags].join(" ").toLowerCase();
}

export function BlogSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    return entries
      .map((e) => ({ e, hay: haystack(e) }))
      .filter(({ hay }) => terms.every((t) => hay.includes(t)))
      .map(({ e }) => e);
  }, [query]);

  const trimmed = query.trim();

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="Search articles — e.g. yellow fever card, HPV, hepatitis B"
          aria-label="Search blog articles"
          className="w-full rounded-full border border-ink-900/12 bg-white py-4 pl-12 pr-12 text-base text-ink-900 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink-900"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="mt-8">
        {trimmed === "" ? (
          <p className="text-muted">Type a keyword above to search all {entries.length} articles.</p>
        ) : results.length === 0 ? (
          <p className="text-muted">
            No articles match <span className="font-semibold text-ink-900">“{trimmed}”</span>. Try a
            broader term like “vaccine”, “travel” or “HPV”.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              {results.length} result{results.length === 1 ? "" : "s"} for{" "}
              <span className="font-semibold text-ink-900">“{trimmed}”</span>
            </p>
            <ul className="mt-5 grid gap-4">
              {results.map((e) => (
                <li key={e.slug}>
                  <Link
                    href={`/${e.slug}`}
                    className="group flex flex-col rounded-2xl border border-ink-900/8 bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
                  >
                    <div className="flex items-center gap-3 text-xs font-medium text-muted">
                      {e.categories[0] && (
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">
                          {e.categories[0]}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {e.readingMinutes} min read
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-lg font-semibold text-ink-900 group-hover:text-brand-700">
                      {e.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{e.excerpt}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                      Read article
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
