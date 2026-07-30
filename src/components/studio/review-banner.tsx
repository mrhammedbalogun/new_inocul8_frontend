"use client";

import type { StudioMe, StudioPostDetail } from "@/lib/studio/types";

type Props = {
  post: StudioPostDetail;
  me: StudioMe | null;
  onWithdraw: () => void;
  withdrawBusy: boolean;
};

/**
 * Shown above the editor while a post is in the review loop:
 *  - changes_requested → amber, showing the reviewer's note verbatim.
 *  - pending_review    → blue, explaining the freeze (or, for reviewers, that
 *    they may keep editing) plus a "Withdraw from review" button. Withdraw is
 *    open to any studio user server-side — an author pulling their own post
 *    back and a reviewer bouncing it without a note are both legitimate.
 * Any other status renders nothing.
 */
export function ReviewBanner({ post, me, onWithdraw, withdrawBusy }: Props) {
  if (post.status === "changes_requested") {
    return (
      <div role="status" className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="font-semibold text-amber-900">Changes requested</p>
        <p className="mt-1 whitespace-pre-line text-sm text-amber-900">
          {post.review_note || "The reviewer sent this back but didn't leave a note."}
        </p>
        <p className="mt-2 text-xs text-amber-800">
          Make the edits, then submit it for review again from the sidebar.
        </p>
      </div>
    );
  }

  if (post.status === "pending_review") {
    return (
      <div
        role="status"
        className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4"
      >
        <div className="min-w-0">
          <p className="font-semibold text-blue-900">Out for review</p>
          <p className="mt-1 text-sm text-blue-900">
            {me?.can_review
              ? "This post is awaiting review. As a reviewer you can still edit it — approve it with Publish, or send it back with Request changes."
              : "This post is with the review team, so editing is paused. Withdraw it from review if you need to keep working on it."}
          </p>
        </div>
        <button
          type="button"
          onClick={onWithdraw}
          disabled={withdrawBusy}
          className="shrink-0 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60"
        >
          {withdrawBusy ? "Withdrawing…" : "Withdraw from review"}
        </button>
      </div>
    );
  }

  return null;
}
