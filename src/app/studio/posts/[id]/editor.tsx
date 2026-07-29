"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import FileHandler from "@tiptap/extension-file-handler";
import { EDITOR_EXTENSIONS, Figure } from "@/lib/editor/schema";
import { studioFetch, uploadImage, StudioError } from "@/lib/studio/client";
import type { StudioPostDetail, MediaAssetT } from "@/lib/studio/types";
import { Toolbar } from "@/components/studio/toolbar";
import { MediaPicker } from "@/components/studio/media-picker";
import { FigureView } from "@/components/studio/figure-view";

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
  });

  useEffect(() => {
    let cancelled = false;
    studioFetch<StudioPostDetail>(`posts/${id}/`)
      .then((data) => {
        if (cancelled) return;
        setPost(data);
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

  if (loadError) {
    return (
      <p role="alert" className="p-8 text-red-600">
        {loadError}
      </p>
    );
  }

  if (!post) return <p className="p-8 text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <input
        value={post.title}
        onChange={(e) => setPost({ ...post, title: e.target.value })}
        placeholder="Post title"
        className="w-full border-0 font-display text-3xl font-semibold outline-none placeholder:text-neutral-300"
      />
      <div className="mt-6 rounded-2xl border border-ink-900/8 bg-white">
        <Toolbar editor={editor} onInsertImage={openPickerForInsert} />
        {uploadNotice && (
          <p role="alert" className="border-b border-ink-900/8 bg-red-50 px-4 py-2 text-sm text-red-600">
            {uploadNotice}
          </p>
        )}
        <div className="p-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      <MediaPicker open={pickerOpen} onClose={closePicker} onSelect={handleSelectAsset} />
    </div>
  );
}
