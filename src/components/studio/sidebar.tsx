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
  type StudioMe,
  type StudioPostDetail,
} from "@/lib/studio/types";

/** Workflow callbacks owned by editor.tsx (the component that owns the post
 *  state and the studioFetch mutations). The sidebar only decides WHICH
 *  buttons a given role/status combination gets to see — every actual
 *  transition, and every server error message, lives with the caller. */
export type WorkflowProps = {
  /** null while /me is loading or if it failed — actions are hidden rather
   *  than guessed, because showing "Publish" to someone the server will 403
   *  teaches staff the buttons lie. */
  me: StudioMe | null;
  /** Name of the action currently in flight, or null. Disables everything —
   *  two overlapping workflow transitions is never a state anyone wants. */
  busy: string | null;
  /** Last workflow error, verbatim from the server where possible. */
  error: string;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onWithdraw: () => void;
  onPublish: () => void;
  onRequestChanges: (note: string) => void;
  onUnpublish: () => void;
  onDiscard: () => void;
};

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
  workflow: WorkflowProps;
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
  workflow,
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

        <WorkflowActions post={post} workflow={workflow} />
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

/** Two-step inline confirmation for a destructive action. Deliberately NOT a
 *  modal: swapping the button in place keeps keyboard focus exactly where the
 *  user already is, needs no focus trap, and can't be dismissed by accident —
 *  the destructive request only ever fires from the explicit "Yes" button. */
function ConfirmableAction({
  label,
  busyLabel,
  warning,
  confirmLabel,
  busy,
  disabled,
  onConfirm,
}: {
  label: string;
  busyLabel: string;
  warning: string;
  confirmLabel: string;
  busy: boolean;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={disabled}
        className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60"
      >
        {busy ? busyLabel : label}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/60 p-2.5">
      <p className="text-xs text-red-800">{warning}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
          disabled={disabled}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          Never mind
        </button>
      </div>
    </div>
  );
}

/** Role- and status-gated workflow buttons. Mirrors the SERVER's rules rather
 *  than inventing its own:
 *   - submit/withdraw are refused on a published post (server 403 — the
 *     unpublish backdoor), so an author with pending edits on a live post is
 *     told to hand over to an editor instead of being given a doomed button.
 *   - request-changes/publish/unpublish need review/publish permission, so
 *     they only render for accounts /me says have it. */
function WorkflowActions({ post, workflow }: { post: StudioPostDetail; workflow: WorkflowProps }) {
  const { me, busy, error } = workflow;
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  const primary =
    "w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60";
  const secondary =
    "w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm font-medium text-ink-900 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60";

  if (!me) {
    return (
      <div className="mt-4 border-t border-ink-900/8 pt-3 text-xs text-muted">
        Couldn't load your permissions, so the publish and review actions are hidden. Reload the
        page to try again.
      </div>
    );
  }

  const status = post.status;
  const anyBusy = busy !== null;
  // The review freeze is one-directional: it blocks the submitter, not a
  // reviewer who is allowed to keep editing a pending post (same rule the
  // autosave `enabled` gate applies in editor.tsx).
  const frozenForThisUser = status === "pending_review" && !me.can_review;

  return (
    <div className="mt-4 space-y-2 border-t border-ink-900/8 pt-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
          {error}
        </p>
      )}

      {!frozenForThisUser && (
        <button type="button" onClick={workflow.onSaveDraft} disabled={anyBusy} className={secondary}>
          Save draft
        </button>
      )}

      {/* ---- Author actions (no publish permission) ---- */}
      {!me.can_publish && (status === "draft" || status === "changes_requested") && (
        <button type="button" onClick={workflow.onSubmit} disabled={anyBusy} className={primary}>
          {busy === "submit" ? "Submitting…" : "Submit for review"}
        </button>
      )}
      {!me.can_publish && status === "pending_review" && (
        <button type="button" onClick={workflow.onWithdraw} disabled={anyBusy} className={secondary}>
          {busy === "withdraw" ? "Withdrawing…" : "Withdraw from review"}
        </button>
      )}

      {/* ---- Editor actions ---- */}
      {me.can_publish && status !== "published" && (
        <button type="button" onClick={workflow.onPublish} disabled={anyBusy} className={primary}>
          {busy === "open-publish"
            ? "Saving…"
            : status === "scheduled"
              ? "Reschedule / publish now…"
              : status === "pending_review"
                ? "Approve and publish…"
                : "Publish…"}
        </button>
      )}

      {me.can_publish && me.can_review && status === "pending_review" && (
        <>
          {noteOpen ? (
            <div className="rounded-lg border border-ink-900/12 p-2.5">
              <label htmlFor="review-note" className="text-xs font-medium">
                What needs changing?
              </label>
              <textarea
                id="review-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tell the author what to fix — they'll see this note on the post."
                className="mt-1 w-full rounded-lg border border-ink-900/12 px-2.5 py-1.5 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => workflow.onRequestChanges(note)}
                  disabled={anyBusy}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-60"
                >
                  {busy === "request-changes" ? "Sending…" : "Send back to author"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNoteOpen(false);
                    setNote("");
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setNoteOpen(true)} disabled={anyBusy} className={secondary}>
              Request changes
            </button>
          )}
        </>
      )}

      {/* ---- Published post with edits that haven't gone live ---- */}
      {status === "published" && post.has_pending_changes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">
            Published — you have unsaved-to-live edits
          </p>
          <p className="mt-1 text-xs text-amber-800">
            {me.can_publish
              ? "The live article still shows the last published version."
              : "The live article still shows the last published version. A live post can't be submitted for review — ask an editor to publish your changes."}
          </p>
          <div className="mt-2 space-y-2">
            {me.can_publish && (
              <button type="button" onClick={workflow.onPublish} disabled={anyBusy} className={primary}>
                {busy === "open-publish" ? "Saving…" : "Update live post…"}
              </button>
            )}
            <ConfirmableAction
              label="Discard my edits"
              busyLabel="Discarding…"
              warning="This permanently throws away every edit made since the post last went live and restores the live text. It cannot be undone."
              confirmLabel="Yes, discard my edits"
              busy={busy === "discard"}
              disabled={anyBusy}
              onConfirm={workflow.onDiscard}
            />
          </div>
        </div>
      )}

      {me.can_publish && status === "published" && (
        <ConfirmableAction
          label="Unpublish"
          busyLabel="Unpublishing…"
          warning="This takes the post off the public site immediately — its address stops working until it's published again. For search-ranked posts that can cost rankings."
          confirmLabel="Yes, unpublish"
          busy={busy === "unpublish"}
          disabled={anyBusy}
          onConfirm={workflow.onUnpublish}
        />
      )}

      {me.can_publish && status === "scheduled" && (
        <ConfirmableAction
          label="Cancel scheduled publish"
          busyLabel="Cancelling…"
          warning="This stops the scheduled publish and returns the post to draft. Nothing goes live until it's published again."
          confirmLabel="Yes, cancel the schedule"
          busy={busy === "unpublish"}
          disabled={anyBusy}
          onConfirm={workflow.onUnpublish}
        />
      )}
    </div>
  );
}
