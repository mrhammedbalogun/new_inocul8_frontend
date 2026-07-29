"use client";

import { useState } from "react";
import { FeaturedImage } from "@/components/studio/featured-image";
import { SeoPanel } from "@/components/studio/seo-panel";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  type MediaAssetT,
  type StudioAuthorT,
  type StudioCategoryT,
  type StudioPostDetail,
} from "@/lib/studio/types";

type Props = {
  post: StudioPostDetail;
  categories: StudioCategoryT[];
  authors: StudioAuthorT[];
  /** Merges into the in-memory working post — flows into the autosave
   *  payload's draft_* keys in editor.tsx. Used for everything that has a
   *  draft shadow: title/body (handled elsewhere), tags, and the SEO fields. */
  onDraftChange: (patch: Partial<StudioPostDetail>) => void;
  /** Explicit PATCH posts/:id/ calls — for the fields that are deliberately
   *  NOT part of autosave (no draft_* shadow), so an edit here must commit
   *  immediately rather than sit in the debounced payload where it would
   *  either be silently dropped (slug/featured image — not draft_* keys) or
   *  never leave local state at all (categories — no shadow M2M exists). */
  onSlugCommit: (slug: string) => void;
  onCategoriesCommit: (ids: number[]) => void;
  onFeaturedImageCommit: (asset: MediaAssetT | null) => void;
  slugError?: string;
  categoriesError?: string;
  imageError?: string;
  imageBusy?: boolean;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

export function Sidebar({
  post,
  categories,
  authors,
  onDraftChange,
  onSlugCommit,
  onCategoriesCommit,
  onFeaturedImageCommit,
  slugError,
  categoriesError,
  imageError,
  imageBusy,
}: Props) {
  const field = "mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm";

  // Local editing buffer for the slug input — committed explicitly on blur,
  // not on every keystroke (unlike the autosaved draft_* fields). Reset
  // whenever the post identity changes underneath this component (client-side
  // nav between two /studio/posts/[id] routes), but never clobbered by a
  // re-render for the SAME post while the author is mid-edit.
  const [slugDraft, setSlugDraft] = useState(post.slug);
  const [slugForPost, setSlugForPost] = useState(post.id);
  if (slugForPost !== post.id) {
    setSlugForPost(post.id);
    setSlugDraft(post.slug);
  }

  const [tagInput, setTagInput] = useState("");

  const author = authors.find((a) => a.id === post.author) ?? null;
  const locked = Boolean(post.first_published_at);

  function commitSlugIfChanged() {
    const next = slugDraft.trim();
    if (!next || next === post.slug) {
      setSlugDraft(post.slug);
      return;
    }
    onSlugCommit(next);
  }

  function addTag() {
    const value = tagInput.trim().replace(/,+$/, "");
    if (!value) {
      setTagInput("");
      return;
    }
    if (!post.tags.includes(value)) {
      onDraftChange({ tags: [...post.tags, value] });
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    onDraftChange({ tags: post.tags.filter((t) => t !== tag) });
  }

  function toggleCategory(id: number) {
    const has = post.categories.some((c) => c.id === id);
    const ids = has
      ? post.categories.filter((c) => c.id !== id).map((c) => c.id)
      : [...post.categories.map((c) => c.id), id];
    onCategoriesCommit(ids);
  }

  return (
    <aside className="space-y-4">
      <section className="rounded-xl border border-ink-900/8 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Status</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[post.status]}`}>
            {STATUS_LABEL[post.status]}
          </span>
        </div>

        {post.has_pending_changes && (
          <p className="mt-2 text-xs text-amber-700">Unpublished changes since this last went live.</p>
        )}

        {post.published_at && (
          <p className="mt-2 text-xs text-muted">Published {formatDate(post.published_at)}</p>
        )}

        <div className="mt-4">
          <label htmlFor="slug" className="text-sm font-medium">
            URL slug
          </label>
          {locked ? (
            <p className="mt-1 text-xs text-muted">
              inocul8.com.ng/<strong>{post.slug}</strong> — locked because this post has been
              published. Ask the site maintainer if the URL genuinely needs to change.
            </p>
          ) : (
            <>
              <input
                id="slug"
                value={slugDraft}
                onChange={(e) => setSlugDraft(e.target.value)}
                onBlur={commitSlugIfChanged}
                className={field}
              />
              <p className="mt-1 text-xs text-muted">
                This post will live at inocul8.com.ng/<strong>{slugDraft || post.slug}</strong> — this
                cannot be changed later.
              </p>
              {slugError && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {slugError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Submit-for-review / publish / request-changes actions land here once
            Task 10 wires the workflow endpoints. Deliberately left as a labeled
            seam rather than a stub — there's nothing here to click yet. */}
        <div className="mt-4 border-t border-ink-900/8 pt-3 text-xs text-muted">
          Workflow actions (submit for review, publish) are added in a later task.
        </div>
      </section>

      <FeaturedImage post={post} onChange={onFeaturedImageCommit} busy={imageBusy} error={imageError} />

      <section className="rounded-xl border border-ink-900/8 bg-white p-4">
        <h2 className="font-semibold">Categories</h2>
        {categoriesError && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {categoriesError}
          </p>
        )}
        {categories.length === 0 ? (
          <p className="mt-2 text-xs text-muted">No categories available.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={post.categories.some((pc) => pc.id === c.id)}
                  onChange={() => toggleCategory(c.id)}
                  className="size-4 rounded border-ink-900/20"
                />
                {c.name}
              </label>
            ))}
          </div>
        )}

        <h2 className="mt-4 font-semibold">Tags</h2>
        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs">
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  aria-label={`Remove tag ${t}`}
                  className="text-muted hover:text-ink-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder="Add a tag and press Enter"
          className={field}
        />

        <h2 className="mt-4 font-semibold">Author</h2>
        <p className="mt-1 text-sm text-muted">
          {author ? `${author.name}${author.credentials ? `, ${author.credentials}` : ""}` : "Unassigned"}
        </p>
        <p className="mt-1 text-xs text-muted">Set by an editor via the byline dialog, not here.</p>
      </section>

      <SeoPanel post={post} onChange={onDraftChange} />
    </aside>
  );
}
