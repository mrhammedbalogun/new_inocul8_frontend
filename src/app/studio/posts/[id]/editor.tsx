"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import FileHandler from "@tiptap/extension-file-handler";
import { EDITOR_EXTENSIONS, Figure } from "@/lib/editor/schema";
import { studioFetch, uploadImage, StudioError } from "@/lib/studio/client";
import type {
  StudioPostDetail,
  MediaAssetT,
  StudioMe,
  StudioCategoryT,
  StudioAuthorT,
} from "@/lib/studio/types";
import { Toolbar } from "@/components/studio/toolbar";
import { MediaPicker } from "@/components/studio/media-picker";
import { FigureView } from "@/components/studio/figure-view";
import { useAutosave } from "@/lib/studio/use-autosave";
import { SaveStatus } from "@/components/studio/save-status";
import { Sidebar } from "@/components/studio/sidebar";
import { Preview } from "@/components/studio/preview";
import { PublishDialog } from "@/components/studio/publish-dialog";
import { ReviewBanner } from "@/components/studio/review-banner";

// Some legacy WP-imported posts store the literal string "NULL" instead of an
// empty value in meta_description/focus_keyword (Rank Math was never run
// against them, and the migration copied the DB's literal NULL cell as text).
// Treat it as empty everywhere it's read so the SEO panel doesn't show "NULL"
// as if it were real content the author typed.
function cleanMeta(v: string): string {
  return v === "NULL" ? "" : v;
}

// Maps a server StudioPostDetail onto the WORKING post this editor displays:
// every autosaved field resumes from its draft_* shadow with a live fallback,
// so a saved-but-unpublished edit survives a reload instead of quietly
// reverting to the live value. Used on initial load AND after any workflow
// action that returns a full detail (publish, discard) — after those, draft_*
// and live are equal, so the mapping is a no-op that still refreshes
// updated_at/status/medically_reviewed_* correctly.
function toWorkingPost(data: StudioPostDetail): StudioPostDetail {
  return {
    ...data,
    title: data.draft_title || data.title,
    tags: data.draft_tags.length > 0 ? data.draft_tags : data.tags,
    meta_title: cleanMeta(data.draft_meta_title) || cleanMeta(data.meta_title),
    meta_description: cleanMeta(data.draft_meta_description) || cleanMeta(data.meta_description),
    focus_keyword: cleanMeta(data.draft_focus_keyword) || cleanMeta(data.focus_keyword),
    og_title: cleanMeta(data.draft_og_title) || cleanMeta(data.og_title),
    og_description: cleanMeta(data.draft_og_description) || cleanMeta(data.og_description),
  };
}

// Mirrors the backend's slug style: lowercase, hyphen-separated, no edge dashes.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80)
    .replace(/-$/, "");
}

// A slug still "follows the title" (WordPress-style) while the post has never
// been published AND the author hasn't set one by hand: either it's the
// untitled-<timestamp> placeholder from create, or it equals what the current
// title would generate (i.e. the last auto-sync wrote it).
function slugIsStillAuto(data: StudioPostDetail): boolean {
  if (data.first_published_at) return false;
  return /^untitled-\d+$/.test(data.slug) || data.slug === slugify(data.draft_title || data.title);
}

// Builds the figure node content inserted for a freshly uploaded/selected asset. Width/height
// come straight from the MediaAsset record returned by the upload endpoint and are stamped onto
// the node's attrs here — that pairing is the entire CLS-prevention mechanism: the sanitizer
// allowlists width/height on <img>, and `.service-prose img` (via Tailwind preflight's
// `height: auto`) uses them to reserve the correct aspect ratio before the image loads.
function figureNode(asset: MediaAssetT) {
  return {
    type: "figure",
    attrs: {
      src: asset.url,
      alt: asset.alt_text,
      width: asset.width,
      height: asset.height,
      align: "center",
      size: "large",
    },
    content: asset.caption ? [{ type: "text", text: asset.caption }] : [],
  };
}

const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function PostEditor({ id }: { id: string }) {
  const [post, setPost] = useState<StudioPostDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  // Permission context for gating, not display chrome. `can_review` is the
  // one that matters here: the review freeze on autosave is one-directional
  // (it blocks the submitter, not a reviewer who is allowed to edit a
  // pending_review post to fix something before approving it).
  const [me, setMe] = useState<StudioMe | null>(null);
  const [categories, setCategories] = useState<StudioCategoryT[]>([]);
  const [authors, setAuthors] = useState<StudioAuthorT[]>([]);

  // Explicit-commit state for the sidebar fields that are deliberately NOT
  // part of autosave (see Sidebar's onSlugCommit/onCategoriesCommit/
  // onFeaturedImageCommit docs): slug and featured image have no draft_*
  // shadow at all, and categories has no shadow M2M, so all three would
  // either be silently dropped by the autosave endpoint or never leave local
  // state if routed through the debounced payload instead.
  const [slugError, setSlugError] = useState("");
  const [slugIsAuto, setSlugIsAuto] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  // Mirrors the editor's current HTML into React state so it can flow into
  // the autosave payload. Kept in sync via the `onUpdate` callback wired into
  // `useEditor` below, including the initial `setContent` call once the post
  // loads (Tiptap 3's setContent emits update by default).
  const [html, setHtml] = useState("");

  // Tracks whether the picker was opened to insert a new image or to replace the image on an
  // already-selected figure node. Null = insert; a function = apply the chosen asset to that
  // node's attrs instead of inserting a new one. Plain state (not a ref) so it's never read
  // during someone else's render — see openPickerForReplace below, which is what the Figure
  // node-view extension is configured with.
  const [replaceTarget, setReplaceTarget] = useState<((asset: MediaAssetT) => void) | null>(null);

  const openPickerForInsert = useCallback(() => {
    setReplaceTarget(null);
    setPickerOpen(true);
  }, []);

  // Stable identity across renders — this gets baked into the Figure node-view extension once,
  // at editor-creation time, so it must not change on every render.
  const openPickerForReplace = useCallback((apply: (asset: MediaAssetT) => void) => {
    setReplaceTarget(() => apply);
    setPickerOpen(true);
  }, []);

  function closePicker() {
    setPickerOpen(false);
    setReplaceTarget(null);
  }

  function handleSelectAsset(asset: MediaAssetT) {
    if (replaceTarget) {
      replaceTarget(asset);
    } else {
      editor?.chain().focus().insertContent(figureNode(asset)).run();
    }
    setReplaceTarget(null);
  }

  async function insertUploadedFile(file: File, insert: (node: ReturnType<typeof figureNode>) => void) {
    try {
      const asset = await uploadImage(file);
      setUploadNotice("");
      insert(figureNode(asset));
    } catch (err) {
      // Same rule as the picker's own upload flow: surface the backend's message, don't mask it.
      setUploadNotice(err instanceof StudioError ? err.message : "Could not upload that image.");
    }
  }

  // `schema.ts` stays framework-agnostic (the Node round-trip script imports it from plain
  // Node), so the React node view is attached here by extending the imported Figure node rather
  // than editing schema.ts.
  const FigureWithView = useMemo(
    () =>
      Figure.extend({
        addOptions() {
          return { ...this.parent?.(), onReplace: undefined as ((apply: (asset: MediaAssetT) => void) => void) | undefined };
        },
        addNodeView() {
          return ReactNodeViewRenderer(FigureView);
        },
      }).configure({ onReplace: openPickerForReplace }),
    [openPickerForReplace],
  );

  const extensions = useMemo(
    () => [
      ...EDITOR_EXTENSIONS.map((ext) => (ext.name === "figure" ? FigureWithView : ext)),
      FileHandler.configure({
        allowedMimeTypes: ALLOWED_IMAGE_MIME,
        consumePasteEvent: true,
        onDrop: (currentEditor, files, pos) => {
          files.forEach((file) => {
            insertUploadedFile(file, (node) => currentEditor.chain().insertContentAt(pos, node).focus().run());
          });
        },
        onPaste: (currentEditor, files) => {
          files.forEach((file) => {
            insertUploadedFile(file, (node) => currentEditor.chain().focus().insertContent(node).run());
          });
        },
      }),
    ],
    [FigureWithView],
  );

  const editor = useEditor({
    extensions,
    content: "",
    immediatelyRender: false, // required in the App Router: avoids SSR hydration mismatch
    editorProps: { attributes: { class: "service-prose focus:outline-none min-h-[60vh]" } },
    onUpdate: ({ editor: e }) => setHtml(e.getHTML()),
  });

  useEffect(() => {
    let cancelled = false;
    studioFetch<StudioPostDetail>(`posts/${id}/`)
      .then((data) => {
        if (cancelled) return;
        // `post.<field>` is the working display value this editor reads and
        // writes (draft_* with live fallback — see toWorkingPost); the
        // autosave payload below maps it back onto `draft_<field>`.
        setPost(toWorkingPost(data));
        setSlugIsAuto(slugIsStillAuto(data));
        editor?.commands.setContent(data.draft_body || data.body || "<p></p>");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof StudioError ? err.message : "Could not load this post.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, editor]);

  // Permission + taxonomy data for the sidebar. Best-effort: a failure here
  // degrades the sidebar (empty category list, "Unassigned" author, autosave
  // staying conservative about pending_review) rather than blocking the post
  // from loading at all.
  useEffect(() => {
    let cancelled = false;
    studioFetch<StudioMe>("me/")
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {});
    studioFetch<{ results: StudioCategoryT[] }>("categories/?page_size=100")
      .then((data) => {
        if (!cancelled) setCategories(data.results);
      })
      .catch(() => {});
    studioFetch<{ results: StudioAuthorT[] }>("authors/?page_size=100")
      .then((data) => {
        if (!cancelled) setAuthors(data.results);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Merges into the in-memory working post — this is what feeds the
  // draft_* keys in the autosave payload below. Never sends anything to the
  // API by itself.
  const updateDraft = useCallback((patch: Partial<StudioPostDetail>) => {
    setPost((p) => (p ? { ...p, ...patch } : p));
  }, []);

  // Explicit PATCH posts/:id/ for the fields autosave deliberately excludes.
  // Only merges the specific keys the caller asks for back from the server
  // response — NOT the whole object — so an in-flight edit to some other
  // field (e.g. typing in the meta description while a category checkbox is
  // toggled) can't be clobbered by a stale snapshot of a field nobody
  // touched. updated_at always advances, so the next autosave tick's
  // expected_updated_at check stays correct.
  const commitFields = useCallback(
    async <K extends keyof StudioPostDetail>(patch: Record<string, unknown>, keys: K[]) => {
      const updated = await studioFetch<StudioPostDetail>(`posts/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setPost((p) => {
        if (!p) return p;
        const next = { ...p, updated_at: updated.updated_at } as Record<string, unknown>;
        for (const k of keys) next[k as string] = updated[k];
        return next as StudioPostDetail;
      });
    },
    [id],
  );

  const commitSlug = useCallback(
    async (slug: string) => {
      setSlugError("");
      try {
        await commitFields({ slug }, ["slug"]);
      } catch (err) {
        setSlugError(err instanceof StudioError ? err.message : "Could not update the slug.");
      }
    },
    [commitFields],
  );

  // Sidebar edits come through here so a hand-set slug stops auto-following
  // the title from then on.
  const commitSlugManually = useCallback(
    (slug: string) => {
      setSlugIsAuto(false);
      return commitSlug(slug);
    },
    [commitSlug],
  );

  // WordPress-style: until first publish, the URL slug follows the title.
  // Runs on title blur (not per keystroke — each commit is a server PATCH).
  const syncSlugFromTitle = useCallback(() => {
    if (!post || !slugIsAuto || post.first_published_at) return;
    const next = slugify(post.title);
    if (next && next !== post.slug) void commitSlug(next);
  }, [post, slugIsAuto, commitSlug]);

  const commitCategories = useCallback(
    async (ids: number[]) => {
      setCategoriesError("");
      try {
        await commitFields({ category_ids: ids }, ["categories"]);
      } catch (err) {
        setCategoriesError(err instanceof StudioError ? err.message : "Could not update categories.");
      }
    },
    [commitFields],
  );

  const commitFeaturedImage = useCallback(
    async (asset: MediaAssetT | null) => {
      setImageError("");
      setImageBusy(true);
      try {
        await commitFields({ featured_image_id: asset?.id ?? null }, ["featured_image"]);
      } catch (err) {
        setImageError(err instanceof StudioError ? err.message : "Could not update the featured image.");
      } finally {
        setImageBusy(false);
      }
    },
    [commitFields],
  );

  // ---- Workflow (Task 10): submit/withdraw/request-changes/publish/
  // unpublish/discard, all owned here next to the post state they mutate. ----
  const [publishOpen, setPublishOpen] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState("");

  // submit/withdraw/request-changes/unpublish return only `{status}` — but
  // every one of them post.save()s server-side, which bumps the auto_now
  // updated_at. Without refetching, the next autosave would send the OLD
  // expected_updated_at and get a spurious stale-write "reload" prompt right
  // after a successful action. Refetch and merge ONLY the workflow-owned
  // fields — never the working text fields, which may hold in-flight edits.
  const refreshWorkflowMeta = useCallback(async () => {
    const data = await studioFetch<StudioPostDetail>(`posts/${id}/`);
    setPost((p) =>
      p
        ? {
            ...p,
            status: data.status,
            review_note: data.review_note,
            updated_at: data.updated_at,
            published_at: data.published_at,
            first_published_at: data.first_published_at,
            has_pending_changes: data.has_pending_changes,
            medically_reviewed_by: data.medically_reviewed_by,
            medically_reviewed_at: data.medically_reviewed_at,
          }
        : p,
    );
  }, [id]);

  const runWorkflow = useCallback(async (name: string, run: () => Promise<void>) => {
    setWorkflowBusy(name);
    setWorkflowError("");
    try {
      await run();
    } catch (err) {
      // Server messages are written for staff ("Tell the author what needs
      // changing.", "This post is live…use 'Unpublish'") — show them verbatim.
      setWorkflowError(
        err instanceof StudioError ? err.message : "Something went wrong — check your connection and try again.",
      );
    } finally {
      setWorkflowBusy(null);
    }
  }, []);

  // Autosave owns the draft_* shadow fields this editor exposes (title, body,
  // tags, and the SEO/social fields). Only `draft_*` keys are sent — the live
  // fields are never touched here, which is what keeps autosaving a published
  // post safe: the publish action is the only thing that promotes draft_*
  // onto the live columns. `excerpt` has a draft_excerpt shadow too but this
  // task doesn't expose a UI field for it, so it's intentionally left out of
  // the payload rather than resent unedited on every save.
  //
  // The `enabled` gate is one-directional on purpose: the review freeze
  // (403 while pending_review) blocks the *submitter*, but a reviewer with
  // review_blogpost is explicitly allowed to edit a post that's in review —
  // e.g. a clinician editor fixing a factual error before approving it. Without
  // `can_review` here, that edit would sit unsaved for the entire review
  // (pinned finding from Task 7's autosave work).
  const autosave = useAutosave({
    id,
    enabled: Boolean(post) && (post?.status !== "pending_review" || Boolean(me?.can_review)),
    expectedUpdatedAt: post?.updated_at ?? null,
    payload: {
      draft_title: post?.title ?? "",
      draft_body: html,
      draft_tags: post?.tags ?? [],
      draft_meta_title: post?.meta_title ?? "",
      draft_meta_description: post?.meta_description ?? "",
      draft_focus_keyword: post?.focus_keyword ?? "",
      draft_og_title: post?.og_title ?? "",
      draft_og_description: post?.og_description ?? "",
    },
    onSaved: (updatedAt) =>
      setPost((p) =>
        p
          ? {
              ...p,
              updated_at: updatedAt,
              // The server recomputes has_pending_changes on every draft save,
              // but the autosave response doesn't include it — mirror it
              // locally for the statuses where "your edits aren't live yet"
              // matters, so the sidebar's unsaved-to-live block appears as soon
              // as a live post is edited, not only after a full reload.
              has_pending_changes:
                p.status === "published" || p.status === "scheduled" ? true : p.has_pending_changes,
            }
          : p,
      ),
  });

  const submitForReview = useCallback(
    () =>
      runWorkflow("submit", async () => {
        // Flush the debounce first so the reviewer reads the words as they are
        // on screen, not as of 2 seconds ago. saveNow never throws (it reports
        // through the save-status chip); if it failed, submit still proceeds
        // with the last content the server has — the reviewer sees THAT, which
        // is at least an honest snapshot.
        await autosave.saveNow();
        await studioFetch(`posts/${id}/submit/`, { method: "POST" });
        await refreshWorkflowMeta();
      }),
    [runWorkflow, autosave, id, refreshWorkflowMeta],
  );

  const withdrawFromReview = useCallback(
    () =>
      runWorkflow("withdraw", async () => {
        await studioFetch(`posts/${id}/withdraw/`, { method: "POST" });
        await refreshWorkflowMeta();
      }),
    [runWorkflow, id, refreshWorkflowMeta],
  );

  const requestChanges = useCallback(
    (note: string) =>
      runWorkflow("request-changes", async () => {
        // No client-side "note required" gate: the server validates (400 with
        // "Tell the author what needs changing.") and that message is surfaced
        // verbatim — one source of truth for what counts as a usable note.
        await studioFetch(`posts/${id}/request-changes/`, {
          method: "POST",
          body: JSON.stringify({ note }),
        });
        await refreshWorkflowMeta();
      }),
    [runWorkflow, id, refreshWorkflowMeta],
  );

  const unpublish = useCallback(
    () =>
      runWorkflow("unpublish", async () => {
        await studioFetch(`posts/${id}/unpublish/`, { method: "POST" });
        await refreshWorkflowMeta();
      }),
    [runWorkflow, id, refreshWorkflowMeta],
  );

  // POST discard/ — the backend restores every draft_* column from its live
  // twin (the only way back to the published text once autosave has
  // overwritten a draft). The editor canvas must then be reset to the restored
  // body: setContent emits an update, so `html` and the autosave payload
  // re-sync automatically.
  const discardEdits = useCallback(
    () =>
      runWorkflow("discard", async () => {
        const data = await studioFetch<StudioPostDetail>(`posts/${id}/discard/`, { method: "POST" });
        setPost(toWorkingPost(data));
        editor?.commands.setContent(data.draft_body || data.body || "<p></p>");
        // The content swap above is server state, not an edit — without this,
        // autosave would treat it as dirty, fire an echo-PATCH, and falsely
        // re-flag "unsaved-to-live edits" right after the user discarded them.
        autosave.markClean();
      }),
    [runWorkflow, id, editor, autosave],
  );

  // Flush the debounce BEFORE showing the dialog, so what the checklist and
  // the eventual promote both operate on is what's on screen right now. The
  // fresh updated_at lands in post state via onSaved, and the dialog reads
  // `post` live from state — so its expected_updated_at is current by the
  // time anyone can click Publish.
  const openPublishDialog = useCallback(
    () =>
      runWorkflow("open-publish", async () => {
        await autosave.saveNow();
        setPublishOpen(true);
      }),
    [runWorkflow, autosave],
  );

  const handlePublished = useCallback((data: StudioPostDetail) => {
    // Full detail response: after a publish, draft_* equals live, so the
    // working-value mapping is a clean refresh of status/published_at/
    // medically_reviewed_*/updated_at without touching the editor canvas.
    setPost(toWorkingPost(data));
    // First publish locks the slug (SEO) — the title stops driving it.
    setSlugIsAuto(false);
  }, []);

  if (loadError) {
    return (
      <p role="alert" className="p-8 text-red-600">
        {loadError}
      </p>
    );
  }

  if (!post) return <p className="p-8 text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/studio"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 transition-colors hover:text-brand-700"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All posts
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        {tab === "edit" ? (
          <input
            value={post.title}
            onChange={(e) => setPost({ ...post, title: e.target.value })}
            onBlur={syncSlugFromTitle}
            placeholder="Enter your blog post title here"
            className="min-w-0 flex-1 border-0 font-display text-3xl font-semibold outline-none placeholder:text-neutral-300"
          />
        ) : (
          <h1 className="font-display text-2xl font-semibold text-ink-900">Preview</h1>
        )}

        <div role="tablist" aria-label="Editor view" className="flex gap-1 rounded-lg border border-ink-900/12 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "edit"}
            onClick={() => setTab("edit")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "edit" ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-neutral-100"
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "preview"}
            onClick={() => setTab("preview")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "preview" ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-neutral-100"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      <ReviewBanner
        post={post}
        me={me}
        onWithdraw={withdrawFromReview}
        withdrawBusy={workflowBusy === "withdraw"}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {/* The edit canvas stays mounted (just hidden) rather than being
              unmounted on the Preview tab, so switching tabs can never
              re-initialize the Tiptap editor or disturb its undo history /
              in-flight autosave debounce. */}
          <div className={tab === "edit" ? "rounded-2xl border border-ink-900/8 bg-white" : "hidden"}>
            <Toolbar
              editor={editor}
              onInsertImage={openPickerForInsert}
              status={
                <SaveStatus
                  state={autosave.state}
                  lastSavedAt={autosave.lastSavedAt}
                  error={autosave.error}
                  onRetry={autosave.saveNow}
                />
              }
            />
            {uploadNotice && (
              <p role="alert" className="border-b border-ink-900/8 bg-red-50 px-4 py-2 text-sm text-red-600">
                {uploadNotice}
              </p>
            )}
            <div className="p-6">
              <EditorContent editor={editor} />
            </div>
          </div>

          {tab === "preview" && (
            <div className="rounded-2xl border border-ink-900/8 bg-white p-6 sm:p-10">
              <Preview post={post} html={html} />
            </div>
          )}
        </div>

        <Sidebar
          post={post}
          categories={categories}
          authors={authors}
          onDraftChange={updateDraft}
          onSlugCommit={commitSlugManually}
          onCategoriesCommit={commitCategories}
          onFeaturedImageCommit={commitFeaturedImage}
          workflow={{
            me,
            busy: workflowBusy,
            error: workflowError,
            onSaveDraft: autosave.saveNow,
            onSubmit: submitForReview,
            onWithdraw: withdrawFromReview,
            onPublish: openPublishDialog,
            onRequestChanges: requestChanges,
            onUnpublish: unpublish,
            onDiscard: discardEdits,
          }}
          slugError={slugError}
          categoriesError={categoriesError}
          imageError={imageError}
          imageBusy={imageBusy}
        />
      </div>

      <MediaPicker open={pickerOpen} onClose={closePicker} onSelect={handleSelectAsset} />

      {me && (
        <PublishDialog
          post={post}
          me={me}
          html={html}
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          onPublished={handlePublished}
        />
      )}
    </div>
  );
}
