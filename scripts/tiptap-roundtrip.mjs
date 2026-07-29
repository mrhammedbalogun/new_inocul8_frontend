// Pushes all 70 legacy post bodies through the Tiptap schema and reports:
//   - dom-changed: posts whose raw (normalised) DOM differs before vs after. Expected to be
//     nonzero — Tiptap/ProseMirror applies well-understood, non-lossy transformations on every
//     parse (see docs/tiptap-roundtrip-report.md "Analysis of changes"). This count alone does
//     NOT fail the script.
//   - text-loss / link-loss: the actual safety gate. Compares normalised plain text (tags
//     stripped, HTML entities decoded, whitespace collapsed) and the *set* of href values
//     (entity-decoded) before vs after, independent of markup shape. Any post that loses text
//     content or a link is a hard failure — this is the guarantee the backend nh3 allowlist is
//     built on, so it must be a committed, re-runnable check, not ad-hoc analysis.
// Run before freezing the backend nh3 allowlist, and any time EDITOR_EXTENSIONS changes.
import { writeFileSync } from "node:fs";
import posts from "../src/lib/data/blog-posts.json" with { type: "json" };
import { htmlRoundTrip } from "../src/lib/editor/schema.ts";

const norm = (h) =>
  h
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();

// Decode the handful of entities Tiptap's serializer (and the legacy source dump) actually use,
// so a naive string compare doesn't cry wolf over e.g. "&" being correctly re-encoded "&amp;".
const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

// Only block-level tags (and <br>) represent a real content break in rendered output — an
// inline run split across adjacent tags (e.g. two back-to-back <a> spans with the same href,
// which Tiptap merges into one on round-trip) renders with no gap between them. Replacing every
// tag indiscriminately with a space would insert a space that was never actually rendered, then
// "lose" it the moment Tiptap merges adjacent inline runs — a false positive, not real loss.
const BLOCK_BOUNDARY =
  /<\/?(p|h1|h2|h3|h4|h5|h6|li|ul|ol|blockquote|div|figure|figcaption|pre|hr|br)(\s[^>]*)?>/gi;

const NBSP = String.fromCharCode(160);

const textOnly = (h) =>
  decodeEntities(
    h
      .replace(BLOCK_BOUNDARY, " ") // real content breaks: paragraphs, list items, headings...
      .replace(/<[^>]+>/g, "") // remaining (inline) tags — no rendered gap, strip clean
  )
    .split(NBSP)
    .join(" ") // literal NBSP chars in the source dump, not yet entities
    .replace(/\s+/g, " ")
    .trim();

const hrefSet = (h) => {
  const set = new Set();
  const re = /<a\s+[^>]*href="([^"]*)"/g;
  let m;
  while ((m = re.exec(h))) set.add(decodeEntities(m[1]));
  return set;
};

const changed = [];
const textLoss = [];
const linkLoss = [];

for (const p of posts) {
  const after = htmlRoundTrip(p.html);

  if (norm(p.html) !== norm(after)) changed.push({ slug: p.slug, before: p.html, after });

  if (textOnly(p.html) !== textOnly(after)) textLoss.push(p.slug);

  const before = hrefSet(p.html);
  const afterHrefs = hrefSet(after);
  const missing = [...before].filter((href) => !afterHrefs.has(href));
  if (missing.length > 0) linkLoss.push({ slug: p.slug, missing });
}

const lines = [
  "# Tiptap round-trip report",
  "",
  `Posts checked: **${posts.length}** · DOM-changed: **${changed.length}** · ` +
    `Text-loss: **${textLoss.length}** · Link-loss: **${linkLoss.length}**`,
  "",
];

if (textLoss.length > 0) {
  lines.push(
    "## Text-loss failures",
    "",
    "Posts where round-tripped plain text (tags stripped, entities decoded) differs from the source:",
    ""
  );
  for (const slug of textLoss) lines.push(`- ${slug}`);
  lines.push("");
} else {
  lines.push("## Text-loss failures", "", "None — zero posts lost text content.", "");
}

if (linkLoss.length > 0) {
  lines.push("## Link-loss failures", "", "Posts where an href present before is missing from the href set after:", "");
  for (const l of linkLoss) lines.push(`- ${l.slug}: missing ${JSON.stringify(l.missing)}`);
  lines.push("");
} else {
  lines.push("## Link-loss failures", "", "None — zero posts lost a link.", "");
}

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
console.log(
  `checked ${posts.length}, dom-changed ${changed.length}, text-loss ${textLoss.length}, link-loss ${linkLoss.length}`
);
// dom-changed alone is expected and does NOT fail the script — only real content/link loss does.
process.exit(textLoss.length === 0 && linkLoss.length === 0 ? 0 : 1);
