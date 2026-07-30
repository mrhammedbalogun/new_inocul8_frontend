"use client";

import { useEffect, useRef, useState } from "react";
import { studioFetch, uploadImage, listMedia, StudioError } from "@/lib/studio/client";
import type { MediaAssetT } from "@/lib/studio/types";

type Props = { open: boolean; onClose: () => void; onSelect: (asset: MediaAssetT) => void };

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ACCEPTED_MIME = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export function MediaPicker({ open, onClose, onSelect }: Props) {
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const [assets, setAssets] = useState<MediaAssetT[]>([]);
  const [libraryError, setLibraryError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<MediaAssetT | null>(null);
  const [alt, setAlt] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);

  // Kept fresh via an effect (not assigned during render) so the Escape-key handler below always
  // calls the latest `onClose` without needing to re-attach the document listener every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Reset transient state every time the picker is (re)opened, so a previous upload/error
  // doesn't linger the next time a client opens it. Adjusted directly during render (React's
  // documented pattern for resetting state on a prop change) rather than in an effect, which
  // would cost an extra render/commit cycle for something the user must never see mid-flight.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTab("upload");
      setError("");
      setLibraryError("");
      setPending(null);
      setAlt("");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (open && tab === "library") {
      listMedia(60)
        .then(setAssets)
        .catch((err: unknown) => {
          setLibraryError(err instanceof StudioError ? err.message : "Could not load the media library.");
        });
    }
  }, [open, tab]);

  // Focus management: move focus into the dialog on open, restore it to whatever had focus
  // beforehand on close.
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

  // Escape-to-close and Tab focus trap, kept separate from the effect above so it doesn't steal
  // focus back to the first control on every re-render (e.g. while typing alt text).
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

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const asset = await uploadImage(file);
      setPending(asset);
      setAlt(asset.alt_text);
    } catch (err) {
      // Surface the backend's message verbatim (e.g. "File too large", "Not a supported image
      // type") rather than a generic failure string — it's the actionable part for the author.
      setError(err instanceof StudioError ? err.message : "Could not upload that image.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(asset: MediaAssetT) {
    let finalAsset = asset;
    if (alt !== asset.alt_text) {
      try {
        await studioFetch(`media/${asset.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ alt_text: alt }),
        });
        finalAsset = { ...asset, alt_text: alt };
      } catch (err) {
        // Alt text is a nice-to-have here, not a hard requirement (drafts must always be able to
        // save) — if the PATCH fails, still insert the image with whatever alt text the upload
        // itself returned rather than blocking insertion.
        setError(err instanceof StudioError ? err.message : "Could not save alt text — inserted image without it.");
      }
    }
    onSelect(finalAsset);
    setPending(null);
    setAlt("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-picker-title"
        tabIndex={-1}
        className="w-full max-w-2xl rounded-2xl bg-white p-6 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 id="media-picker-title" className="text-lg font-semibold text-ink-900">
            Insert image
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            ×
          </button>
        </div>

        <div className="mt-3 flex gap-2 border-b border-ink-900/8 pb-3">
          <button
            type="button"
            onClick={() => setTab("upload")}
            aria-pressed={tab === "upload"}
            className={tab === "upload" ? "font-semibold text-brand-700" : "text-muted"}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setTab("library")}
            aria-pressed={tab === "library"}
            className={tab === "library" ? "font-semibold text-brand-700" : "text-muted"}
          >
            Library
          </button>
        </div>

        {pending ? (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pending.url} alt="" className="max-h-64 rounded-lg" />
            <label className="mt-4 block text-sm font-medium" htmlFor="media-picker-alt">
              Alt text
            </label>
            <input
              id="media-picker-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe what's in the photo, e.g. 'Nurse administering yellow fever vaccine'"
              className="mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            />
            <p className="mt-1 text-xs text-muted">
              Needed before the post can be published — you can add it later, but publishing will ask for it.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => confirm(pending)}
                className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                Insert image
              </button>
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  setAlt("");
                  setError("");
                }}
                className="rounded-lg px-4 py-2 font-medium text-ink-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                Choose a different image
              </button>
            </div>
          </div>
        ) : tab === "upload" ? (
          <div className="mt-4">
            <label
              htmlFor="media-picker-file"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              className="grid h-40 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink-900/15 text-center text-muted focus-within:ring-2 focus-within:ring-brand-600"
            >
              <span aria-live="polite">{busy ? "Uploading…" : "Drop an image here, or click to choose a file"}</span>
              {/*
                sr-only (not display:none) so the input stays focusable and operable by keyboard.
                aria-label is explicit (not left to the wrapping <label>'s text) because some
                accessibility trees expose type="file" inputs as a "button" node that doesn't
                reliably pick up a wrapping label's text — verified in Chrome's own a11y tree
                during QA, where the wrapped-only version reported no accessible name at all.
              */}
              <input
                id="media-picker-file"
                type="file"
                accept={ACCEPTED_MIME}
                disabled={busy}
                aria-label="Choose an image file to upload"
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4">
            {libraryError && (
              <p role="alert" className="mb-3 text-sm text-red-600">
                {libraryError}
              </p>
            )}
            {assets.length === 0 && !libraryError ? (
              <p className="py-8 text-center text-sm text-muted">No images uploaded yet.</p>
            ) : (
              <div className="grid max-h-96 grid-cols-4 gap-3 overflow-y-auto">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      setPending(asset);
                      setAlt(asset.alt_text);
                    }}
                    aria-label={asset.alt_text || asset.title || `Image ${asset.id}`}
                    className="overflow-hidden rounded-lg border border-ink-900/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
