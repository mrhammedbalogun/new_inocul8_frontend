# Tiptap round-trip report — curated analysis

**This file is hand-maintained. `scripts/tiptap-roundtrip.mjs` never writes to it.** Raw,
regenerable output (pass/fail counts, per-post diffs) lives in
[`docs/tiptap-roundtrip-generated.md`](./tiptap-roundtrip-generated.md), which the script
rewrites on every run — do not put curated judgement there, it will be silently destroyed the
next time someone runs the verification.

Run the check with `node --experimental-strip-types scripts/tiptap-roundtrip.mjs`. As of the
last run: `checked 70, dom-changed 68, text-loss 0, link-loss 0` (exit 0). Re-run it and check
[`tiptap-roundtrip-generated.md`](./tiptap-roundtrip-generated.md) for the current numbers — they
are not duplicated here because a stale copy in a hand-maintained file is worse than no copy.

## Analysis of changes (approved)

`text-loss` and `link-loss` in the generated report are not ad-hoc analysis — they're committed,
re-runnable assertions in `scripts/tiptap-roundtrip.mjs`, and the script **exits non-zero if
either is greater than zero**. `dom-changed` alone does not fail the script; only real text or
link loss does. This is the safety net the 68/70 `dom-changed` rate is accepted against: it's not
a claim anyone has to take on faith or re-derive by hand, it re-verifies itself every run,
including automatically if `EDITOR_EXTENSIONS` changes later.

**Revision note — `target="_blank"` removed:** an earlier revision of this report flagged
`target="_blank" rel="noopener"` on every `<a>` as an *approved cosmetic difference*. That was
wrong — the live corpus has **no** `target` attribute today, so emitting one is a real behaviour
change to 70 ranked pages, and it directly disagreed with the backend nh3 allowlist
(`"a": {"href", "title", "rel"}` — no `target`). Fixed by setting
`link: { HTMLAttributes: { rel: "noopener", target: null } }` in `EDITOR_EXTENSIONS`
(`src/lib/editor/schema.ts`). Verified: `target=` does not appear anywhere in the generated
report's output.

**A note on the text-loss check's own correctness:** the first version of this check flagged 2
false positives (`hpv-vaccine-dose-schedule-modified-part-2`,
`hepatitis-b-cost-to-treat-in-nigeria`) because it stripped every HTML tag — including inline
ones — to a single space. Two adjacent `<a>` tags with the same `href` and no whitespace between
them (e.g. `<a href="X">guidance</a><a href="X">. </a>`) render with no gap, but the naive
stripper inserted one anyway; when Tiptap correctly merges those adjacent identical-mark spans
into a single tag, the spurious space vanished and looked like lost text. Fixed by only treating
block-level tags (`p`, headings, `li`, `ul`/`ol`, `blockquote`, `div`, `figure`/`figcaption`,
`pre`, `hr`, `br`) as real content breaks; inline tags are stripped with no inserted space. This
was regression-tested against both a synthetic dropped-paragraph case (correctly still flagged as
loss) and a synthetic no-whitespace inline-boundary case (correctly not flagged) before being
committed — see the "Post-review fix report (round 2)" in the task report for the full
before/after.

Every one of the 68 `dom-changed` posts was inspected the same way: diffing plain text content
and the set of `href`s before/after (with HTML entities decoded), independent of markup shape.
All differences decompose into four well-understood, non-lossy transformations that
Tiptap/ProseMirror applies on every parse. They are approved — no further `EDITOR_EXTENSIONS`
change is needed for them.

1. **List item text is wrapped in `<p>`.** `<li>Fatigue</li>` becomes `<li><p>Fatigue</p></li>`.
   This is StarterKit's stock `ListItem` schema (`content: "paragraph block*"`) — every Tiptap
   document with lists does this; there is no content loss and no visible rendering change
   (`<p>` inside `<li>` is still just a block). Not configurable without restricting list items
   to inline-only content, which would be a *regression* (blocks multi-paragraph list items).
   (Note for a later task: the frontend's `.service-prose li > p` margin-collapse handling is
   already tracked in that task's own plan — not addressed here.)

2. **Literal `&` and non-breaking-space (U+00A0) characters are re-serialized as HTML entities**
   (`&amp;`, `&nbsp;`). The source dump has raw literal characters where spec-compliant HTML
   requires the entity form; the round-trip output is the *more correct* HTML, not different
   content. Same for `&` appearing inside `href` query strings (e.g.
   `...pone.0068329&utm` → `...pone.0068329&amp;utm`).

3. **Mark order is canonicalized.** `<strong><a href="…">text</a></strong>` and
   `<a href="…"><strong>text</strong></a>` render identically; ProseMirror always serializes
   marks in extension-registration order rather than preserving the source nesting order.

4. **Adjacent, identically-marked inline runs are merged.** Two back-to-back `<a>` tags with the
   *same* `href` (e.g. `<strong><a href="X">guidance</a></strong><strong><a href="X">. </a></strong>`,
   found in `hpv-vaccine-dose-schedule-modified-part-2`) merge into a single `<a>` spanning both.
   Full text and the link target are preserved; only the redundant tag split disappears.

**The one link that was previously lost has been fixed at the source, not worked around:**

`paxlovid-lower-risk-of-severe-covid-in-patients-with-underlying-chronic-conditions` contained
a malformed link in the source dump — `<a href="s://vaccines.inocul8.com.ng/paxlovid/">here</a>`,
missing its `http` prefix (a content typo already present in the legacy WordPress data). Tiptap's
Link extension validates the URI protocol on parse and correctly declined to preserve that mark
(the anchor **text** survived; only the link itself was dropped). Rather than loosen URL
validation in the schema to accept it, the fix was applied to the data:
`src/lib/data/blog-posts.json` now has `href="https://vaccines.inocul8.com.ng/paxlovid/"` for
that post. The committed `link-loss` check now enforces **zero** posts may lose a link, not just
reports it as a one-time finding.

**Table support has been removed entirely.** `Table`/`TableRow`/`TableHeader`/`TableCell` and
the `@tiptap/extension-table` dependency were dropped from `EDITOR_EXTENSIONS`. The measured
corpus fact is zero `<table>` tags across all 70 posts, so table support had no content and no
author using it yet — combined with the extension's habit of silently emitting
`style="min-width: …"` and a `<colgroup>` wrapper that the nh3 allowlist would have had to
either accept (attack surface) or strip (silently discarding an author's chosen column width),
it was a papercut with no upside. If tables are needed later, re-add the extension as its own
task with its own allowlist entries and a real corpus need behind it.

No other post lost a link, a heading, a list item, or any text. `checked 70, dom-changed 68,
text-loss 0, link-loss 0` is the expected, approved, **enforced** result for this corpus — see
the category breakdown above.

## Emitted markup samples

Built by hand-authoring HTML that exercises every node and mark in `EDITOR_EXTENSIONS`
(h2/h3/h4, bold/italic/underline/strike/inline-code, a link, a bullet list, an ordered list, a
blockquote, an `<hr>`, a fenced code block, `Figure` in all four `align-*` values and all four
`size-*` values, and `Callout` in all three variants), passing it through `htmlRoundTrip`, and
pasting the exact output below with **no reformatting**. This is the literal HTML the editor can
produce; the backend `nh3` allowlist (tags + attributes) must accept everything that appears here
or authored content will be silently stripped in production.

**Table is intentionally absent from this sample** — table support (`Table`/`TableRow`/
`TableHeader`/`TableCell`, `@tiptap/extension-table`) has been removed from `EDITOR_EXTENSIONS`.
The corpus has zero `<table>` tags across all 70 posts, and the extension emitted
non-author-controlled `style`/`colgroup` markup that the allowlist would otherwise have had to
carry as dead weight. There is nothing for the sanitizer to allow for tables; `table`, `tr`,
`td`, `th`, `colgroup`, `col`, `tbody`, `thead` should **not** be in the Task 5 allowlist.

To keep the sample readable while still covering every `align-*`/`size-*` class name, each
`Figure` below uses a distinct align+size pair rather than the full 4×4 cross product — the
class-name vocabulary that matters to the sanitizer is identical either way
(`align-{left,center,right,full}` and `size-{small,medium,large,original}`), since alignment and
size are independent attributes rendered as independent class tokens, not a joint enum.

### Input HTML (hand-authored)

```html
<h2>Heading level 2</h2>
<h3>Heading level 3</h3>
<h4>Heading level 4</h4>
<p><strong>bold</strong> <em>italic</em> <u>underline</u> <s>strike</s> <code>inline code</code> plain text with a <a href="https://example.com/page">link</a>.</p>
<ul><li>Bullet one</li><li>Bullet two</li></ul>
<ol><li>Ordered one</li><li>Ordered two</li></ol>
<blockquote><p>A quoted sentence.</p></blockquote>
<hr>
<pre><code>const x = 1;
console.log(x);</code></pre>
<figure class="align-left size-small"><img src="https://example.com/a.jpg" alt="Left small"><figcaption>Left, small</figcaption></figure>
<figure class="align-center size-medium"><img src="https://example.com/b.jpg" alt="Center medium"><figcaption>Center, medium</figcaption></figure>
<figure class="align-right size-large"><img src="https://example.com/c.jpg" alt="Right large"><figcaption>Right, large</figcaption></figure>
<figure class="align-full size-original"><img src="https://example.com/d.jpg" alt="Full original"><figcaption>Full, original</figcaption></figure>
<div class="callout callout-info"><p>Info callout body.</p></div>
<div class="callout callout-warning"><p>Warning callout body.</p></div>
<div class="callout callout-tip"><p>Tip callout body.</p></div>
```

### Output of `htmlRoundTrip(input)` — exact, unmodified

```html
<h2>Heading level 2</h2><h3>Heading level 3</h3><h4>Heading level 4</h4><p><strong>bold</strong> <em>italic</em> <u>underline</u> <s>strike</s> <code>inline code</code> plain text with a <a rel="noopener" href="https://example.com/page">link</a>.</p><ul><li><p>Bullet one</p></li><li><p>Bullet two</p></li></ul><ol><li><p>Ordered one</p></li><li><p>Ordered two</p></li></ol><blockquote><p>A quoted sentence.</p></blockquote><hr><pre><code>const x = 1;
console.log(x);</code></pre><figure class="align-left size-small"><img src="https://example.com/a.jpg" alt="Left small" loading="lazy"><figcaption>Left, small</figcaption></figure><figure class="align-center size-medium"><img src="https://example.com/b.jpg" alt="Center medium" loading="lazy"><figcaption>Center, medium</figcaption></figure><figure class="align-right size-large"><img src="https://example.com/c.jpg" alt="Right large" loading="lazy"><figcaption>Right, large</figcaption></figure><figure class="align-full size-original"><img src="https://example.com/d.jpg" alt="Full original" loading="lazy"><figcaption>Full, original</figcaption></figure><div class="callout callout-info"><p>Info callout body.</p></div><div class="callout callout-warning"><p>Warning callout body.</p></div><div class="callout callout-tip"><p>Tip callout body.</p></div>
```

Confirmed: `target=` does not appear anywhere in this output (checked with a plain substring
search over the whole rendered string).

### Tags present in the output

`h2`, `h3`, `h4`, `p`, `strong`, `em`, `u`, `s`, `code`, `a`, `ul`, `ol`, `li`, `blockquote`,
`hr`, `pre`, `figure`, `img`, `figcaption`, `div`.

### Attributes present in the output, by tag

- `a`: `rel="noopener"`, `href="…"` — **no `target`** (explicitly nulled out in
  `EDITOR_EXTENSIONS`; matches the nh3 allowlist `"a": {"href", "title", "rel"}` exactly, modulo
  `title` which the schema doesn't currently set but the allowlist may reserve for future use).
- `figure`: `class="align-{left|center|right|full} size-{small|medium|large|original}"`
- `img`: `src="…"`, `alt="…"`, `loading="lazy"` (also emits `width`/`height` when the Figure
  node has them — not exercised above since the sample source had none; both are plain numeric
  attributes)
- `div`: `class="callout callout-{info|warning|tip}"`

### Notes for the Task 5 nh3 allowlist

- `img` never has `width`/`height` in the current 70-post corpus (0 `<img>` tags per the measured
  corpus fact), but the `Figure` node schema always includes them as attributes, and they will
  appear once an author uploads an image with known dimensions. Allow `width`/`height` as
  numeric-only attributes on `img`.
- `loading="lazy"` on `img` is emitted unconditionally by the `Figure` node's `renderHTML` — not
  author-controlled, safe to allow unconditionally.
- `rel="noopener"` on `a` is emitted unconditionally for every link — allow it alongside `href`.
  `target` is deliberately **not** emitted (`HTMLAttributes: { target: null }` in
  `src/lib/editor/schema.ts` — see "Analysis of changes" above) and should not need to be in the
  allowlist for content this schema produces.
- Table-related tags/attributes (`table`, `tr`, `td`, `th`, `colgroup`, `col`, `style` on any of
  them, `colspan`/`rowspan`) are **not** produced by this schema and should not be allowlisted —
  see the removal note above.
