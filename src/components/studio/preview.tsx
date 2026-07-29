"use client";

import { ServiceProse } from "@/components/service/service-prose";
import { resolveMediaUrl } from "@/lib/studio/client";
import type { StudioPostDetail } from "@/lib/studio/types";

/**
 * Renders through the *actual* ServiceProse component and stylesheet used on
 * the published site — the entire reason the studio lives in this Next app
 * instead of Django admin. Do not re-implement article styling here; if this
 * ever looks wrong, that is a real bug in the published article styling, not
 * something to patch over in the preview.
 *
 * `html` is the live editor content (not the last-saved draft_body), so the
 * preview reflects unsaved edits.
 */
export function Preview({ post, html }: { post: StudioPostDetail; html: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      {post.featured_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveMediaUrl(post.featured_image.url)}
          alt={post.featured_image.alt_text}
          width={post.featured_image.width}
          height={post.featured_image.height}
          className="mb-8 w-full rounded-2xl object-cover"
        />
      )}
      <h1 className="font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">
        {post.title || "Untitled post"}
      </h1>
      <div className="mt-8">
        <ServiceProse html={html} />
      </div>
    </div>
  );
}
