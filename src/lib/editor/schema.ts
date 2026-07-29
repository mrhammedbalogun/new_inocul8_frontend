// Single source of truth for the blog document schema. Imported by the studio
// editor (browser) and by scripts/tiptap-roundtrip.mjs (node), so the HTML the
// editor emits is always exactly the HTML we verify and sanitize against.
//
// IMPORTANT: this module must stay loadable from plain Node (no React / next/*
// imports) — a later task attaches the React node-view by extending these
// nodes inside the editor component instead of importing React here.
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Node, mergeAttributes } from "@tiptap/core";
import { generateHTML, generateJSON } from "@tiptap/html";

/** <figure class="align-* size-*"><img><figcaption></figcaption></figure> */
export const Figure = Node.create({
  name: "figure",
  group: "block",
  content: "inline*",
  draggable: true,
  isolating: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      width: { default: null },
      height: { default: null },
      align: { default: "center" }, // left | center | right | full
      size: { default: "large" }, // small | medium | large | original
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure",
        contentElement: "figcaption",
        getAttrs: (el) => {
          const img = (el as HTMLElement).querySelector("img");
          if (!img) return false;
          const cls = (el as HTMLElement).getAttribute("class") ?? "";
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") ?? "",
            width: img.getAttribute("width"),
            height: img.getAttribute("height"),
            align: (cls.match(/align-(\w+)/) ?? [, "center"])[1],
            size: (cls.match(/size-(\w+)/) ?? [, "large"])[1],
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { src, alt, width, height, align, size } = HTMLAttributes;
    return [
      "figure",
      { class: `align-${align} size-${size}` },
      ["img", mergeAttributes({ src, alt, width, height, loading: "lazy" })],
      ["figcaption", 0],
    ];
  },
});

/** <div class="callout callout-info">…</div> */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { variant: { default: "info" } }; // info | warning | tip
  },
  parseHTML() {
    return [
      {
        tag: "div.callout",
        getAttrs: (el) => ({
          variant: ((el as HTMLElement).getAttribute("class")?.match(/callout-(\w+)/) ?? [, "info"])[1],
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { class: `callout callout-${HTMLAttributes.variant}` }, 0];
  },
});

export const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] }, // no h1 — the page template owns the sole h1
    link: { openOnClick: false, HTMLAttributes: { rel: "noopener" } },
  }),
  Image,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Figure,
  Callout,
];

/** Parse HTML into the schema and serialize it back — the migration-safety check. */
export function htmlRoundTrip(html: string): string {
  return generateHTML(generateJSON(html, EDITOR_EXTENSIONS), EDITOR_EXTENSIONS);
}
