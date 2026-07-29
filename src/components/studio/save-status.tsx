"use client";

import { useEffect, useState } from "react";
import type { SaveState } from "@/lib/studio/use-autosave";

function ago(from: Date) {
  const mins = Math.floor((Date.now() - from.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  return `${mins} minutes ago`;
}

type Props = {
  state: SaveState;
  lastSavedAt: Date | null;
  error: string;
  /** Re-issue the last save attempt. Offered on plain errors and once a
   *  session is likely restored — never on "stale" (only a reload is a
   *  correct recovery there: resending would just 400 again against the
   *  same outdated expected_updated_at). */
  onRetry?: () => void;
};

export function SaveStatus({ state, lastSavedAt, error, onRetry }: Props) {
  // Re-render every 30s purely so "Last saved N minutes ago" keeps counting
  // up without requiring any other state to change.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (state === "saving") {
    return <span className="text-sm text-muted">Saving…</span>;
  }

  if (state === "unauthorized") {
    return (
      <span className="flex items-center gap-2 text-sm font-medium text-amber-700" role="alert">
        Signed out — your work is still here, sign in to resume saving
        <a
          href="/studio/login"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:no-underline"
        >
          Sign in
        </a>
        {onRetry && (
          <button type="button" onClick={onRetry} className="underline underline-offset-2 hover:no-underline">
            Try again
          </button>
        )}
      </span>
    );
  }

  if (state === "forbidden") {
    return (
      <span className="text-sm font-medium text-amber-700" role="alert">
        This post is in review — autosave is paused until it&apos;s back in your hands
      </span>
    );
  }

  if (state === "stale") {
    return (
      <span className="flex items-center gap-2 text-sm font-medium text-red-600" role="alert">
        Changed elsewhere — reload before saving
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="underline underline-offset-2 hover:no-underline"
        >
          Reload
        </button>
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="flex items-center gap-2 text-sm text-red-600" role="alert">
        {error || "Couldn't save — check your connection."}
        {onRetry && (
          <button type="button" onClick={onRetry} className="underline underline-offset-2 hover:no-underline">
            Retry
          </button>
        )}
      </span>
    );
  }

  if (state === "saved" && lastSavedAt) {
    return <span className="text-sm text-muted">Last saved {ago(lastSavedAt)}</span>;
  }

  return null;
}
