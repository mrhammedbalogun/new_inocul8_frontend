"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote,
  Minus, Link2, Image as ImageIcon, Info, Code,
} from "lucide-react";

type Props = { editor: Editor | null; onInsertImage: () => void; status?: React.ReactNode };

export function Toolbar({ editor, onInsertImage, status }: Props) {
  if (!editor) return null;

  const btn = (active: boolean) =>
    `grid size-9 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
      active ? "bg-brand-100 text-brand-700" : "text-ink-700 hover:bg-neutral-100"
    }`;

  function setLink() {
    const previous = editor!.getAttributes("link").href ?? "";
    const url = window.prompt("Link URL", previous);
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-ink-900/8 bg-white/95 px-3 py-2 backdrop-blur">
      {[2, 3, 4].map((level) => (
        <button
          key={level}
          type="button"
          title={`Heading ${level}`}
          aria-label={`Heading ${level}`}
          aria-pressed={editor.isActive("heading", { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level: level as 2 | 3 | 4 }).run()}
          className={btn(editor.isActive("heading", { level }))}
        >
          <span className="text-sm font-semibold">H{level}</span>
        </button>
      ))}
      <span className="mx-1 h-6 w-px bg-ink-900/10" />

      <button
        type="button"
        title="Bold"
        aria-label="Bold"
        aria-pressed={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
      >
        <Bold className="size-4" />
      </button>
      <button
        type="button"
        title="Italic"
        aria-label="Italic"
        aria-pressed={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
      >
        <Italic className="size-4" />
      </button>
      <button
        type="button"
        title="Underline"
        aria-label="Underline"
        aria-pressed={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btn(editor.isActive("underline"))}
      >
        <Underline className="size-4" />
      </button>
      <button
        type="button"
        title="Strikethrough"
        aria-label="Strikethrough"
        aria-pressed={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive("strike"))}
      >
        <Strikethrough className="size-4" />
      </button>
      <span className="mx-1 h-6 w-px bg-ink-900/10" />

      <button
        type="button"
        title="Bullet list"
        aria-label="Bullet list"
        aria-pressed={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}
      >
        <List className="size-4" />
      </button>
      <button
        type="button"
        title="Numbered list"
        aria-label="Numbered list"
        aria-pressed={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}
      >
        <ListOrdered className="size-4" />
      </button>
      <button
        type="button"
        title="Quote"
        aria-label="Quote"
        aria-pressed={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btn(editor.isActive("blockquote"))}
      >
        <Quote className="size-4" />
      </button>
      <button
        type="button"
        title="Divider"
        aria-label="Insert divider"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btn(false)}
      >
        <Minus className="size-4" />
      </button>
      <span className="mx-1 h-6 w-px bg-ink-900/10" />

      <button
        type="button"
        title="Link"
        aria-label="Link"
        aria-pressed={editor.isActive("link")}
        onClick={setLink}
        className={btn(editor.isActive("link"))}
      >
        <Link2 className="size-4" />
      </button>
      <button
        type="button"
        title="Insert image"
        aria-label="Insert image"
        onClick={onInsertImage}
        className={btn(false)}
      >
        <ImageIcon className="size-4" />
      </button>
      <button
        type="button"
        title="Callout"
        aria-label="Callout"
        aria-pressed={editor.isActive("callout")}
        onClick={() => editor.chain().focus().toggleWrap("callout", { variant: "info" }).run()}
        className={btn(editor.isActive("callout"))}
      >
        <Info className="size-4" />
      </button>
      <button
        type="button"
        title="Code block"
        aria-label="Code block"
        aria-pressed={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btn(editor.isActive("codeBlock"))}
      >
        <Code className="size-4" />
      </button>
      {status && <span className="ml-auto pl-2">{status}</span>}
    </div>
  );
}
