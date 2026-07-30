"use client";

import { useState } from "react";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import type { MediaAssetT } from "@/lib/studio/types";

const ALIGN_OPTIONS: { value: string; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "full", label: "Full width" },
];

const SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "original", label: "Original" },
];

// The `align-*`/`size-*` classes stamped onto the <figure> by schema.ts's renderHTML are the
// serialized, semantic markers (for the public-site renderer to style later) — they carry no
// layout on their own. These Tailwind utility classes are what actually make the controls
// visibly do something inside the studio editor itself.
function sizeClass(size: string) {
  switch (size) {
    case "small":
      return "max-w-[240px]";
    case "medium":
      return "max-w-[480px]";
    case "original":
      return "max-w-full";
    case "large":
    default:
      return "max-w-[720px]";
  }
}

function alignClass(align: string) {
  switch (align) {
    case "left":
      return "mr-auto ml-0";
    case "right":
      return "ml-auto mr-0";
    case "full":
      return "w-full max-w-none mx-0";
    case "center":
    default:
      return "mx-auto";
  }
}

// Attached to the `Figure` node (imported from src/lib/editor/schema.ts, which must stay
// React-free) via `Figure.extend({ addNodeView: () => ReactNodeViewRenderer(FigureView) })` in
// editor.tsx — never edit schema.ts to add this.
export function FigureView({ node, updateAttributes, deleteNode, selected, extension, editor, getPos }: NodeViewProps) {
  const [captionFocused, setCaptionFocused] = useState(false);
  const { src, alt, width, height, align, size } = node.attrs as {
    src: string;
    alt: string;
    width: number | string | null;
    height: number | string | null;
    align: string;
    size: string;
  };

  const hasCaption = node.textContent.trim().length > 0;
  const isFull = align === "full";

  // ProseMirror's default click-to-select only auto-creates a NodeSelection for *atom* (leaf)
  // nodes. Figure has content (the caption), so a click on the image — which sits outside
  // contentDOM — would otherwise just drop the cursor into the nearest editable text instead of
  // selecting the figure, and the alignment/size/replace/remove toolbar (gated on `selected`)
  // would never appear. Select it explicitly.
  function selectThisNode() {
    const pos = getPos();
    if (typeof pos === "number") editor.commands.setNodeSelection(pos);
  }

  // updateAttributes() dispatches via `tr.setNodeMarkup`, which structurally replaces the node
  // (attrs-only or not). ProseMirror maps the prior NodeSelection through that step, but a
  // markup replacement reports the old node position as "deleted" in the mapping, so the mapped
  // selection falls back to the nearest valid selection near that position — for a node with
  // text content (the caption) that's a plain cursor, not a NodeSelection. Without reselecting,
  // every click on an align/size control would immediately hide this toolbar again, making it
  // impossible to click a second control without re-selecting the image first.
  function updateAndReselect(attrs: Record<string, unknown>) {
    updateAttributes(attrs);
    selectThisNode();
  }

  function replace() {
    const onReplace = extension.options.onReplace as
      | ((apply: (asset: MediaAssetT) => void) => void)
      | undefined;
    onReplace?.((asset) => {
      // Width/height must always come from the MediaAsset record, never left stale from the
      // previous image — that pairing is what keeps the stamped <img> dimensions accurate for
      // CLS prevention.
      updateAttributes({ src: asset.url, alt: asset.alt_text, width: asset.width, height: asset.height });
    });
  }

  return (
    <NodeViewWrapper
      as="figure"
      className={`figure-node group relative my-4 align-${align} size-${size} ${
        isFull ? "w-full max-w-none mx-0" : `${sizeClass(size)} ${alignClass(align)}`
      } ${selected ? "rounded-lg ring-2 ring-brand-600 ring-offset-2" : ""}`}
      data-drag-handle
    >
      {selected && (
        <div
          role="toolbar"
          aria-label="Image settings"
          contentEditable={false}
          // mousedown (not click) is where a plain <button> steals DOM focus from the
          // ProseMirror contentEditable root — that focus loss is what was collapsing the
          // NodeSelection (and hiding this toolbar) after every single click, before the button's
          // own onClick could even run. preventDefault on mousedown keeps focus — and the
          // selection — right where it is, letting the click still fire normally.
          onMouseDown={(e) => e.preventDefault()}
          className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-ink-900/10 bg-white p-1 shadow-sm"
        >
          <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted">Align</span>
          {ALIGN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-label={`Align ${opt.label.toLowerCase()}`}
              aria-pressed={align === opt.value}
              onClick={() => updateAndReselect({ align: opt.value })}
              className={`rounded px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                align === opt.value ? "bg-brand-100 text-brand-700" : "text-ink-700 hover:bg-neutral-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-ink-900/10" />
          <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted">Size</span>
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-label={`${opt.label} size`}
              aria-pressed={size === opt.value}
              onClick={() => updateAndReselect({ size: opt.value })}
              className={`rounded px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                size === opt.value ? "bg-brand-100 text-brand-700" : "text-ink-700 hover:bg-neutral-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-ink-900/10" />
          <button
            type="button"
            aria-label="Replace image"
            onClick={replace}
            className="rounded px-2 py-1 text-xs font-medium text-ink-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Replace
          </button>
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => deleteNode()}
            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Remove
          </button>
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width ?? undefined}
        height={height ?? undefined}
        loading="lazy"
        contentEditable={false}
        onClick={selectThisNode}
        className="cursor-pointer rounded-lg"
      />

      {/*
        figcaption is a real element wrapping the content DOM (rather than passed as
        NodeViewContent's `as`) because @tiptap/react's NodeViewContent<T> uses NoInfer<T> on
        its `as` prop, which blocks TypeScript from inferring anything but "div" from JSX.
      */}
      <figcaption className="relative mt-2">
        {!hasCaption && !captionFocused && (
          <span className="pointer-events-none absolute inset-0 text-center text-sm text-neutral-400" aria-hidden="true">
            Add a caption (optional)
          </span>
        )}
        <NodeViewContent
          onFocus={() => setCaptionFocused(true)}
          onBlur={() => setCaptionFocused(false)}
          className="relative min-h-[1.5em] text-center text-sm text-ink-700 outline-none"
        />
      </figcaption>
    </NodeViewWrapper>
  );
}
