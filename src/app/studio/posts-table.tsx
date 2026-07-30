"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { studioFetch, StudioError } from "@/lib/studio/client";
import { STATUS_CLASS, STATUS_LABEL, type PostStatus, type StudioPostRow } from "@/lib/studio/types";

export function PostsTable() {
  const router = useRouter();
  const [rows, setRows] = useState<StudioPostRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PostStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    let cancelled = false;

    // The API caps page_size server-side (observed: 24/page regardless of
    // the requested page_size=100), so a single fetch silently truncates
    // the list. Follow `next` until exhausted rather than trusting one page.
    // Hard-capped so a backend pagination bug (perpetually truthy `next`)
    // can't spin this loop forever in a staff member's browser — if it
    // trips, that's surfaced as a load error, not a silently partial list.
    const MAX_PAGES = 50;

    async function loadAll() {
      const all: StudioPostRow[] = [];
      let page = 1;
      for (;;) {
        const data = await studioFetch<{ results: StudioPostRow[]; next: string | null }>(
          `posts/?page=${page}&page_size=100`
        );
        all.push(...data.results);
        if (!data.next || data.results.length === 0) break;
        page += 1;
        if (page > MAX_PAGES) {
          throw new Error(`Post list exceeded ${MAX_PAGES} pages — stopped to avoid an unbounded fetch loop.`);
        }
      }
      return all;
    }

    loadAll()
      .then((all) => {
        if (!cancelled) setRows(all);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof StudioError ? err.message : "Could not load posts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createPost() {
    setCreating(true);
    setCreateError("");
    try {
      // draft_title, not title: `title` is the read-only live half of the
      // shadow pair (only publish writes it), so it would be silently dropped.
      const post = await studioFetch<StudioPostRow>("posts/", {
        method: "POST",
        body: JSON.stringify({ draft_title: "Untitled post", slug: `untitled-${Date.now()}` }),
      });
      router.push(`/studio/posts/${post.id}`);
    } catch (err) {
      setCreating(false);
      setCreateError(err instanceof StudioError ? err.message : "Could not create the post.");
    }
  }

  const visible = rows.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (r.draft_title || r.title).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Blog posts</h1>
        <button
          onClick={createPost}
          disabled={creating}
          aria-busy={creating}
          className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? "Creating…" : "New post"}
        </button>
      </div>

      <div role="alert" aria-live="assertive" className="mt-2 min-h-5 text-sm text-red-600">
        {createError}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="post-search">
          Search posts
        </label>
        <input
          id="post-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts…"
          className="flex-1 rounded-lg border border-ink-900/12 px-3 py-2"
        />
        <label className="sr-only" htmlFor="status-filter">
          Filter by status
        </label>
        <select
          id="status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as PostStatus | "all")}
          className="rounded-lg border border-ink-900/12 px-3 py-2"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-10 text-muted">Loading…</p>
      ) : loadError ? (
        <p role="alert" className="mt-10 text-red-600">
          {loadError}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-ink-900/8 rounded-2xl border border-ink-900/8 bg-white">
          {visible.map((row) => (
            <li key={row.id}>
              <Link
                href={`/studio/posts/${row.id}`}
                className="flex items-center gap-4 p-4 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <span className="flex-1 font-medium">{row.draft_title || row.title || "(untitled)"}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[row.status]}`}>
                  {STATUS_LABEL[row.status]}
                </span>
                <time dateTime={row.updated_at} className="w-32 text-right text-sm text-muted">
                  {new Date(row.updated_at).toLocaleDateString("en-NG")}
                </time>
              </Link>
            </li>
          ))}
          {visible.length === 0 && <li className="p-6 text-muted">No posts match.</li>}
        </ul>
      )}
    </div>
  );
}
