# INOCUL8 Blog Studio — Design

**Date:** 2026-07-28
**Status:** Approved for planning
**Spans:** `new_inocul8_frontend` (studio UI) + `new_inocul8_backend` (models, API, sanitization, media)

Replaces the raw-HTML `<textarea>` in Django admin with a WordPress-class authoring
experience for non-technical clinic staff, without destabilising 70 ranked blog URLs.

---

## 1. Analysis of the current implementation

**Backend** — Django 5.1.4 + DRF 3.15 + `django-unfold` admin, Docker at
`/opt/inocul8-backend` on VPS 67.223.117.192, served at `https://api.inocul8.com.ng`.

`BlogPost(TimeStamped, SEOFields)` holds `title`, `slug` (unique, rendered at the site
root `/<slug>`), `excerpt`, **`body` = a TextField of raw HTML**, `categories` (M2M),
`tags` (JSON list), `reading_minutes`, `published_at`, `is_published`, `is_featured`.
`SEOFields` supplies `meta_title`, `meta_description`, `focus_keyword`, `canonical_url`,
`og_image`, `noindex`.

Gaps against the brief: no featured image, no author, no draft/scheduled status beyond a
boolean, no media library, no revision or review trail, **no write API and no upload
endpoint**, and no rich editor — authoring today means hand-writing HTML into a textarea.

**Media** — local `FileSystemStorage` at `/opt/inocul8-backend/media` (~4.2 MB), served
by Apache at `https://api.inocul8.com.ng/media/...` (verified 200). `USE_S3=False`;
`django-storages` + `boto3` are installed but dormant.

**Frontend** — Next.js 16.2.9 (App Router) + React 19.2 + Tailwind v4 on Vercel.
Dependencies are deliberately lean (`motion`, `lucide-react`, `clsx`, `cva`,
`tailwind-merge`); **shadcn/ui is not actually installed** despite the project docs.
Posts render at `src/app/[slug]/page.tsx` via `<ServiceProse html>` →
`dangerouslySetInnerHTML`, styled by the `.service-prose` class in globals.css.
`src/lib/blog.ts` fetches DRF with ISR and a committed static JSON fallback.
Route-level middleware lives in **`src/proxy.ts`** (Next 16's rename of `middleware.ts`).

**Already wired and reusable:** `simplejwt` (`/api/v1/auth/token/`), `django-auditlog`,
`django-ratelimit`, `anymail`/Mailgun, and the `/api/revalidate` webhook.

**Legacy content audit (measured, not assumed).** All 70 posts were parsed: **zero
contain `<img>`**, and the complete tag vocabulary is `p, strong, a, li, h2, h3, ul, em`
— no tables, no blockquotes, no embeds. TipTap round-trips that set losslessly, so
migration risk is near-nil and every image feature is forward-looking.

**Security gap.** `ServiceProse` renders unsanitized HTML, safe today only because the
legacy corpus was machine-cleaned. The moment humans author HTML, that is stored XSS.

---

## 2. Architecture

A new **`/studio`** route group inside the frontend repo, talking to a new
**`/api/v1/studio/`** namespace in Django. The public read path is not modified.

```
Staff browser
  └─ /studio/*                      Next; gated in src/proxy.ts, X-Robots-Tag: noindex
       └─ /api/studio/[...path]     Next route handler — thin BFF proxy
            ├─ reads httpOnly cookies, forwards Authorization: Bearer
            └─ single-flight refresh on 401, retry once
                 └─ /api/v1/studio/*   DRF, permission-gated, throttled, audit-logged
```

**Why the studio lives in Next, not Django admin.** The brief requires a preview showing
the article "exactly as users will see it". The real renderer (`ServiceProse`) and real
styles (`.service-prose`, Tailwind v4) exist only in Next. Building the preview in Django
admin means either a copied stylesheet that drifts silently on every globals.css change —
a permanent lie to the client — or iframing Vercel, which is most of this design with
worse ergonomics. It would also force a JS build pipeline into a backend Docker image
whose entire asset story is currently whitenoise.

**Auth mechanics.** Browser JS never touches a token. `/studio/login` posts to a Next
route handler which calls Django server-side and sets two cookies:

| Cookie | Flags | Lifetime |
|---|---|---|
| access | `HttpOnly; Secure; SameSite=Lax`, `Path` scoped to the studio API prefix | ~15 min |
| refresh | `HttpOnly; Secure; SameSite=Lax`, `Path` scoped to **only** the refresh route | ~14 days, rotating + blacklist |

Neither cookie is ever set at `Path=/` — the studio shares a hostname with the public
marketing site. Refresh is orchestrated server-side in the handler and **single-flighted**,
because the autosave loop plus a second tab can otherwise trigger concurrent refreshes and
rotation would log the loser out mid-post. A 401 pauses autosave and shows a re-login
modal **without navigating away**, so the in-memory draft is never lost.

The `proxy.ts` gate is UX only (redirect + `noindex`); the security boundary is Django
rejecting the JWT on every proxied call. Because auth now rides in a cookie, CSRF returns:
every mutating handler verifies same-origin via `Origin`/`Sec-Fetch-Site` and requires a
custom `X-Studio-Request` header that cross-site forms cannot set.

**Scope boundary.** Studio owns blog posts and media only. Services, Pages, Redirects and
SiteSettings stay in Django admin.

---

## 3. Design covenant

Two clauses. Every future workflow request is tested against both.

1. **Staff can never take an irreversible or public-facing action implicitly.**
   Autosave never touches live content; slugs never move after publish; publishing is an
   explicit, confirmed act; auth failure pauses rather than destroys.
2. **No claim ships that the system didn't witness.**
   The medical-review stamp exists only where a credentialed clinician performed the
   publishing act; approved content is byte-for-byte what the approver read; byline
   authority is backed by the audit trail.

---

## 4. Data model

### 4.1 New — `MediaAsset` (new app `apps.media`)

| Field | Notes |
|---|---|
| `file` | `ImageField(upload_to="blog/%Y/%m/")` |
| `alt_text` | Blank allowed at save; **enforced at publish** |
| `caption`, `title` | Optional |
| `width`, `height` | Extracted post-processing by Pillow — powers CLS-free rendering |
| `filesize`, `mime` | Recorded at upload |
| `uploaded_by` | FK User, `SET_NULL` |
| `created_at` | |

### 4.2 New — `Author`

`user` (OneToOne, optional), `name`, `slug`, `credentials` (e.g. "MBBS, MPH"), `title`,
`bio`, `photo` (FK MediaAsset), `is_clinician`, `is_active`.

`is_clinician` is meaningful **only** in combination with non-empty `credentials`; the
publish rule (§6.3) requires both.

### 4.3 `BlogPost` additions

| Field | Purpose |
|---|---|
| `draft_body` (TextField) | The autosave target — see §6.1 |
| `status` | `draft` / `pending_review` / `changes_requested` / `scheduled` / `published`; replaces `is_published`, backfilled |
| `first_published_at` (nullable) | Drives the slug lock — "ever published", not "currently published" |
| `featured_image` | FK → MediaAsset, `SET_NULL` |
| `author` | FK → Author |
| `approved_by` | FK User — editorial gate: who let this go live |
| `medically_reviewed_by` | FK → Author — clinical attestation |
| `medically_reviewed_at` | Timestamp of that attestation |
| `legacy_team_reviewed` (bool) | True for the 70 imported posts only — see §6.4 |
| `review_note` (TextField) | Editor's changes-requested note; overwritten each time, cleared on publish |

`SEOFields` gains `og_title` and `og_description` (additive; Services and Pages benefit too).

`reading_minutes` becomes auto-computed from the body word count on save, with the field
left editable as an override — staff should not have to estimate it.

`is_published` is dropped after `status` is backfilled. It is absent from the public
serializer, so no frontend contract changes.

### 4.4 Content format — HTML stays

**`body` remains HTML. No `body_json`, no block migration.**

Rationale: HTML is the SEO-native format; the 70 ranked posts already render correctly;
`ServiceProse`, the static JSON fallback, the WP reconstruction and TipTap all already
speak it. A parallel JSON column creates two sources of truth and the classic
"which one is canonical after a migration script touched one" bug — a bad failure for a
solo maintainer. The genuine benefits of block JSON (multi-channel rendering, OT-based
collaboration) are not on this project's horizon.

Block semantics are achieved with **structured HTML** instead: the callout node
serializes to `<div class="callout callout-info">…</div>` and images to
`<figure class="align-left size-medium"><img …><figcaption>…</figcaption></figure>`,
both styled by `.service-prose`.

Revisions, if ever wanted, become a `BlogPostRevision` row written on publish — a v2
change that requires no rework of this design.

---

## 5. Sanitization

**`nh3`, enforced at the Django model layer** (not in the DRF serializer alone), so
studio writes, admin edits and any future import script all pass through one gate.
It applies to `body`, `draft_body` and `excerpt` — every field whose contents can reach
`dangerouslySetInnerHTML`.
`bleach` is unmaintained; `nh3` (Rust/ammonia bindings) is its maintained successor.

Sanitize once on write, store clean, render fast. Deliberately **not** sanitizing on the
Next render path: a sanitizer upgrade would otherwise silently alter the markup of 70
ranked posts at read time — an SEO incident vector we would have built ourselves. The
`dangerouslySetInnerHTML` in `ServiceProse` stays; its comment is updated so the stated
invariant becomes "sanitized by nh3 at write time".

**Allowlist:** `h2`–`h4` (`h1` stripped — the page template owns the sole h1, and
duplicate h1s are an SEO own-goal), `p`, `ul`/`ol`/`li`, `blockquote`, `strong`/`em`/`u`/`s`,
`a` (scheme-limited to http/https/mailto; `rel` permitted), `img`
(`src` limited to our own hosts, plus `alt`/`width`/`height`/`loading`), `figure`/`figcaption`,
`hr`, `pre`/`code`, `br`, and `div`/`span` restricted to an explicit class allowlist
(`callout*`, `align-*`, `size-*`).

**No `target` attribute, on either side.** Tiptap's Link extension injects
`target="_blank"` by default; the schema overrides it to `null`. The live corpus has no
`target` attributes today, so emitting one would change the behaviour of 70 ranked pages
the moment anyone re-saves them. Editor and sanitizer agree by both omitting it. (New-tab
external links, if ever wanted, are a render-time decision — never baked into stored HTML.)

**Tables are deliberately absent.** The measured legacy corpus contains **zero** tables and
the client brief never asked for them, while `@tiptap/extension-table` emits `style` and
`colgroup` that the allowlist strips — meaning an author could set a column width and watch
it silently vanish. Table support is therefore cut from both the schema and the allowlist; an
allowlist entry nothing legitimate can produce is just standing attack surface. *Re-add path:*
allowlist `table/thead/tbody/tr/th/td/colgroup/col` without `style`, accept that authored
column widths do not persist, and let `.service-prose table` own all presentation.

**Scope warning:** this allowlist is for **blog** content only. Service pages *do* contain
real table markup, so the sanitizer must never be wired into `Service.save()` without first
restoring the table tags — the function is named for blog use to make that misuse obvious.

**Stripped unconditionally:** all `style` attributes, all `on*` handlers, all `data-*`
not explicitly allowlisted, and **all `<iframe>`s — permanently**. YouTube, if ever
needed, becomes a node storing only a video ID rendered as a facade; that avoids both the
iframe hole and ~1 MB of third-party JS against the LCP budget. Deferred from v1.

**Pre-flight gate:** before save-time enforcement is switched on, nh3 is run over all 70
stored bodies offline and diffed. Zero unintended changes, or it does not ship.

---

## 6. Workflow and permissions

### 6.1 The autosave invariant

> **Every field the public renders has a `draft_` twin. Autosave writes only `draft_*`
> columns. Only an explicit Publish/Update promotes all pairs atomically and fires the
> revalidate webhook.**

**Amended 2026-07-28.** The original wording covered `body` alone, and implementation proved
that was a hole, not a simplification: autosave also wrote `title`, `excerpt` and the SEO
fields straight to the live row, so a half-rewritten headline on a ranked page was one
keystroke away. The covenant's strength is uniformity — one rule for every field, rather
than a rule for `body` and an assumption about everything else.

**Every field is exactly one of three kinds.** A field that is publicly visible and reachable
through plain CRUD is a bug of this class:

| Kind | Fields | Rule |
|---|---|---|
| **Shadowed** | `title`, `excerpt`, `tags`, `meta_title`, `meta_description`, `focus_keyword` (+ `og_title`, `og_description` once added) | `draft_*` twin; autosave writes only the twin; publish promotes the pair |
| **Workflow-locked** | `status`, `published_at`, `slug`, `noindex`, `canonical_url`, `is_featured` | Read-only in the serializer; writable only by a named action gated on `publish_blogpost` |
| **System-computed** | `medically_reviewed_by`, `medically_reviewed_at`, `approved_by`, `first_published_at`, `legacy_team_reviewed`, `reading_minutes` | No client write path at all |

One deliberate carve-out, recorded as a decision rather than an oversight: **`categories` (M2M)
gets no shadow table** — a draft M2M is real schema cost for a rare, deliberate edit. Categories
are excluded from autosave entirely and commit only via the explicit Update/Publish action, so
no implicit write to a live post can occur through them.

Two derived-property traps this rule exists to catch, both found in review:
- **Liveness is `status AND published_at`.** Locking `status` alone left `published_at`
  writable, letting any author de-index a ranked page by dating it into the future.
- **Indexability is `noindex` and `canonical_url`.** Either one flips a ranked page out of
  the index as effectively as unpublishing.

The **promote action is the single choke point** that fires revalidation, so "public content
changed" and "revalidation fired" can never disagree.

A published post being edited shows **"Published — you have unsaved-to-live edits"** with
*Update live post* and *Discard my edits* (which copies live → draft for **all** pairs).

This holds in every status, forever, which is what makes the SEO promise checkable.
A published post being edited shows **"Published — you have unsaved-to-live edits"** with
*Update live post* and *Discard my edits* (which copies `body → draft_body`) — the
WordPress pending-changes model staff already recognise.

Consequence: **`body` becomes read-only in Django admin**, so there is exactly one door
for content writes and `draft_body` can never go stale behind an admin edit.

Autosave PATCHes carry the `updated_at` they loaded; the server rejects stale writes with
a "reloaded elsewhere" message rather than last-write-wins.

### 6.2 Roles

**Code checks permissions; humans assign groups.** Two custom permissions on `BlogPost`:
`blog.publish_blogpost` and `blog.review_blogpost`. DRF permission classes call
`user.has_perm(...)` and never reference a group by name (group-name checks are
stringly-typed and break silently when someone renames a group).

Baseline studio access is Django's own default model permissions — a user reaches the
studio at all only if they hold `blog.view_blogpost`; authoring needs
`blog.add_blogpost`/`blog.change_blogpost` and `media.add_mediaasset`. So:

| Group | Permissions |
|---|---|
| **Blog Author** | `view/add/change_blogpost`, `add/change_mediaasset` |
| **Blog Editor** | the above **plus** `publish_blogpost`, `review_blogpost`, `add_blogcategory` |

**Permissions live on groups only, never granted directly to a user.**

All studio users have **`is_staff=False`**, and permission classes must never check
`is_staff` — Django admin stays restricted to the maintainer.

No object-level permissions in v1: authors may edit any non-published post. A four-person
clinic does not need ownership walls; add them only if a real conflict occurs.

### 6.3 Status flow

```
Author:  draft ─→ pending_review ─→ (editor acts) ─→ published | scheduled
                        │
                        └─→ changes_requested ─→ draft ─→ …
Editor:  draft ─────────────────────────────────→ published | scheduled
```

Clinicians hold editor accounts, so their own posts never queue. When an editor approves
an author's post, the approve dialog offers publish-now or schedule — approval and go-live
time are decided together, with no extra state.

`changes_requested` is a distinct status rather than a bounce to `draft`, so an author's
list distinguishes "I haven't finished this" from "the editor needs something from me".
One `review_note` field, shown as a banner above the editor. Two Mailgun emails —
*submitted for review* → editors, *changes requested* → author — each with a deep link.
Nothing further: no digests, no notification centre, no preferences screen.

**Freeze on submit.** While `status = pending_review`, writes to `draft_body`, title, slug
and SEO fields are **rejected by the API** for users lacking `review_blogpost`. This closes
a real hole: an editor reads a post, the author keeps typing, autosave updates
`draft_body`, the editor approves — and unreviewed words go live through an approved
action. Enforcement is server-side because a stale open tab will keep autosaving into a
UI-only freeze. The author's self-serve escape is **"Withdraw from review"** → `draft`.
Editors may still edit during review; the freeze is one-directional against the submitter.

The approve/publish request additionally carries the `updated_at` the editor's screen
loaded, and the server rejects on mismatch — closing the editor-vs-editor race too.

**Editors edit in place.** A clinician correcting "8 weeks" to "6 weeks" must not need a
reject → email → resubmit → re-review loop; small teams route around process cosplay by
sharing passwords, which is worse. Attribution is preserved by the reviewer credit (the
clinician's name ships on the post) and auditlog's field-level trail. One convention,
documented rather than code-enforced: **copyedits and factual corrections are fixed in
place; rewrites that change the author's argument or voice are sent back.**

### 6.4 Editorial approval vs. medical review

Two separate fields answering two different questions — "who let this go live"
(`approved_by`) and "which qualified clinician vouches for the medicine"
(`medically_reviewed_by`). On a YMYL healthcare site, conflating them in the schema is
the whole disease. They coincide in the common case rather than collapsing.

**Rule, applied on every publish/approve action, recomputed from the acting user alone:**

- Acting user's Author profile has `is_clinician` **and** non-empty `credentials`
  → `medically_reviewed_by = self`, `medically_reviewed_at = now`.
- Otherwise → the stamp is **cleared**, never carried forward from a previous publish.

**No UI anywhere lets anyone — including the maintainer — set `medically_reviewed_by` to a
third party.** A medical review is an attestation; the only person who can make it is the
clinician, by taking the publish action. Since the clinicians hold the editor accounts,
this costs nothing in the normal flow — that is precisely what makes the collapse safe:
truthful by construction, not by policy.

A non-clinician editor sees at publish time: *"No medical review. This post will publish
without the 'Medically reviewed' badge. To publish with medical review, ask a clinician
editor to approve it instead."* — informational, not blocking. The clinician sees the
mirror: *"Publishing will mark this post as medically reviewed by you (Dr X, MBBS)."*

**Rendering (one condition, two consumers):**

| Condition | Badge | Article JSON-LD |
|---|---|---|
| `medically_reviewed_by` set | "Medically reviewed by Dr X, MBBS" | `reviewedBy` as a Person with credentials |
| else `legacy_team_reviewed` | "Medically reviewed by the Inocul8 Clinical Team" | no `reviewedBy` |
| else | no badge | no `reviewedBy` |

`legacy_team_reviewed` is set True by data migration for the 70 imported posts **only**,
preserving what those ranked pages already display while never letting a new post inherit
an unwitnessed claim. Legacy posts upgrade to a named badge individually the first time a
clinician publishes an edit.

**Known and accepted:** a non-clinician republishing a previously-reviewed post *drops*
the badge. That is correct — the clinician did not review the new words — but it will
surprise the client once. The publish dialog's warning is the mitigation; the fix is one
clinician re-approval.

### 6.5 Slugs

Free while a post has never been published: auto-generated from the title, editable, and
shown as the full final URL in the pre-publish confirmation — *"This post will live at
inocul8.com.ng/your-slug — this cannot be changed later."*

At first publish the field becomes read-only in the studio and **title edits stop driving
the slug permanently**. Severing that link is what eliminates the whole risk class for
staff. The lock keys on `first_published_at` being non-null, so unpublish-then-republish
is not treated as a first publish.

Genuine renames are a maintainer-only Django admin action that, in one transaction,
updates the slug, creates the `Redirect` (old → new, 301), **collapses any existing
redirects pointing at the old slug so chains never form**, and revalidates both paths.
A warn-and-auto-301 alternative was rejected: a warning is meaningless to someone who
does not know what a URL is worth, and casual renames create a→b→c chains that bleed
crawl efficiency.

---

## 7. Media pipeline

Server-side normalisation **and** `next/image` — they do different jobs, and skipping the
server side is the mistake. `next/image` handles per-device derivatives and format
negotiation at the edge; it does nothing about a 6 MB HEIC as the stored original, VPS
disk, origin-fetch weight, or **EXIF GPS coordinates in staff phone photos on a clinic's
server**.

On every upload:

1. Sniff real content type — never trust the extension.
2. Accept JPEG / PNG / WebP **and HEIC via `pillow-heif`** — staff are on iPhones;
   rejecting HEIC means the tool is broken on day one.
3. Auto-orient from EXIF, **then strip all metadata**.
4. Downscale to 2560 px on the longest edge; re-encode JPEG/WebP at ~q80.
5. Reject > 15 MB pre-processing; keep Pillow's decompression-bomb ceiling on.
6. Store post-processing `width`/`height` on the `MediaAsset`.

**Accepted trade, stated explicitly:** originals are not retained. Re-encoding is lossy
and one-way. At 2560 px/q80 this is right for a blog, but it is a decision, not a surprise.

**CLS:** the figure node stamps `width`/`height` onto the `<img>` from the MediaAsset
record at insert time. They serialize into the stored HTML, the nh3 allowlist already
permits them, and `.service-prose` sets `img { height: auto }` so aspect ratio reserves
layout space. Zero author involvement, zero CLS, and it survives into the static fallback
because it is just HTML.

**Alt text: block publish, never block save.** Autosave and draft-save must be infallible
or the safety net has holes. The upload dialog presents alt as required-looking, seeded
with a hint ("Describe what's in the photo, e.g. 'Nurse administering yellow fever
vaccine'"), but an empty value still saves to draft. The pre-publish confirmation lists
every image missing alt and **refuses to publish** until fixed — the featured image held
to the same rule. The hard gate sits at the moment of consequence, not the moment of flow.

**Storage stays on the VPS filesystem behind Apache.** At 4.2 MB the failure mode S3
solves does not exist, and Vercel's image cache already does the CDN-for-images job.
`USE_S3` remains a dormant config flip; the 2-year regret is missing metadata, not the
wrong disk. `images.remotePatterns` already whitelists `api.inocul8.com.ng/media/**`.

**Operational prerequisite:** add `/opt/inocul8-backend/media` to the backup that covers
the Postgres volume. A single unbacked-up directory of client images on one VPS is the
real data-loss risk in this picture.

**Uploads are synchronous** (Pillow in-request, ~1–2 s of a gunicorn worker). At clinic
volume that is fine; no Celery — it is not actually in `requirements.txt`, and the queue
path is not built in v1.

---

## 8. API surface

All studio routes live under `/api/v1/studio/` in **their own viewsets**. The public
`BlogPostViewSet` is not touched. Permission-conditional querysets on a shared viewset are
the canonical draft-leak footgun, and a leak here could bake an unpublished draft into an
ISR page.

| Method | Route | Notes |
|---|---|---|
| GET / POST | `studio/posts/` | List all statuses; create |
| GET / PATCH / DELETE | `studio/posts/{id}/` | |
| PATCH | `studio/posts/{id}/autosave/` | Writes `draft_body` + light fields; stale-write checked |
| POST | `studio/posts/{id}/submit/` | `draft` → `pending_review` |
| POST | `studio/posts/{id}/withdraw/` | `pending_review` → `draft` (submitter) |
| POST | `studio/posts/{id}/request-changes/` | `{note}`; needs `review_blogpost` |
| POST | `studio/posts/{id}/publish/` | `{publish_at?}`; needs `publish_blogpost`; promotes `draft_body → body`, sets `approved_by`, recomputes the medical stamp, fires revalidate |
| POST | `studio/posts/{id}/unpublish/` | Needs `publish_blogpost` |
| GET / POST | `studio/media/` | List; upload |
| PATCH / DELETE | `studio/media/{id}/` | Edit alt/caption; delete |
| GET | `studio/authors/`, `studio/categories/` | Categories writable by editors |
| GET | `studio/me/` | Current user + resolved permissions, for UI gating |

The public queryset switches to `status="published" AND published_at <= now`, which gives
**scheduling for free**. A cron'd `publish_due` management command flips due posts and
fires revalidate — no Celery.

Studio write throttling is configured independently of public read throughput.
`BlogPost`, `MediaAsset` and `Author` are registered with `django-auditlog`.

**Two tests are written before the endpoints** (they are the guardrail, not a formality):

1. Every `/api/v1/studio/` route returns 401 unauthenticated — **iterated from the
   router**, so new endpoints inherit the test automatically.
2. The public list and detail never return a non-published object, asserted with draft,
   pending-review and future-scheduled fixtures in place.

Django's built-in test runner (`manage.py test`) — no new dependency. This is the repo's
first test suite.

---

## 9. Studio UI

- **`/studio/login`** — email + password.
- **`/studio`** — post list: status chips, search, filters, "New post". Editors also see a
  review queue.
- **`/studio/posts/[id]`** — three panes: TipTap canvas centre; collapsible right sidebar
  (Publish box · Featured image · Category & tags · Author · SEO); autosave chip in the
  header cycling "Saving…" → "Saved" → "Last saved 2 minutes ago".
- **Preview tab** renders `draft_body` through the **actual `<ServiceProse>` component** at
  real content width — honest by construction, and the entire reason the studio lives in Next.

**Editor — TipTap v3**, HTML in / HTML out:

H2–H4, bold / italic / underline / strikethrough, bullet and numbered lists, link,
blockquote, horizontal rule, code block, one callout node, and inline images with
alignment (left / centre / right / full), size preset (small / medium / large / original),
caption and alt. **No tables** — see §5. Block drag handles for reordering; drag-and-drop and paste-to-upload.

Licensing verified: Tiptap open-sourced ten formerly-Pro extensions under MIT in 2025,
including **Drag Handle** and **File Handler** — the two this design depends on. The paid
tier covers only Collaboration, Comments, Snapshots/version history, document conversion
and AI. **Nothing in this design touches it, and version history must not be built on
Tiptap Snapshots** — if revisions are ever wanted, they are server-side rows (§4.4).
Exact extension packaging is verified against the installed Tiptap v3 at implementation
time rather than assumed from these notes.

**SEO panel:** meta title (50–60 recommended) and meta description (150–160) with live
character counters, focus keyword, OG title/description, social image, canonical, noindex.

**Publish dialog** shows title, the full final URL, featured image, category, medical-review
status and SEO completeness — and refuses to publish while any image lacks alt text.

**Cut from v1, deliberately:**

- **Text colour and highlight** — brand consistency lives in `.service-prose`; arbitrary
  author colours are how client sites become ransom notes, and it would widen the
  sanitizer allowlist to include `style`. This is a feature, and is presented to the
  client as one.
- **Text alignment** (justify/centre body copy) — a typography bug waiting to happen on a
  content site. Image alignment is kept.
- **Raw embeds/iframes**, **revision history**, **collaborative editing**, author-facing
  media-library management beyond a picker grid.
- **Device-frame toggle** (desktop/tablet/mobile) and the fuller pre-publish summary
  screen are fast-follows; v1 ships one real preview frame, which delivers the actual
  value ("real published styling").

**Bundle impact:** TipTap is imported only by `/studio` routes, which Next code-splits, so
the public marketing bundle is unaffected. This is verified against the build output.

---

## 10. Migration strategy

**No content migration.** `draft_body` is backfilled from `body`. Legacy posts re-serialize
only if someone opens and saves them, and given the measured eight-tag vocabulary that
round-trip is clean. Byte-identical output is not promised by any editor (attribute order,
whitespace normalisation); **DOM-equivalence is**, and is proven before launch by a one-off
Node script that pushes all 70 bodies through the configured TipTap schema and diffs the
parsed DOM, with any differences reviewed by hand.

- URLs, slugs and rendered markup are untouched → rankings are untouched.
- `status` is backfilled from `is_published`; `is_published` is then dropped.
- `legacy_team_reviewed = True` for the 70 imported posts, preserving the badge they
  already display.
- Existing images: none exist in blog bodies (measured), so there is nothing to rehost.
- The static JSON fallback in `src/lib/data/blog-posts.json` stays as-is and keeps working.
- nh3 is diffed offline over all 70 bodies before enforcement is enabled (§5).

---

## 11. Implementation stages

| Stage | Content |
|---|---|
| **A. Backend foundations** | `apps.media` + MediaAsset + upload pipeline; Author model; BlogPost fields; status migration + backfill; `legacy_team_reviewed` data migration; nh3 sanitizer + offline diff; custom permissions + groups; admin updates (`body` read-only, slug action) |
| **B. Studio API** | The two guard tests **first**; `/api/v1/studio/` viewsets and actions; freeze + stale-write checks; throttling; auditlog registration |
| **C. Next auth shell** | `proxy.ts` gate + noindex; login page; BFF route handlers with single-flight refresh; `/studio` post list |
| **D. Editor** | TipTap integration, toolbar, figure/image node, callout node, media picker, autosave loop |
| **E. Sidebar** | SEO panel with counters, featured image, taxonomy, author |
| **F. Workflow** | Submit / request-changes / withdraw / publish / schedule dialogs; Mailgun emails |
| **G. Public rendering** | Conditional medical-review badge + `reviewedBy` JSON-LD; `.service-prose` styles for figure, caption, callout; author byline |
| **H. Operations** | `publish_due` cron; media backup; deploy; docs |

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| **Editorial, not technical:** a wrong clinical claim can ship instantly once staff publish directly | The review queue now covers author-level staff; clinicians self-publish by design. Guardrails: publish confirmation, slug lock, alt gate, `body` publish-only, auditlog |
| Non-clinician republish silently drops the review badge | Publish-dialog warning; one clinician re-approval restores it |
| New JWT write surface on a public API | Dedicated permission classes, `is_staff=False` for studio users, path-scoped httpOnly cookies, rotation + blacklist, rate limiting, auditlog, the 401 sweep test |
| Draft leaking to the public API | Separate namespace, hardcoded public queryset, explicit leak test |
| Serializer field drift between studio and public | Accepted and self-announcing — the failure mode is a missing field, not a leak |
| nh3 mutating legacy bodies on first enforcement | Offline diff over all 70 before enabling |
| Two tabs autosaving over each other | `updated_at` stale-write rejection; full merge deferred |
| Refresh-rotation race logging an author out mid-post | Single-flight refresh; 401 pauses autosave and shows a modal without navigating |
| Lossy one-way image re-encoding | Stated and accepted; 2560 px/q80 |
| Staff typing "image" to pass the alt gate | Seeded hint text; maintainer spot-check. Residual, accepted |

---

## 13. Open items (not blocking)

- Clinician names, credentials and photos are needed before any named review badge can
  render. Until then `legacy_team_reviewed` covers existing posts and new posts simply
  carry no badge.
- Studio account provisioning (who gets Author vs Editor) is a client decision at rollout.
- Device-frame preview toggle, pre-publish summary screen, YouTube facade node and
  revisions are explicit v1.1+ candidates.
