"use client";

import { useState } from "react";
import { MediaPicker } from "@/components/studio/media-picker";
import { resolveMediaUrl } from "@/lib/studio/client";
import type { MediaAssetT, StudioPostDetail } from "@/lib/studio/types";

type Props = {
  post: StudioPostDetail;
  /** Commits immediately via PATCH posts/:id/ with featured_image_id — see
   *  commitFeaturedImage in editor.tsx. Not part of the autosave payload
   *  (there is no draft_featured_image_id shadow), so this must never be
   *  folded into the debounced draft fields. */
  onChange: (asset: MediaAssetT | null) => void;
  busy?: boolean;
  error?: string;
};

export function FeaturedImage({ post, onChange, busy, error }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <section className="rounded-xl border border-ink-900/8 bg-white p-4">
      <h2 className="font-semibold">Featured image</h2>

      {post.featured_image ? (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveMediaUrl(post.featured_image.url)}
            alt={post.featured_image.alt_text}
            width={post.featured_image.width}
            height={post.featured_image.height}
            className="aspect-video w-full rounded-lg object-cover"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={busy}
              className="rounded-lg border border-ink-900/12 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={busy}
          className="mt-3 grid h-32 w-full place-items-center rounded-lg border-2 border-dashed border-ink-900/15 text-sm text-muted hover:border-ink-900/25 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Upload featured image"}
        </button>
      )}

      {busy && post.featured_image && <p className="mt-2 text-xs text-muted">Saving…</p>}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(asset) => {
          setPickerOpen(false);
          onChange(asset);
        }}
      />
    </section>
  );
}
