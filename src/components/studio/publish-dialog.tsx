"use client";

import { useEffect, useRef, useState } from "react";
import { resolveMediaUrl, StudioError, studioFetch } from "@/lib/studio/client";
import type { StudioMe, StudioPostDetail } from "@/lib/studio/types";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Client-side mirror of the backend's images_missing_alt (apps/blog/studio/
// workflow.py) so the checklist can warn BEFORE the publish attempt bounces.
// The server stays the enforcer — this is a preview of its verdict, not a
// replacement for it, and it deliberately uses the same two regexes so the
// two counts can't disagree on the same HTML.
function imagesMissingAlt(html: string): number {
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  let missing = 0;
  for (const tag of tags) {
    const match = tag.match(/\balt\s*=\s*"([^"]*)"/i);
    if (!match || !match[1].trim()) missing += 1;
  }
  return missing;
}

type Props = {
  /** The editor's WORKING post (draft-with-live-fallback values merged in
   *  editor.tsx) — so the SEO checks below judge what will actually go live,
   *  and `updated_at` is the freshest known value for the stale-write guard. */
  post: StudioPostDetail;
  me: StudioMe;
  /** Current editor HTML (mirrors draft_body) — used only for the alt-text
   *  pre-check; the publish request itself sends no content, the server
   *  promotes what autosave already persisted. */
  html: string;
  open: boolean;
  onClose: () => void;
  onPublished: (post: StudioPostDetail) => void;
};

export function PublishDialog({ post, me, html, open, onClose, onPublished }: Props) {
  const [when, setWhen] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [busy, setBusy] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Kept fresh via an effect (not assigned during render) so the Escape-key
  // handler always calls the latest `onClose` without re-attaching the
  // document listener every render. Same pattern as MediaPicker.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Reset transient state on every (re)open so a previous attempt's error or
  // schedule date doesn't linger. Adjusted during render (React's documented
  // reset-on-prop-change pattern), not in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setWhen("");
      setError("");
      setErrorCode("");
      setBusy(false);
    }
  }

  // Focus management: move focus into the dialog on open, restore on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? dialog)?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, [open]);

  // Escape-to-close and Tab focus trap.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  const missingAlt = imagesMissingAlt(html);
  const isLiveUpdate = post.status === "published";
  const reviewer = post.medically_reviewed_by;

  async function publish() {
    setError("");
    setErrorCode("");

    // datetime-local yields a NAIVE local string ("2026-07-30T09:00"). The
    // backend refuses naive timestamps (400, code invalid_publish_at) rather
    // than silently publishing now, so convert through Date -> toISOString(),
    // which appends the UTC offset ("Z") after shifting from device-local time.
    let publishAt: string | undefined;
    if (when) {
      const parsed = new Date(when);
      if (Number.isNaN(parsed.getTime())) {
        setError("That schedule date couldn't be understood — pick it again, or clear it to publish now.");
        return;
      }
      publishAt = parsed.toISOString();
    }

    setBusy(true);
    try {
      const updated = await studioFetch<StudioPostDetail>(`posts/${post.id}/publish/`, {
        method: "POST",
        body: JSON.stringify({
          ...(publishAt ? { publish_at: publishAt } : {}),
          expected_updated_at: post.updated_at,
        }),
      });
      onPublished(updated);
      onClose();
    } catch (err) {
      if (err instanceof StudioError) {
        // Surface the server's own message — it already says the actionable
        // thing ("2 image(s) still need alt text…", "reload to get the
        // latest version") in plain language.
        setErrorCode((err.data as { code?: string } | null)?.code ?? "");
        setError(err.message);
      } else {
        setError("Something went wrong — check your connection and try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const check = (ok: boolean, label: string, key: string) => (
    <li key={key} className={ok ? "text-emerald-700" : "text-amber-700"}>
      <span aria-hidden="true">{ok ? "✓" : "!"}</span>{" "}
      <span className="sr-only">{ok ? "Done:" : "Needs attention:"}</span> {label}
    </li>
  );

  const primaryLabel = busy
    ? isLiveUpdate
      ? "Updating…"
      : "Publishing…"
    : when
      ? "Schedule"
      : isLiveUpdate
        ? "Update live post"
        : "Publish now";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-dialog-title"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="publish-dialog-title" className="font-display text-xl font-semibold text-ink-900">
          {isLiveUpdate ? "Update" : "Publish"} “{post.title || "Untitled post"}”
        </h2>

        <div className="mt-4 flex items-start gap-3">
          {post.featured_image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resolveMediaUrl(post.featured_image.url)}
              alt=""
              className="h-16 w-24 shrink-0 rounded-lg object-cover"
            />
          )}
          <ul className="space-y-1 text-sm">
            {check(Boolean(post.featured_image), "Featured image", "image")}
            {check(
              post.categories.length > 0,
              post.categories.length > 0
                ? `Category: ${post.categories.map((c) => c.name).join(", ")}`
                : "Category",
              "category",
            )}
            {check(
              post.meta_title.length >= 50 && post.meta_title.length <= 60,
              `Meta title length (${post.meta_title.length} of 50–60)`,
              "meta-title",
            )}
            {check(
              post.meta_description.length >= 150 && post.meta_description.length <= 160,
              `Meta description length (${post.meta_description.length} of 150–160)`,
              "meta-description",
            )}
            {check(
              missingAlt === 0,
              missingAlt === 0
                ? "All images have alt text"
                : `${missingAlt} image${missingAlt === 1 ? "" : "s"} missing alt text — publishing will be blocked until it's added`,
              "alt",
            )}
          </ul>
        </div>

        <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-ink-900">
          This post will live at <strong>inocul8.com.ng/{post.slug}</strong>
          {!post.first_published_at && " — this URL cannot be changed later."}
        </p>

        {/* The most important copy in this dialog: the medical-review badge is
            a public reviewedBy claim on a healthcare site, and the backend
            recomputes it from the PUBLISHING user on every publish. Tell the
            truth about what this click does — including that it CLEARS another
            clinician's existing badge when a non-clinician republishes. */}
        {me.can_medically_review ? (
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-ink-900">
            Publishing will mark this post as <strong>medically reviewed by you</strong> ({me.name}
            {me.credentials ? `, ${me.credentials}` : ""}). Your name will appear on the article
            and in search results as the reviewer of this exact version.
          </p>
        ) : reviewer ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-ink-900">
            <strong>This will remove the current medical-review badge.</strong> The live post is
            marked “Medically reviewed by {reviewer.name}
            {reviewer.credentials ? `, ${reviewer.credentials}` : ""}”, but that badge is
            re-checked on every publish — and because you are not a credentialed clinician
            reviewer, publishing now puts this version live <strong>without</strong> it. If the
            badge should stay, ask a clinician editor
            {reviewer.name ? ` (for example ${reviewer.name})` : ""} to review and publish this
            version instead.
          </p>
        ) : (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-ink-900">
            <strong>No medical review.</strong> This post will publish without the “Medically
            reviewed” badge. To publish with medical review, ask a clinician editor to approve
            and publish it instead.
          </p>
        )}

        <label className="mt-4 block text-sm font-medium" htmlFor="publish-when">
          Schedule for later (optional)
        </label>
        <input
          id="publish-when"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2"
          aria-describedby="publish-when-hint"
        />
        <p id="publish-when-hint" className="mt-1 text-xs text-muted">
          Leave empty to {isLiveUpdate ? "update the live post" : "publish"} straight away. The
          time is read in this device's own time zone.
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
            {errorCode === "missing_alt" && (
              <p className="mt-2">
                To add alt text: click the image in the editor, choose <strong>Replace</strong>,
                pick the same image from the <strong>Library</strong> tab and fill in its “Alt
                text” box before inserting it again.
              </p>
            )}
            {errorCode === "stale_write" && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 font-medium underline underline-offset-2 hover:no-underline"
              >
                Reload this page
              </button>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
