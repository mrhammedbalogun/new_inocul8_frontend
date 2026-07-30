"use client";

import type { StudioPostDetail } from "@/lib/studio/types";

function Counter({ value, min, max }: { value: string; min: number; max: number }) {
  const n = value.length;
  const ok = n >= min && n <= max;
  return (
    <span className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-amber-600"}`}>
      {n} / {min}–{max} recommended
    </span>
  );
}

// SEO fields, like title/body, are edited against the shadow draft_* columns —
// `post.meta_title` etc. here are the *display* working values (merged from
// draft_meta_title with a live fallback when the editor loads, see editor.tsx),
// not the live/published fields. onChange only ever updates that in-memory
// working value; editor.tsx is what maps it onto `draft_meta_title` in the
// autosave payload. Never wire this panel to send a bare `meta_title` etc. to
// the API directly — the autosave endpoint silently ignores non-draft_* keys.
export function SeoPanel({
  post,
  onChange,
}: {
  post: StudioPostDetail;
  onChange: (patch: Partial<StudioPostDetail>) => void;
}) {
  const field = "mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm";

  return (
    <section className="rounded-xl border border-ink-900/8 bg-white p-4">
      <h2 className="font-semibold">SEO</h2>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <label htmlFor="meta_title" className="text-sm font-medium">
            Meta title
          </label>
          <Counter value={post.meta_title} min={50} max={60} />
        </div>
        <input
          id="meta_title"
          value={post.meta_title}
          className={field}
          onChange={(e) => onChange({ meta_title: e.target.value })}
        />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <label htmlFor="meta_description" className="text-sm font-medium">
            Meta description
          </label>
          <Counter value={post.meta_description} min={150} max={160} />
        </div>
        <textarea
          id="meta_description"
          rows={3}
          value={post.meta_description}
          className={field}
          onChange={(e) => onChange({ meta_description: e.target.value })}
        />
      </div>

      <div className="mt-3">
        <label htmlFor="focus_keyword" className="text-sm font-medium">
          Focus keyword
        </label>
        <input
          id="focus_keyword"
          value={post.focus_keyword}
          className={field}
          onChange={(e) => onChange({ focus_keyword: e.target.value })}
        />
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium">Social sharing</summary>
        <div className="mt-3">
          <label htmlFor="og_title" className="text-sm font-medium">
            Open Graph title
          </label>
          <input
            id="og_title"
            value={post.og_title}
            className={field}
            onChange={(e) => onChange({ og_title: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted">Falls back to the meta title.</p>
        </div>
        <div className="mt-3">
          <label htmlFor="og_description" className="text-sm font-medium">
            Open Graph description
          </label>
          <textarea
            id="og_description"
            rows={2}
            value={post.og_description}
            className={field}
            onChange={(e) => onChange({ og_description: e.target.value })}
          />
        </div>
      </details>
    </section>
  );
}
