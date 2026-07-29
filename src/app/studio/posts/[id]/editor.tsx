"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { EDITOR_EXTENSIONS } from "@/lib/editor/schema";
import { studioFetch, StudioError } from "@/lib/studio/client";
import type { StudioPostDetail } from "@/lib/studio/types";
import { Toolbar } from "@/components/studio/toolbar";

export function PostEditor({ id }: { id: string }) {
  const [post, setPost] = useState<StudioPostDetail | null>(null);
  const [loadError, setLoadError] = useState("");

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Toolbar editor={editor} onInsertImage={() => {}} />
        <div className="p-6">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
