// Pushes all 70 legacy post bodies through the Tiptap schema and reports any
// post whose DOM changes. Run before freezing the backend nh3 allowlist.
import { writeFileSync } from "node:fs";
import posts from "../src/lib/data/blog-posts.json" with { type: "json" };
import { htmlRoundTrip } from "../src/lib/editor/schema.ts";

const norm = (h) =>
  h
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();

const changed = [];
for (const p of posts) {
  const after = htmlRoundTrip(p.html);
  if (norm(p.html) !== norm(after)) changed.push({ slug: p.slug, before: p.html, after });
}

const lines = [
  "# Tiptap round-trip report",
  "",
  `Posts checked: **${posts.length}** · Changed: **${changed.length}**`,
  "",
];
for (const c of changed) {
  lines.push(
    `## ${c.slug}`,
    "",
    "```html",
    c.before.slice(0, 1500),
    "```",
    "",
    "```html",
    c.after.slice(0, 1500),
    "```",
    ""
  );
}
writeFileSync(new URL("../docs/tiptap-roundtrip-report.md", import.meta.url), lines.join("\n"));
console.log(`checked ${posts.length}, changed ${changed.length}`);
process.exit(changed.length === 0 ? 0 : 1);
