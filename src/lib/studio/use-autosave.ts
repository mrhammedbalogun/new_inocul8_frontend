"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StudioError, studioFetch } from "./client";

export type SaveState =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "stale"
  | "unauthorized"
  | "forbidden";

const DEBOUNCE_MS = 2000;

/**
 * Debounced autosave for the studio post editor.
 *
 * Contract with the backend (`PATCH /studio/posts/:id/autosave/`), verified
 * against the live API, not guessed:
 *  - It only accepts `draft_*` keys. A bare live field name (e.g. `title`) is
 *    silently ignored, not rejected — so `payload` MUST already be keyed as
 *    `draft_title`/`draft_body`/etc. Callers own that mapping; this hook just
 *    forwards `payload` verbatim plus `expected_updated_at`.
 *  - It returns `{ updated_at, status }` on success.
 *  - It 400s with `{ code: "stale_write" }` when `expected_updated_at` doesn't
 *    match the row's current `updated_at`, and `{ code: "invalid_expected_updated_at" }`
 *    when that value is missing/unparseable/timezone-naive. Both are distinct
 *    error codes returned by the API — matched on `code`, not by
 *    string-sniffing the human-readable `detail` message, which is not a
 *    contract and could be reworded without notice.
 *  - It 403s while the post is `pending_review` for anyone without review
 *    permission (the "review freeze").
 *  - It 401s when the session is gone (the BFF route already retried a token
 *    refresh once before this ever surfaces — see src/app/api/studio/[...path]/route.ts).
 *
 * Failure handling is the point of this hook, not the happy path: a 401 must
 * never discard the in-memory draft (no navigation — the caller shows a
 * re-login affordance in place), a stale write must stop retrying and tell
 * the author to reload (retrying would loop on the same 400 or blindly clobber
 * someone else's edit), and a 403 must stop and explain rather than retry
 * against a door that isn't going to open on its own.
 */
export function useAutosave<T extends Record<string, unknown>>(opts: {
  id: string;
  payload: T;
  enabled: boolean;
  expectedUpdatedAt: string | null;
  onSaved: (updatedAt: string) => void;
}) {
  const { id, payload, enabled, expectedUpdatedAt, onSaved } = opts;
  const [state, setState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always-current payload/expected_updated_at for the in-flight or
  // about-to-fire save, read at send time rather than closed over at
  // schedule time — a keystroke during the debounce window must not resend
  // stale content.
  const latest = useRef(payload);
  latest.current = payload;
  const expectedRef = useRef(expectedUpdatedAt);
  expectedRef.current = expectedUpdatedAt;

  // The last payload snapshot we know is safely persisted (either "what the
  // post loaded with" or "what we last successfully saved"). The debounce
  // effect only schedules a save when the current payload differs from this,
  // so loading an existing draft doesn't itself trigger a redundant PATCH
  // (and can't spuriously flip into "stale" before the author has typed a
  // single character).
  const baseline = useRef<string | null>(null);

  // Reset per-post state when the id changes under this hook instance.
  // PostEditor isn't guaranteed to remount across a client-side navigation
  // between two posts (same dynamic route segment), so without this a
  // leftover baseline/lastSavedAt from the previous post would leak into the
  // next one.
  const prevId = useRef(id);
  if (prevId.current !== id) {
    prevId.current = id;
    baseline.current = null;
  }

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Forget the current baseline and adopt whatever the NEXT payload render
  // produces as "already persisted" — the same semantics as the initial load.
  // For callers that just replaced the editor content with server state (e.g.
  // the discard action restoring the live text): without this, the content
  // swap looks like an edit, schedules a redundant echo-PATCH of values the
  // server already holds, and (on a published post) falsely re-flags
  // "unsaved-to-live edits" the instant the user discarded them.
  const markClean = useCallback(() => {
    clearTimer();
    baseline.current = null;
  }, [clearTimer]);

  const saveNow = useCallback(async () => {
    clearTimer();
    setState("saving");
    const body = JSON.stringify({ ...latest.current, expected_updated_at: expectedRef.current });
    try {
      const res = await studioFetch<{ updated_at: string; status: string }>(
        `posts/${id}/autosave/`,
        { method: "PATCH", body },
      );
      baseline.current = JSON.stringify(latest.current);
      setState("saved");
      setLastSavedAt(new Date());
      setError("");
      onSaved(res.updated_at);
    } catch (err) {
      const e = err as StudioError;
      const code = (e.data as { code?: string } | null)?.code;
      if (e.status === 401) {
        // Never navigate here: navigating to /studio/login would tear down
        // this component and discard the unsent draft still sitting in
        // `latest.current`. The shell surfaces a re-login affordance in place
        // instead; the effect below stops rescheduling until it clears.
        setState("unauthorized");
      } else if (e.status === 400 && code === "stale_write") {
        setState("stale");
      } else if (e.status === 403) {
        setState("forbidden");
      } else {
        setState("error");
      }
      setError(e.message);
    }
  }, [id, clearTimer]);

  useEffect(() => {
    if (!enabled) return;
    const snapshot = JSON.stringify(payload);

    if (baseline.current === null) {
      // First tick this hook is live for this post/payload shape — this is
      // the content the post loaded with, not an edit. Record it and wait
      // for an actual change before scheduling anything.
      baseline.current = snapshot;
      return;
    }
    if (snapshot === baseline.current) return;
    // A stale write or review freeze won't resolve itself by retrying; an
    // expired session needs a human to sign back in. Stop rescheduling until
    // saveNow() is invoked explicitly (e.g. after reload, or a manual retry).
    if (state === "unauthorized" || state === "stale" || state === "forbidden") return;

    clearTimer();
    timer.current = setTimeout(saveNow, DEBOUNCE_MS);
    return clearTimer;
    // payload is compared by value (JSON.stringify) rather than identity, and
    // saveNow/clearTimer are stable callbacks — only `state` and `enabled`
    // need to be literal deps here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload), enabled, state]);

  // Warn before losing unsaved work on tab close — covers both "a save is in
  // flight" and "edits exist that haven't made it to the server yet"
  // (including while paused on unauthorized/stale/forbidden).
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      const dirty = baseline.current !== null && JSON.stringify(latest.current) !== baseline.current;
      if (state === "saving" || dirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state]);

  return { state, lastSavedAt, error, saveNow, markClean };
}
