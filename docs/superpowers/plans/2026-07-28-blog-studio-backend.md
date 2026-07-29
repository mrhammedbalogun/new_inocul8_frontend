# Blog Studio — Backend Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tested, curl-exercisable `/api/v1/studio/` API — media library, author profiles, post workflow, sanitization and permissions — so the Next.js studio (Plan 2) has a backend to talk to, without destabilising 70 ranked blog URLs.

**Architecture:** A new `apps.media` app holds `MediaAsset` with a server-side image normalisation pipeline. `apps.blog` gains an `Author` model, workflow fields, a `status` enum, custom permissions, and an nh3 sanitizer enforced at the **model layer** (so Django admin, the studio API and any import script all pass through one gate). Studio endpoints live in their own viewsets under `/api/v1/studio/`; the public read viewset is touched only additively.

**Tech Stack:** Django 5.1.4, DRF 3.15.2, django-unfold, `nh3` 0.3.6, `pillow-heif` 1.5.0, Pillow 11, simplejwt, django-auditlog, anymail/Mailgun, PostgreSQL, Docker Compose (services: `web`, `db`).

**Spec:** `docs/superpowers/specs/2026-07-28-blog-studio-design.md` (frontend repo).

## Global Constraints

- **The public API payload is additive-only.** New fields may appear; **no existing field is renamed, retyped or removed.** The deployed Vercel frontend runs against this API for days before Plan 2 ships — unknown fields are ignored by it, missing fields break its build.
- **The public read viewset is never given permission-conditional querysets or serializers.** Studio reads go through separate viewsets. A leak here can bake an unpublished draft into an ISR page.
- **`body` is always exactly what is live.** Autosave writes only `draft_body`. Only an explicit publish copies `draft_body → body`.
- **Studio users have `is_staff=False`.** Permission classes check `user.has_perm(...)` — **never** `is_staff`, and never a group name string.
- **`medically_reviewed_by` is never settable by any API field or admin form.** It is recomputed server-side from the acting user on publish/approve, and cleared when that user is not a credentialed clinician.
- **Do NOT make `body` read-only in Django admin in this plan.** That is the final task of Plan 2. Until the studio exists, admin is the only way to fix a live post.
- **Do NOT drop `is_published` in this plan.** It is left stale and unread; a separate migration drops it after the new filter has served production traffic (Plan 2 closing task).
- Verified dependency versions: `nh3==0.3.6`, `pillow-heif==1.5.0`. Tiptap (Plan 2) is `3.29.2`.
- Commit style: conventional commits (`feat:`, `fix:`, `test:`, `chore:`).
- Run tests with: `docker compose exec -T web python manage.py test apps -v 2`

## Pre-flight facts (already measured — do not re-derive)

- 70 posts; 70 with `is_published=True`; **0** with `published_at IS NULL`; **0** future-dated. The new predicate `status='published' AND published_at <= now()` matches exactly 70.
- `TIME_ZONE=Africa/Lagos`, `USE_TZ=True`. No naive-datetime skew.
- All 70 legacy bodies contain **zero `<img>`** and use only: `p, strong, a, li, h2, h3, ul, em`.

---

## Task 0: TipTap round-trip verification (frontend repo)

**This task runs in `C:\Users\Hammed\Desktop\new_inocul8_frontend`, on branch `feat/blog-studio`.** It is owned by neither plan and must complete before Task 5 freezes the nh3 allowlist — the allowlist has to accept exactly what the editor emits. It also produces the shared schema module the Plan 2 editor imports, so there is one source of truth for the document schema.

**Files:**
- Create: `src/lib/editor/schema.ts`
- Create: `scripts/tiptap-roundtrip.mjs`
- Create: `docs/tiptap-roundtrip-report.md` (generated output, committed)
- Modify: `package.json`

**Interfaces:**
- Produces: `EDITOR_EXTENSIONS` (array of Tiptap extensions) and `htmlRoundTrip(html: string): string` from `src/lib/editor/schema.ts`. Plan 2 Task 5 imports `EDITOR_EXTENSIONS`; Task 5 of this plan consumes the emitted-HTML samples in the report.

- [ ] **Step 1: Install the Tiptap packages**

StarterKit v3 already bundles bold, italic, strike, **underline**, code, code-block, **link**, lists, heading, blockquote and horizontal-rule — do not install those separately.

```bash
npm install @tiptap/core@3.29.2 @tiptap/pm@3.29.2 @tiptap/starter-kit@3.29.2 \
  @tiptap/extensions@3.29.2 @tiptap/extension-image@3.29.2 @tiptap/extension-table@3.29.2 \
  @tiptap/html@3.29.2
```

- [ ] **Step 2: Write the shared schema module**

`src/lib/editor/schema.ts` — framework-agnostic (no React), so both the Node script and the browser editor import it.

```ts
// Single source of truth for the blog document schema. Imported by the studio
// editor (browser) and by scripts/tiptap-roundtrip.mjs (node), so the HTML the
// editor emits is always exactly the HTML we verify and sanitize against.
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
      size: { default: "large" },   // small | medium | large | original
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
```

- [ ] **Step 3: Write the round-trip diff script**

`scripts/tiptap-roundtrip.mjs`. It compares *normalised DOM*, not bytes — byte-identity is not promised by any editor (attribute order, whitespace).

```js
// Pushes all 70 legacy post bodies through the Tiptap schema and reports any
// post whose DOM changes. Run before freezing the backend nh3 allowlist.
import { writeFileSync } from "node:fs";
import posts from "../src/lib/data/blog-posts.json" with { type: "json" };
import { htmlRoundTrip } from "../src/lib/editor/schema.ts";

const norm = (h) =>
  h.replace(/<!--[\s\S]*?-->/g, "")
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
  lines.push(`## ${c.slug}`, "", "```html", c.before.slice(0, 1500), "```", "", "```html", c.after.slice(0, 1500), "```", "");
}
writeFileSync("docs/tiptap-roundtrip-report.md", lines.join("\n"));
console.log(`checked ${posts.length}, changed ${changed.length}`);
process.exit(changed.length === 0 ? 0 : 1);
```

- [ ] **Step 4: Run it**

```bash
node --experimental-strip-types scripts/tiptap-roundtrip.mjs
```

Expected: `checked 70, changed 0`.

**If any post changed:** open `docs/tiptap-roundtrip-report.md` and inspect each diff by hand. Cosmetic differences (attribute order, whitespace, `<br>` vs `<br/>`) are acceptable — record them in the report's header as approved. **Structural** differences (a dropped tag, lost link, collapsed list) are a blocker: adjust `EDITOR_EXTENSIONS` until they disappear. Do not proceed to Task 5 with unexplained structural changes.

- [ ] **Step 5: Capture the emitted-HTML sample for the sanitizer**

Append to `docs/tiptap-roundtrip-report.md` a section titled `## Emitted markup samples` containing the serialized output of a document exercising **every** node: h2/h3/h4, bold/italic/underline/strike, bullet + ordered list, link, blockquote, hr, code block, table, `Figure` (all four aligns, all four sizes), `Callout` (all three variants). Generate it by constructing the HTML by hand, passing it through `htmlRoundTrip`, and pasting the result.

**Task 5 of this plan builds the nh3 allowlist directly from this sample.** Without it the allowlist is guesswork.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/editor/schema.ts scripts/tiptap-roundtrip.mjs docs/tiptap-roundtrip-report.md
git commit -m "feat: tiptap document schema + legacy round-trip verification"
```

---

## Task 1: Test harness + the public draft-leak guard

**Everything below runs in `C:\Users\Hammed\Desktop\new_inocul8_backend`.** Create branch `feat/blog-studio` first. This repo has **no tests at all** — this task establishes the suite.

**Files:**
- Create: `apps/blog/tests/__init__.py`
- Create: `apps/blog/tests/test_public_api.py`

**Interfaces:**
- Produces: the `apps.<app>.tests` package convention every later task adds to.

- [ ] **Step 1: Branch**

```bash
git checkout -b feat/blog-studio
```

- [ ] **Step 2: Write the failing test**

`apps/blog/tests/test_public_api.py`. This is one of the two non-negotiable guard tests. It passes today and must keep passing through every later change.

```python
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.blog.models import BlogPost


class PublicApiNeverLeaksUnpublishedTests(TestCase):
    """The public blog API must expose only live posts. A leak here can be
    baked into an ISR page on the public site, so this test guards the single
    highest-consequence behaviour in the blog stack."""

    def setUp(self):
        now = timezone.now()
        self.live = BlogPost.objects.create(
            title="Live post", slug="live-post", published_at=now - timedelta(days=1)
        )
        self.draft = BlogPost.objects.create(
            title="Draft post", slug="draft-post", published_at=now - timedelta(days=1),
            is_published=False,
        )
        self.future = BlogPost.objects.create(
            title="Future post", slug="future-post", published_at=now + timedelta(days=7)
        )

    def _slugs(self, payload):
        return {row["slug"] for row in payload["results"]}

    def test_list_excludes_draft_and_future(self):
        res = self.client.get("/api/v1/posts/")
        self.assertEqual(res.status_code, 200)
        slugs = self._slugs(res.json())
        self.assertIn("live-post", slugs)
        self.assertNotIn("draft-post", slugs)
        self.assertNotIn("future-post", slugs)

    def test_detail_404s_for_draft(self):
        self.assertEqual(self.client.get("/api/v1/posts/draft-post/").status_code, 404)

    def test_detail_404s_for_future_dated(self):
        self.assertEqual(self.client.get("/api/v1/posts/future-post/").status_code, 404)
```

- [ ] **Step 3: Run it — two tests pass, one fails**

```bash
docker compose exec -T web python manage.py test apps.blog -v 2
```

Expected: `test_detail_404s_for_future_dated` and the future part of `test_list_excludes_draft_and_future` **FAIL** — the current queryset filters only `is_published=True` and ignores `published_at`. This failure is the point: it proves the scheduling gap exists before Task 4 closes it.

- [ ] **Step 4: Commit the failing guard**

```bash
git add apps/blog/tests
git commit -m "test: guard that the public blog API never leaks unpublished posts"
```

---

## Task 2: `apps.media` — MediaAsset and the image pipeline

**Files:**
- Create: `apps/media/__init__.py`, `apps/media/apps.py`, `apps/media/models.py`, `apps/media/imaging.py`, `apps/media/admin.py`
- Create: `apps/media/tests/__init__.py`, `apps/media/tests/test_imaging.py`
- Modify: `config/settings.py` (INSTALLED_APPS), `requirements.txt`

**Interfaces:**
- Produces: `MediaAsset` model; `apps.media.imaging.process_upload(django_file) -> tuple[ContentFile, int, int, str]` returning `(file, width, height, mime)`.

- [ ] **Step 1: Add dependencies**

Append to `requirements.txt`:

```
# Blog studio: HTML sanitization + HEIC support for staff iPhone uploads
nh3==0.3.6
pillow-heif==1.5.0
```

Rebuild: `docker compose up -d --build web`

- [ ] **Step 2: Write the failing test**

`apps/media/tests/test_imaging.py`:

```python
import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image

from apps.media.imaging import MAX_EDGE, ImageRejected, process_upload


def _png(width, height, exif=None):
    buf = io.BytesIO()
    Image.new("RGB", (width, height), "red").save(buf, format="PNG")
    buf.seek(0)
    return SimpleUploadedFile("photo.png", buf.read(), content_type="image/png")


class ProcessUploadTests(TestCase):
    def test_downscales_oversized_image_to_max_edge(self):
        _file, width, height, _mime = process_upload(_png(4000, 2000))
        self.assertEqual(width, MAX_EDGE)
        self.assertEqual(height, MAX_EDGE // 2)

    def test_leaves_small_image_dimensions_alone(self):
        _file, width, height, _mime = process_upload(_png(800, 600))
        self.assertEqual((width, height), (800, 600))

    def test_rejects_non_image_payload_regardless_of_extension(self):
        bad = SimpleUploadedFile("evil.png", b"<?php echo 1; ?>", content_type="image/png")
        with self.assertRaises(ImageRejected):
            process_upload(bad)

    def test_strips_metadata(self):
        processed, _w, _h, _mime = process_upload(_png(1200, 900))
        reopened = Image.open(processed)
        self.assertFalse(reopened.info.get("exif"))
```

- [ ] **Step 3: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.media -v 2
```

Expected: FAIL — `ModuleNotFoundError: No module named 'apps.media'`.

- [ ] **Step 4: Create the app package**

`apps/media/__init__.py` (empty). `apps/media/apps.py`:

```python
from django.apps import AppConfig


class MediaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.media"
    label = "media"
    verbose_name = "Media library"
```

Add `"apps.media",` to `INSTALLED_APPS` in `config/settings.py`, immediately after `"apps.content",`.

- [ ] **Step 5: Write the imaging pipeline**

`apps/media/imaging.py`:

```python
"""Server-side normalisation for every uploaded image.

next/image handles per-device derivatives at the edge; it does nothing about a
6 MB HEIC as the stored original, or about EXIF GPS coordinates in staff phone
photos sitting on a clinic's server. This module is that job: sniff the real
type, accept iPhone HEIC, auto-orient, strip all metadata, downscale, re-encode.

Originals are deliberately not retained — re-encoding is lossy and one-way.
At 2560px/q80 that is the right trade for a blog.
"""
import io

from django.core.files.base import ContentFile
from PIL import Image, UnidentifiedImageError
from pillow_heif import register_heif_opener

register_heif_opener()  # lets Pillow open .heic from iPhones

MAX_EDGE = 2560
JPEG_QUALITY = 80
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 64_000_000  # decompression-bomb ceiling


class ImageRejected(Exception):
    """Raised for anything that is not a decodable, in-policy image."""


def process_upload(django_file):
    """Return (ContentFile, width, height, mime) — normalised and metadata-free."""
    if django_file.size > MAX_UPLOAD_BYTES:
        raise ImageRejected("Image is larger than 15 MB. Please resize and try again.")

    django_file.seek(0)
    try:
        img = Image.open(django_file)
        img.load()  # force decode now: this is what catches a renamed .php
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ImageRejected("That file is not a readable image.") from exc

    # Honour EXIF orientation before we discard EXIF, or iPhone photos land sideways.
    from PIL import ImageOps

    img = ImageOps.exif_transpose(img)

    has_alpha = img.mode in ("RGBA", "LA", "P")
    img = img.convert("RGBA" if has_alpha else "RGB")

    if max(img.size) > MAX_EDGE:
        img.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)

    # Re-saving from a fresh image drops every metadata block, including GPS.
    clean = Image.new(img.mode, img.size)
    clean.putdata(list(img.getdata()))

    buf = io.BytesIO()
    if has_alpha:
        clean.save(buf, format="WEBP", quality=JPEG_QUALITY, method=4)
        mime, ext = "image/webp", "webp"
    else:
        clean.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        mime, ext = "image/jpeg", "jpg"

    width, height = clean.size
    return ContentFile(buf.getvalue(), name=f"upload.{ext}"), width, height, mime
```

- [ ] **Step 6: Write the model**

`apps/media/models.py`:

```python
import uuid

from django.conf import settings
from django.db import models

from apps.content.models import TimeStamped


def upload_to(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower()
    return f"blog/{uuid.uuid4().hex}.{ext}"  # randomised: never trust a user filename


class MediaAsset(TimeStamped):
    """An uploaded image, normalised by apps.media.imaging on save.

    alt_text may be blank while drafting — the publish gate is what enforces it,
    because autosave and draft-save must never fail.
    """

    file = models.ImageField(upload_to=upload_to)
    alt_text = models.CharField(max_length=255, blank=True)
    caption = models.CharField(max_length=255, blank=True)
    title = models.CharField(max_length=255, blank=True)
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    filesize = models.PositiveIntegerField(default=0)
    mime = models.CharField(max_length=40, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.alt_text or self.file.name
```

- [ ] **Step 7: Run the tests**

```bash
docker compose exec -T web python manage.py makemigrations media
docker compose exec -T web python manage.py test apps.media -v 2
```

Expected: PASS (4 tests).

- [ ] **Step 8: Register in admin**

`apps/media/admin.py`:

```python
from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin

from .models import MediaAsset


@admin.register(MediaAsset)
class MediaAssetAdmin(ModelAdmin):
    list_display = ("thumb", "alt_text", "width", "height", "uploaded_by", "created_at")
    list_display_links = ("thumb", "alt_text")
    search_fields = ("alt_text", "caption", "title")
    readonly_fields = ("width", "height", "filesize", "mime", "uploaded_by")

    @admin.display(description="Preview")
    def thumb(self, obj):
        if not obj.file:
            return "—"
        return format_html('<img src="{}" style="height:40px;border-radius:4px" />', obj.file.url)
```

- [ ] **Step 9: Commit**

```bash
git add apps/media requirements.txt config/settings.py
git commit -m "feat: media library with server-side image normalisation"
```

---

## Task 3: Author profiles

**Files:**
- Create: `apps/blog/tests/test_author.py`
- Modify: `apps/blog/models.py`, `apps/blog/admin.py`

**Interfaces:**
- Produces: `Author` model with `is_clinician`, `credentials`, and the property `can_medically_review -> bool`. Task 8 depends on `can_medically_review`.

- [ ] **Step 1: Write the failing test**

`apps/blog/tests/test_author.py`:

```python
from django.test import TestCase

from apps.blog.models import Author


class AuthorClinicianTests(TestCase):
    """can_medically_review is the single source of truth for whether this
    person's publish action may stamp a medical review. It requires BOTH the
    clinician flag and real credentials — a flag alone is not an attestation."""

    def test_requires_flag_and_credentials(self):
        both = Author.objects.create(name="Dr Ada", is_clinician=True, credentials="MBBS")
        no_creds = Author.objects.create(name="Dr Bo", is_clinician=True, credentials="")
        not_clinician = Author.objects.create(name="Cee", is_clinician=False, credentials="MBBS")

        self.assertTrue(both.can_medically_review)
        self.assertFalse(no_creds.can_medically_review)
        self.assertFalse(not_clinician.can_medically_review)

    def test_slug_autofills_from_name(self):
        self.assertEqual(Author.objects.create(name="Dr Ada Obi").slug, "dr-ada-obi")
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_author -v 2
```

Expected: FAIL — `ImportError: cannot import name 'Author'`.

- [ ] **Step 3: Add the model**

In `apps/blog/models.py`, above `BlogPost`:

```python
class Author(TimeStamped):
    """A byline and/or a clinical reviewer.

    `is_clinician` + non-empty `credentials` is what authorises this person's
    publish action to stamp a medical review. Nothing else grants it, and no
    UI may assign a review to a third party — see spec §6.4.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="author_profile",
    )
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    credentials = models.CharField(
        max_length=120, blank=True, help_text="e.g. MBBS, MPH — shown after the name."
    )
    title = models.CharField(max_length=160, blank=True, help_text="e.g. Medical Director")
    bio = models.TextField(blank=True)
    photo = models.ForeignKey(
        "media.MediaAsset", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    is_clinician = models.BooleanField(
        default=False, help_text="May attest medical review when publishing. Requires credentials."
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name}, {self.credentials}" if self.credentials else self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def can_medically_review(self) -> bool:
        return bool(self.is_clinician and self.credentials.strip())
```

Add `from django.conf import settings` to the imports at the top of the file.

- [ ] **Step 4: Migrate and run tests**

```bash
docker compose exec -T web python manage.py makemigrations blog
docker compose exec -T web python manage.py test apps.blog.tests.test_author -v 2
```

Expected: PASS (2 tests).

- [ ] **Step 5: Register in admin**

In `apps/blog/admin.py`:

```python
@admin.register(Author)
class AuthorAdmin(ModelAdmin):
    list_display = ("name", "credentials", "title", "is_clinician", "is_active")
    list_filter = ("is_clinician", "is_active")
    search_fields = ("name", "credentials", "title")
    prepopulated_fields = {"slug": ("name",)}
```

Add `Author` to the `from .models import ...` line.

- [ ] **Step 6: Commit**

```bash
git add apps/blog
git commit -m "feat: author profiles with clinician attestation flag"
```

---

## Task 4: BlogPost workflow fields and the status migration

**Files:**
- Create: `apps/blog/tests/test_status.py`
- Modify: `apps/blog/models.py`, `apps/blog/views.py`, `apps/blog/admin.py`
- Create: a data migration (auto-named by Django)

**Interfaces:**
- Produces: `BlogPost.Status` choices (`DRAFT`, `PENDING_REVIEW`, `CHANGES_REQUESTED`, `SCHEDULED`, `PUBLISHED`), fields `draft_body`, `status`, `first_published_at`, `featured_image`, `author`, `approved_by`, `medically_reviewed_by`, `medically_reviewed_at`, `legacy_team_reviewed`, `review_note`, and `BlogPost.objects.live()`.

**Do not drop `is_published` in this task.** It is left in place, stale and unread, so a rolled-back image still has its column.

- [ ] **Step 1: Write the failing test**

`apps/blog/tests/test_status.py`:

```python
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.blog.models import BlogPost


class LiveQuerysetTests(TestCase):
    def setUp(self):
        self.now = timezone.now()

    def test_live_includes_only_published_and_not_future(self):
        live = BlogPost.objects.create(
            title="A", slug="a", status=BlogPost.Status.PUBLISHED,
            published_at=self.now - timedelta(days=1),
        )
        BlogPost.objects.create(title="B", slug="b", status=BlogPost.Status.DRAFT)
        BlogPost.objects.create(
            title="C", slug="c", status=BlogPost.Status.SCHEDULED,
            published_at=self.now + timedelta(days=3),
        )
        BlogPost.objects.create(
            title="D", slug="d", status=BlogPost.Status.PUBLISHED,
            published_at=self.now + timedelta(hours=1),
        )
        self.assertEqual([p.slug for p in BlogPost.objects.live()], [live.slug])

    def test_draft_may_have_no_publish_date(self):
        post = BlogPost.objects.create(title="E", slug="e", status=BlogPost.Status.DRAFT)
        self.assertIsNone(post.published_at)

    def test_reading_minutes_autocomputed_from_body(self):
        post = BlogPost.objects.create(
            title="F", slug="f", body="<p>" + ("word " * 400) + "</p>"
        )
        self.assertEqual(post.reading_minutes, 2)  # 400 words / 200 wpm
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_status -v 2
```

Expected: FAIL — `AttributeError: type object 'BlogPost' has no attribute 'Status'`.

- [ ] **Step 3: Add the manager and fields**

In `apps/blog/models.py`, above `BlogPost`:

```python
class BlogPostQuerySet(models.QuerySet):
    def live(self):
        """Exactly what the public site may see. The only definition of 'live'."""
        return self.filter(
            status=BlogPost.Status.PUBLISHED, published_at__lte=timezone.now()
        )
```

Add to the `BlogPost` class body:

```python
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_REVIEW = "pending_review", "Pending review"
        CHANGES_REQUESTED = "changes_requested", "Changes requested"
        SCHEDULED = "scheduled", "Scheduled"
        PUBLISHED = "published", "Published"

    # Autosave target. `body` is only ever written by an explicit publish, so it
    # always holds exactly what is live — see spec §6.1.
    draft_body = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    first_published_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Set once, on first publish. Locks the slug — never cleared.",
    )
    featured_image = models.ForeignKey(
        "media.MediaAsset", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    author = models.ForeignKey(
        Author, on_delete=models.SET_NULL, null=True, blank=True, related_name="posts"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="approved_posts", help_text="Editorial gate: who let this go live.",
    )
    medically_reviewed_by = models.ForeignKey(
        Author, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_posts",
        help_text="Set server-side from the publishing clinician. Never assignable.",
    )
    medically_reviewed_at = models.DateTimeField(null=True, blank=True)
    legacy_team_reviewed = models.BooleanField(
        default=False,
        help_text="Imported WP posts only — renders the generic clinical-team badge.",
    )
    review_note = models.TextField(blank=True, default="")

    objects = BlogPostQuerySet.as_manager()
```

Change `published_at` to allow nulls (drafts have no date yet):

```python
    published_at = models.DateTimeField(db_index=True, null=True, blank=True)
```

Extend `save()` to auto-compute reading time:

```python
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        words = len(re.sub(r"<[^>]+>", " ", self.body or "").split())
        self.reading_minutes = max(1, round(words / 200)) if words else 1
        super().save(*args, **kwargs)
```

Add `import re` and `from django.utils import timezone` at the top of the file.

- [ ] **Step 4: Create the schema migration**

```bash
docker compose exec -T web python manage.py makemigrations blog
```

- [ ] **Step 5: Write the data migration**

```bash
docker compose exec -T web python manage.py makemigrations blog --empty --name backfill_status_and_legacy_review
```

Fill in the generated file:

```python
from django.db import migrations


def forwards(apps, schema_editor):
    BlogPost = apps.get_model("blog", "BlogPost")
    # Every existing post is an imported WP article: published, and carrying the
    # generic clinical-team badge those ranked pages already display.
    BlogPost.objects.filter(is_published=True).update(
        status="published", legacy_team_reviewed=True
    )
    BlogPost.objects.filter(is_published=False).update(status="draft")
    for post in BlogPost.objects.all():
        # draft_body starts as a copy of live content so the editor opens on
        # exactly what is published.
        BlogPost.objects.filter(pk=post.pk).update(draft_body=post.body)


def backwards(apps, schema_editor):
    BlogPost = apps.get_model("blog", "BlogPost")
    BlogPost.objects.filter(status="published").update(is_published=True)
    BlogPost.objects.exclude(status="published").update(is_published=False)


class Migration(migrations.Migration):
    dependencies = [("blog", "0004_author_blogpost_status_and_more")]  # adjust to actual
    operations = [migrations.RunPython(forwards, backwards)]
```

- [ ] **Step 6: Switch the public viewset to `.live()`**

In `apps/blog/views.py`, replace the `BlogPostViewSet.queryset` and the two querysets inside `related`:

```python
    queryset = BlogPost.objects.live().prefetch_related("categories").select_related(
        "featured_image", "author", "medically_reviewed_by"
    )
```

In `related()`, replace both `BlogPost.objects.filter(is_published=True, ...)` calls with `BlogPost.objects.live().filter(...)` / `BlogPost.objects.live().exclude(...)`.

- [ ] **Step 7: Update the admin fieldsets**

In `apps/blog/admin.py`, replace `is_published` with `status` in `list_display`, `list_filter` and `list_editable`, and extend the fieldsets:

```python
    list_display = ("title", "status", "published_at", "author", "is_featured", "updated_at")
    list_filter = ("status", "is_featured", "categories", "published_at")
    list_editable = ("status", "is_featured")
    autocomplete_fields = ("author", "featured_image", "medically_reviewed_by")
    readonly_fields = ("medically_reviewed_by", "medically_reviewed_at", "approved_by", "first_published_at")
    fieldsets = (
        (None, {"fields": ("title", "slug", "excerpt", "body")}),
        ("Taxonomy", {"fields": ("categories", "tags")}),
        ("Byline & review", {
            "fields": ("author", "medically_reviewed_by", "medically_reviewed_at",
                       "approved_by", "legacy_team_reviewed"),
            "description": "Medical review is stamped automatically from the publishing "
                           "clinician and cannot be assigned here.",
        }),
        ("Display", {"fields": ("featured_image", "published_at", "first_published_at",
                                "reading_minutes", "status", "is_featured")}),
        SEO_FIELDSET,
    )
```

`MediaAssetAdmin` needs `search_fields` for `autocomplete_fields` to work — it already has them from Task 2. Add `search_fields = ("name",)` to `AuthorAdmin` — already present from Task 3.

- [ ] **Step 8: Run the full suite**

```bash
docker compose exec -T web python manage.py migrate
docker compose exec -T web python manage.py test apps -v 2
```

Expected: PASS — including **all three** tests from Task 1, which now pass because `.live()` excludes future-dated posts.

- [ ] **Step 9: Commit**

```bash
git add apps/blog
git commit -m "feat: blog post workflow fields, status enum and live() queryset"
```

---

## Task 5: nh3 sanitization

**Prerequisite: Task 0 must be complete.** The allowlist is built from the emitted-markup sample in `docs/tiptap-roundtrip-report.md`.

**Files:**
- Create: `apps/content/sanitize.py`
- Create: `apps/blog/tests/test_sanitize.py`
- Create: `apps/blog/management/commands/check_sanitizer.py`
- Modify: `apps/blog/models.py`

**Interfaces:**
- Produces: `apps.content.sanitize.clean_html(html: str) -> str`.

- [ ] **Step 1: Write the failing test**

`apps/blog/tests/test_sanitize.py`:

```python
from django.test import TestCase

from apps.blog.models import BlogPost
from apps.content.sanitize import clean_html


class SanitizerTests(TestCase):
    def test_strips_script_and_event_handlers(self):
        out = clean_html('<p onclick="steal()">Hi</p><script>evil()</script>')
        self.assertNotIn("script", out)
        self.assertNotIn("onclick", out)
        self.assertIn("Hi", out)

    def test_strips_iframes_entirely(self):
        self.assertNotIn("iframe", clean_html('<iframe src="https://evil.test"></iframe>'))

    def test_strips_style_attributes(self):
        self.assertNotIn("style", clean_html('<p style="color:red">Hi</p>'))

    def test_demotes_h1_but_keeps_its_text(self):
        out = clean_html("<h1>Title</h1>")
        self.assertNotIn("<h1", out)
        self.assertIn("Title", out)

    def test_keeps_allowlisted_structural_markup(self):
        html = (
            '<figure class="align-left size-medium">'
            '<img src="/media/blog/x.jpg" alt="Nurse" width="800" height="600">'
            "<figcaption>Caption</figcaption></figure>"
            '<div class="callout callout-info"><p>Note</p></div>'
        )
        out = clean_html(html)
        self.assertIn("align-left size-medium", out)
        self.assertIn("callout callout-info", out)
        self.assertIn('alt="Nurse"', out)
        self.assertIn('width="800"', out)

    def test_drops_unknown_classes_but_keeps_allowlisted_ones(self):
        out = clean_html('<div class="callout callout-info evil-class"><p>x</p></div>')
        self.assertIn("callout-info", out)
        self.assertNotIn("evil-class", out)

    def test_rejects_offsite_image_sources(self):
        self.assertNotIn("evil.test", clean_html('<img src="https://evil.test/x.jpg" alt="x">'))

    def test_forces_noopener_on_links(self):
        self.assertIn("noopener", clean_html('<a href="https://example.com">x</a>'))

    def test_strips_javascript_urls(self):
        self.assertNotIn("javascript", clean_html('<a href="javascript:alert(1)">x</a>').lower())


class ModelLayerEnforcementTests(TestCase):
    """Enforcement lives on the model, not the serializer, so Django admin and
    import scripts are covered by the same gate as the studio API."""

    def test_save_sanitizes_body_draft_body_and_excerpt(self):
        post = BlogPost.objects.create(
            title="X", slug="x",
            body="<p>ok</p><script>evil()</script>",
            draft_body="<p>ok</p><iframe src='//evil.test'></iframe>",
            excerpt="<b>hi</b><script>evil()</script>",
        )
        post.refresh_from_db()
        self.assertNotIn("script", post.body)
        self.assertNotIn("iframe", post.draft_body)
        self.assertNotIn("script", post.excerpt)
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_sanitize -v 2
```

Expected: FAIL — `ModuleNotFoundError: No module named 'apps.content.sanitize'`.

- [ ] **Step 3: Write the sanitizer**

`apps/content/sanitize.py`:

```python
"""One sanitization gate for all rich text, enforced at the model layer.

Sanitize once on write, store clean, render fast. Deliberately NOT sanitizing on
the Next render path: a sanitizer upgrade would otherwise silently alter the
markup of 70 ranked posts at read time — an SEO incident we would have built
ourselves. The allowlist mirrors exactly what the Tiptap schema emits (see
docs/tiptap-roundtrip-report.md in the frontend repo).
"""
import nh3

ALLOWED_TAGS = {
    "p", "br", "strong", "em", "u", "s", "a",
    "ul", "ol", "li", "blockquote",
    "h2", "h3", "h4", "hr", "pre", "code",
    "figure", "figcaption", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span",
}

ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "rel"},
    "img": {"src", "alt", "width", "height", "loading"},
    "figure": {"class"},
    "div": {"class"},
    "span": {"class"},
    "th": {"colspan", "rowspan", "scope"},
    "td": {"colspan", "rowspan"},
}

ALLOWED_URL_SCHEMES = {"http", "https", "mailto"}
ALLOWED_CLASS_PREFIXES = ("callout", "align-", "size-")
ALLOWED_IMAGE_PREFIXES = ("/media/", "https://api.inocul8.com.ng/media/")


def _attribute_filter(tag: str, attr: str, value: str):
    """Return the value to keep, or None to drop the attribute."""
    if attr == "class":
        kept = [c for c in value.split() if c.startswith(ALLOWED_CLASS_PREFIXES)]
        return " ".join(kept) or None
    if tag == "img" and attr == "src":
        return value if value.startswith(ALLOWED_IMAGE_PREFIXES) else None
    return value


def clean_html(html: str) -> str:
    """Sanitize untrusted rich text against the blog allowlist."""
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes=ALLOWED_URL_SCHEMES,
        link_rel="noopener",
        attribute_filter=_attribute_filter,
        strip_comments=True,
    )
```

- [ ] **Step 4: Run the sanitizer tests only (not enforcement yet)**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_sanitize.SanitizerTests -v 2
```

Expected: PASS (9 tests). `ModelLayerEnforcementTests` still fails — that is next.

- [ ] **Step 5: Write the offline diff command — the pre-flight gate**

`apps/blog/management/commands/check_sanitizer.py`:

```python
"""Dry-run the sanitizer over every stored body and report what would change.

This must report zero (or hand-approved) changes BEFORE enforcement is wired
into save(). Enforcing first and checking later would mutate 70 ranked posts.
"""
import difflib

from django.core.management.base import BaseCommand

from apps.blog.models import BlogPost
from apps.content.sanitize import clean_html


class Command(BaseCommand):
    help = "Report how nh3 would change existing blog content. Read-only."

    def handle(self, *args, **options):
        changed = 0
        for post in BlogPost.objects.all().order_by("slug"):
            for field in ("body", "excerpt"):
                before = getattr(post, field) or ""
                after = clean_html(before)
                if before.strip() == after.strip():
                    continue
                changed += 1
                self.stdout.write(self.style.WARNING(f"\n=== {post.slug}.{field} ==="))
                for line in difflib.unified_diff(
                    before.splitlines(), after.splitlines(),
                    fromfile="stored", tofile="sanitized", lineterm="", n=1,
                ):
                    self.stdout.write(line)
        verdict = self.style.SUCCESS("clean") if changed == 0 else self.style.ERROR(f"{changed} field(s) would change")
        self.stdout.write(f"\nChecked {BlogPost.objects.count()} posts: {verdict}")
```

- [ ] **Step 6: Run the gate against production data**

```bash
# From the toolkit repo, against the live box:
cd "C:/Users/Hammed/Desktop/Inocul8_Webuzo"
./plink.exe -ssh -batch -P 22 -hostkey "SHA256:sLMnXzaKGwSJkwC9Rm2Achs7OKdg6Fl5h87xn6Jv9GE" \
  -pw "T2JLmb42AvIc600eNi" root@67.223.117.192 \
  "cd /opt/inocul8-backend && docker compose exec -T web python manage.py check_sanitizer"
```

**This is a hard gate.** Expected: `Checked 70 posts: clean`.

If anything would change, read each diff. Whitespace-only differences are approvable — record them in the commit message. A **dropped tag, lost link or lost text** means the allowlist is wrong: fix `ALLOWED_TAGS`/`ALLOWED_ATTRIBUTES` and re-run. Do not proceed to Step 7 until this is clean or every diff is explicitly approved.

- [ ] **Step 7: Wire enforcement into the model**

In `apps/blog/models.py`, inside `BlogPost.save()`, before the `super().save()` call:

```python
        self.body = clean_html(self.body)
        self.draft_body = clean_html(self.draft_body)
        self.excerpt = clean_html(self.excerpt)
```

Add `from apps.content.sanitize import clean_html` at the top.

- [ ] **Step 8: Run the full suite**

```bash
docker compose exec -T web python manage.py test apps -v 2
```

Expected: PASS, including `ModelLayerEnforcementTests`.

- [ ] **Step 9: Commit**

```bash
git add apps/content/sanitize.py apps/blog
git commit -m "feat: nh3 sanitization enforced at the model layer"
```

---

## Task 6: Permissions and groups

**Files:**
- Create: `apps/blog/tests/test_permissions.py`
- Create: `apps/blog/permissions.py`
- Modify: `apps/blog/models.py` (Meta.permissions)
- Create: data migration for the two groups

**Interfaces:**
- Produces: `IsStudioUser`, `CanPublish`, `CanReview` DRF permission classes; groups `Blog Author` and `Blog Editor`.

- [ ] **Step 1: Write the failing test**

`apps/blog/tests/test_permissions.py`:

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase

User = get_user_model()


class GroupPermissionTests(TestCase):
    """Code checks permissions; humans assign groups. Group NAMES are never
    checked in code — renaming a group in admin must not change behaviour."""

    def test_author_group_can_write_but_not_publish(self):
        user = User.objects.create_user("writer", password="x")
        user.groups.add(Group.objects.get(name="Blog Author"))
        user = User.objects.get(pk=user.pk)  # refresh the permission cache

        self.assertTrue(user.has_perm("blog.add_blogpost"))
        self.assertTrue(user.has_perm("blog.change_blogpost"))
        self.assertTrue(user.has_perm("media.add_mediaasset"))
        self.assertFalse(user.has_perm("blog.publish_blogpost"))
        self.assertFalse(user.has_perm("blog.review_blogpost"))

    def test_editor_group_can_publish_and_review(self):
        user = User.objects.create_user("editor", password="x")
        user.groups.add(Group.objects.get(name="Blog Editor"))
        user = User.objects.get(pk=user.pk)

        self.assertTrue(user.has_perm("blog.publish_blogpost"))
        self.assertTrue(user.has_perm("blog.review_blogpost"))
        self.assertTrue(user.has_perm("blog.change_blogpost"))

    def test_studio_users_are_not_django_staff(self):
        """Studio access must never imply Django admin access."""
        user = User.objects.create_user("writer2", password="x")
        user.groups.add(Group.objects.get(name="Blog Author"))
        self.assertFalse(user.is_staff)
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_permissions -v 2
```

Expected: FAIL — `Group matching query does not exist`.

- [ ] **Step 3: Declare the custom permissions**

In `BlogPost.Meta`:

```python
    class Meta:
        ordering = ["-published_at"]
        permissions = [
            ("publish_blogpost", "Can publish, schedule and unpublish blog posts"),
            ("review_blogpost", "Can review submissions and request changes"),
        ]
```

- [ ] **Step 4: Create the groups data migration**

```bash
docker compose exec -T web python manage.py makemigrations blog --empty --name create_studio_groups
```

```python
from django.db import migrations

AUTHOR_PERMS = [
    ("blog", "view_blogpost"), ("blog", "add_blogpost"), ("blog", "change_blogpost"),
    ("blog", "view_blogcategory"), ("blog", "view_author"),
    ("media", "view_mediaasset"), ("media", "add_mediaasset"), ("media", "change_mediaasset"),
]
EDITOR_EXTRA = [
    ("blog", "publish_blogpost"), ("blog", "review_blogpost"),
    ("blog", "add_blogcategory"), ("blog", "delete_blogpost"),
]


def forwards(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    def perms(pairs):
        found = []
        for app_label, codename in pairs:
            found.append(Permission.objects.get(
                codename=codename, content_type__app_label=app_label
            ))
        return found

    author, _ = Group.objects.get_or_create(name="Blog Author")
    author.permissions.set(perms(AUTHOR_PERMS))

    editor, _ = Group.objects.get_or_create(name="Blog Editor")
    editor.permissions.set(perms(AUTHOR_PERMS + EDITOR_EXTRA))


def backwards(apps, schema_editor):
    apps.get_model("auth", "Group").objects.filter(
        name__in=["Blog Author", "Blog Editor"]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("blog", "0006_alter_blogpost_options"),  # adjust to the actual previous migration
        ("media", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]
    operations = [migrations.RunPython(forwards, backwards)]
```

- [ ] **Step 5: Write the permission classes**

`apps/blog/permissions.py`:

```python
"""Studio permission classes.

These check `user.has_perm(...)` only. They must NEVER check `is_staff` (studio
users are not Django admins) and never a group name (renaming a group in admin
must not silently change behaviour).
"""
from rest_framework.permissions import BasePermission


class IsStudioUser(BasePermission):
    """Baseline: may see the studio at all."""

    message = "You do not have access to the blog studio."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.has_perm("blog.view_blogpost"))


class CanPublish(BasePermission):
    message = "You do not have permission to publish."

    def has_permission(self, request, view):
        return bool(request.user and request.user.has_perm("blog.publish_blogpost"))


class CanReview(BasePermission):
    message = "You do not have permission to review submissions."

    def has_permission(self, request, view):
        return bool(request.user and request.user.has_perm("blog.review_blogpost"))
```

- [ ] **Step 6: Migrate and test**

```bash
docker compose exec -T web python manage.py migrate
docker compose exec -T web python manage.py test apps.blog.tests.test_permissions -v 2
```

Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/blog
git commit -m "feat: studio permissions and Blog Author/Editor groups"
```

---

## Task 7: Studio API — router, 401 sweep, and post CRUD

**Files:**
- Create: `apps/blog/studio/__init__.py`, `apps/blog/studio/serializers.py`, `apps/blog/studio/views.py`, `apps/blog/studio/urls.py`
- Create: `apps/blog/tests/test_studio_auth.py`, `apps/blog/tests/test_studio_posts.py`
- Modify: `config/urls.py`

**Interfaces:**
- Produces: `/api/v1/studio/posts/` CRUD + `autosave` action; serializers `StudioPostListSerializer`, `StudioPostDetailSerializer`.

- [ ] **Step 1: Write the 401 sweep — the second non-negotiable guard test**

`apps/blog/tests/test_studio_auth.py`. It **iterates the router** so every endpoint added later inherits the test automatically.

```python
from django.test import TestCase
from django.urls import get_resolver


class StudioRoutesRequireAuthTests(TestCase):
    """Every /api/v1/studio/ route must reject anonymous access. Iterating the
    URL resolver means new endpoints inherit this guard without anyone
    remembering to add a test."""

    def _studio_paths(self):
        paths = []
        for pattern in get_resolver().url_patterns:
            for sub in getattr(pattern, "url_patterns", []):
                route = str(getattr(sub, "pattern", ""))
                full = f"{pattern.pattern}{route}"
                if full.startswith("api/v1/studio/"):
                    paths.append("/" + full)
        return paths

    def test_router_exposes_studio_routes(self):
        self.assertTrue(self._studio_paths(), "No studio routes found — router not wired?")

    def test_all_studio_routes_reject_anonymous(self):
        for path in self._studio_paths():
            if "(?P<" in path or "<" in path:
                continue  # detail routes need an id; list routes prove the gate
            with self.subTest(path=path):
                res = self.client.get(path)
                self.assertIn(
                    res.status_code, (401, 403),
                    f"{path} returned {res.status_code} to an anonymous request",
                )
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_studio_auth -v 2
```

Expected: FAIL — "No studio routes found".

- [ ] **Step 3: Write the studio serializers**

`apps/blog/studio/serializers.py`:

```python
from rest_framework import serializers

from apps.blog.models import Author, BlogCategory, BlogPost
from apps.media.models import MediaAsset

# Fields the client may never set directly. The medical-review stamp in
# particular is recomputed server-side from the publishing user — see spec §6.4.
PROTECTED_FIELDS = (
    "status", "approved_by", "medically_reviewed_by", "medically_reviewed_at",
    "first_published_at", "legacy_team_reviewed", "review_note",
)


class MediaAssetSerializer(serializers.ModelSerializer):
    url = serializers.CharField(source="file.url", read_only=True)

    class Meta:
        model = MediaAsset
        fields = ("id", "url", "alt_text", "caption", "title", "width", "height", "mime", "created_at")
        read_only_fields = ("width", "height", "mime", "created_at")


class StudioAuthorSerializer(serializers.ModelSerializer):
    can_medically_review = serializers.BooleanField(read_only=True)

    class Meta:
        model = Author
        fields = ("id", "name", "slug", "credentials", "title", "is_clinician", "can_medically_review")


class StudioPostListSerializer(serializers.ModelSerializer):
    featured_image = MediaAssetSerializer(read_only=True)
    author_name = serializers.CharField(source="author.name", default="", read_only=True)

    class Meta:
        model = BlogPost
        fields = ("id", "title", "slug", "status", "published_at", "updated_at",
                  "author_name", "featured_image", "is_featured")


class StudioPostDetailSerializer(serializers.ModelSerializer):
    featured_image = MediaAssetSerializer(read_only=True)
    featured_image_id = serializers.PrimaryKeyRelatedField(
        queryset=MediaAsset.objects.all(), source="featured_image",
        write_only=True, required=False, allow_null=True,
    )
    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=BlogCategory.objects.all(), source="categories",
        many=True, write_only=True, required=False,
    )
    categories = serializers.SerializerMethodField()
    medically_reviewed_by = StudioAuthorSerializer(read_only=True)
    has_pending_changes = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = (
            "id", "title", "slug", "excerpt", "body", "draft_body",
            "categories", "category_ids", "tags", "author", "featured_image",
            "featured_image_id", "status", "published_at", "first_published_at",
            "reading_minutes", "is_featured", "updated_at",
            "medically_reviewed_by", "medically_reviewed_at", "legacy_team_reviewed",
            "review_note", "has_pending_changes",
            "meta_title", "meta_description", "focus_keyword", "canonical_url",
            "og_title", "og_description", "noindex",
        )
        read_only_fields = ("body", "reading_minutes", "updated_at") + PROTECTED_FIELDS

    def get_categories(self, obj):
        return [{"id": c.id, "name": c.name, "slug": c.slug} for c in obj.categories.all()]

    def get_has_pending_changes(self, obj):
        return bool(obj.draft_body and obj.draft_body.strip() != (obj.body or "").strip())

    def validate_slug(self, value):
        """The slug is locked once a post has ever been published — spec §6.5."""
        if self.instance and self.instance.first_published_at and value != self.instance.slug:
            raise serializers.ValidationError(
                "This post's URL is locked because it has been published. "
                "Ask the site maintainer if it genuinely needs to change."
            )
        return value
```

- [ ] **Step 4: Write the studio viewset**

`apps/blog/studio/views.py`:

```python
from django.utils.dateparse import parse_datetime
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.blog.models import BlogPost
from apps.blog.permissions import IsStudioUser

from .serializers import StudioPostDetailSerializer, StudioPostListSerializer


class StudioPostViewSet(viewsets.ModelViewSet):
    """Authoring API. Deliberately separate from the public read viewset so the
    public queryset stays hardcoded to live posts with no conditionals to get
    wrong — a draft leak there can be baked into an ISR page."""

    permission_classes = [IsStudioUser]
    lookup_field = "pk"

    def get_queryset(self):
        return (
            BlogPost.objects.all()
            .select_related("featured_image", "author", "medically_reviewed_by")
            .prefetch_related("categories")
            .order_by("-updated_at")
        )

    def get_serializer_class(self):
        return StudioPostListSerializer if self.action == "list" else StudioPostDetailSerializer

    def _assert_not_frozen(self, post):
        """While a post is out for review it is read-only to the submitter.

        Enforced here, not in the UI: a stale browser tab would otherwise keep
        autosaving into a 'frozen' post, and the editor would then approve words
        nobody read.
        """
        if post.status == BlogPost.Status.PENDING_REVIEW and not self.request.user.has_perm(
            "blog.review_blogpost"
        ):
            raise PermissionDenied(
                "This post is out for review and can't be edited. "
                "Use 'Withdraw from review' if you need to keep working on it."
            )

    def _assert_fresh(self, post, expected):
        """Reject a write based on a stale copy rather than clobbering someone."""
        if not expected:
            return
        parsed = parse_datetime(expected)
        if parsed and abs((post.updated_at - parsed).total_seconds()) > 1:
            raise ValidationError({
                "detail": "This post was changed somewhere else. Reload to get the latest version.",
                "code": "stale_write",
            })

    def perform_create(self, serializer):
        # Default the byline to the creating user's own profile so a staff member
        # never has to know what an "Author" record is to start writing.
        serializer.save(author=getattr(self.request.user, "author_profile", None))

    def perform_update(self, serializer):
        self._assert_not_frozen(serializer.instance)
        self._assert_fresh(serializer.instance, self.request.data.get("expected_updated_at"))
        serializer.save()

    def perform_destroy(self, instance):
        if instance.first_published_at and not self.request.user.has_perm("blog.publish_blogpost"):
            raise PermissionDenied("Published posts can only be deleted by an editor.")
        instance.delete()

    @action(detail=True, methods=["patch"])
    def autosave(self, request, pk=None):
        """Debounced draft save. Writes draft_body only — never `body`, which
        always holds exactly what is live (spec §6.1)."""
        post = self.get_object()
        self._assert_not_frozen(post)
        self._assert_fresh(post, request.data.get("expected_updated_at"))

        allowed = {"title", "draft_body", "excerpt", "meta_title", "meta_description",
                   "focus_keyword", "og_title", "og_description", "tags"}
        for field in allowed & set(request.data):
            setattr(post, field, request.data[field])
        post.save()
        return Response(
            {"updated_at": post.updated_at, "status": post.status},
            status=http_status.HTTP_200_OK,
        )
```

- [ ] **Step 5: Wire the router**

`apps/blog/studio/urls.py`:

```python
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import StudioPostViewSet

router = DefaultRouter()
router.root_view_name = "studio-api-root"
router.register("posts", StudioPostViewSet, basename="studio-post")

urlpatterns = [path("", include(router.urls))]
```

In `config/urls.py`, add after the existing blog include:

```python
    path("api/v1/studio/", include("apps.blog.studio.urls")),
```

- [ ] **Step 6: Run the auth sweep**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_studio_auth -v 2
```

Expected: PASS.

- [ ] **Step 7: Write the CRUD behaviour tests**

`apps/blog/tests/test_studio_posts.py`:

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone

from apps.blog.models import BlogPost

User = get_user_model()


class StudioPostTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user("writer", password="x")
        self.author.groups.add(Group.objects.get(name="Blog Author"))
        self.post = BlogPost.objects.create(
            title="Existing", slug="existing", body="<p>live</p>", draft_body="<p>live</p>",
            status=BlogPost.Status.PUBLISHED, published_at=timezone.now(),
            first_published_at=timezone.now(),
        )
        self.client.force_login(self.author)

    def test_autosave_writes_draft_body_and_never_body(self):
        res = self.client.patch(
            f"/api/v1/studio/posts/{self.post.pk}/autosave/",
            {"draft_body": "<p>work in progress</p>"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.post.refresh_from_db()
        self.assertEqual(self.post.draft_body, "<p>work in progress</p>")
        self.assertEqual(self.post.body, "<p>live</p>")  # live content untouched

    def test_autosave_rejects_stale_write(self):
        res = self.client.patch(
            f"/api/v1/studio/posts/{self.post.pk}/autosave/",
            {"draft_body": "<p>x</p>", "expected_updated_at": "2020-01-01T00:00:00Z"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("changed somewhere else", str(res.json()))

    def test_slug_is_locked_after_first_publish(self):
        res = self.client.patch(
            f"/api/v1/studio/posts/{self.post.pk}/",
            {"slug": "renamed"}, content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("locked", str(res.json()).lower())

    def test_slug_is_free_before_first_publish(self):
        draft = BlogPost.objects.create(title="New", slug="new-post")
        res = self.client.patch(
            f"/api/v1/studio/posts/{draft.pk}/",
            {"slug": "new-name"}, content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        draft.refresh_from_db()
        self.assertEqual(draft.slug, "new-name")

    def test_author_cannot_edit_a_post_out_for_review(self):
        self.post.status = BlogPost.Status.PENDING_REVIEW
        self.post.save()
        res = self.client.patch(
            f"/api/v1/studio/posts/{self.post.pk}/autosave/",
            {"draft_body": "<p>sneaky</p>"}, content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)
        self.post.refresh_from_db()
        self.assertEqual(self.post.draft_body, "<p>live</p>")
```

Note: `force_login` works because DRF's `DEFAULT_AUTHENTICATION_CLASSES` includes session auth alongside JWT. The Next BFF uses JWT; tests use sessions for brevity — both hit the same permission classes.

- [ ] **Step 8: Run and fix until green**

```bash
docker compose exec -T web python manage.py test apps.blog -v 2
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/blog config/urls.py
git commit -m "feat: studio post API with autosave, slug lock and review freeze"
```

---

## Task 8: Workflow actions and the medical-review stamp

**Files:**
- Create: `apps/blog/studio/workflow.py`
- Create: `apps/blog/tests/test_studio_workflow.py`
- Modify: `apps/blog/studio/views.py`

**Interfaces:**
- Produces: actions `submit`, `withdraw`, `request_changes`, `publish`, `unpublish`; helper `apply_medical_review(post, user) -> None`.

- [ ] **Step 1: Write the failing test**

`apps/blog/tests/test_studio_workflow.py`:

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone

from apps.blog.models import Author, BlogPost

User = get_user_model()


def make_user(username, group, author_kwargs=None):
    user = User.objects.create_user(username, password="x")
    user.groups.add(Group.objects.get(name=group))
    if author_kwargs is not None:
        Author.objects.create(user=user, **author_kwargs)
    return User.objects.get(pk=user.pk)


class MedicalReviewStampTests(TestCase):
    """The stamp is recomputed from the acting user on every publish. It is
    never inherited, never assignable — spec §6.4."""

    def setUp(self):
        self.clinician = make_user(
            "doc", "Blog Editor", {"name": "Dr Ada", "credentials": "MBBS", "is_clinician": True}
        )
        self.marketer = make_user(
            "mkt", "Blog Editor", {"name": "Bo", "credentials": "", "is_clinician": False}
        )
        self.post = BlogPost.objects.create(
            title="P", slug="p", draft_body="<p>content</p>", status=BlogPost.Status.DRAFT
        )

    def _publish_as(self, user):
        self.client.force_login(user)
        return self.client.post(f"/api/v1/studio/posts/{self.post.pk}/publish/",
                                {}, content_type="application/json")

    def test_clinician_publish_stamps_medical_review(self):
        self.assertEqual(self._publish_as(self.clinician).status_code, 200)
        self.post.refresh_from_db()
        self.assertEqual(self.post.medically_reviewed_by.name, "Dr Ada")
        self.assertIsNotNone(self.post.medically_reviewed_at)

    def test_non_clinician_publish_clears_the_stamp(self):
        self._publish_as(self.clinician)
        self.post.refresh_from_db()
        self.post.draft_body = "<p>edited content</p>"
        self.post.save()

        self.assertEqual(self._publish_as(self.marketer).status_code, 200)
        self.post.refresh_from_db()
        self.assertIsNone(self.post.medically_reviewed_by)
        self.assertIsNone(self.post.medically_reviewed_at)

    def test_publish_promotes_draft_body_to_body(self):
        self._publish_as(self.clinician)
        self.post.refresh_from_db()
        self.assertEqual(self.post.body, "<p>content</p>")
        self.assertEqual(self.post.status, BlogPost.Status.PUBLISHED)
        self.assertIsNotNone(self.post.first_published_at)

    def test_first_published_at_is_not_overwritten_on_republish(self):
        self._publish_as(self.clinician)
        self.post.refresh_from_db()
        original = self.post.first_published_at
        self._publish_as(self.clinician)
        self.post.refresh_from_db()
        self.assertEqual(self.post.first_published_at, original)


class WorkflowTransitionTests(TestCase):
    def setUp(self):
        self.writer = make_user("w", "Blog Author")
        self.editor = make_user("e", "Blog Editor")
        self.post = BlogPost.objects.create(title="Q", slug="q", draft_body="<p>x</p>")

    def test_author_cannot_publish(self):
        self.client.force_login(self.writer)
        res = self.client.post(f"/api/v1/studio/posts/{self.post.pk}/publish/",
                               {}, content_type="application/json")
        self.assertEqual(res.status_code, 403)

    def test_author_submits_for_review(self):
        self.client.force_login(self.writer)
        res = self.client.post(f"/api/v1/studio/posts/{self.post.pk}/submit/",
                               {}, content_type="application/json")
        self.assertEqual(res.status_code, 200)
        self.post.refresh_from_db()
        self.assertEqual(self.post.status, BlogPost.Status.PENDING_REVIEW)

    def test_author_can_withdraw_from_review(self):
        self.post.status = BlogPost.Status.PENDING_REVIEW
        self.post.save()
        self.client.force_login(self.writer)
        res = self.client.post(f"/api/v1/studio/posts/{self.post.pk}/withdraw/",
                               {}, content_type="application/json")
        self.assertEqual(res.status_code, 200)
        self.post.refresh_from_db()
        self.assertEqual(self.post.status, BlogPost.Status.DRAFT)

    def test_editor_requests_changes_with_a_note(self):
        self.post.status = BlogPost.Status.PENDING_REVIEW
        self.post.save()
        self.client.force_login(self.editor)
        res = self.client.post(
            f"/api/v1/studio/posts/{self.post.pk}/request-changes/",
            {"note": "Please add the dosing schedule."}, content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.post.refresh_from_db()
        self.assertEqual(self.post.status, BlogPost.Status.CHANGES_REQUESTED)
        self.assertIn("dosing schedule", self.post.review_note)

    def test_scheduling_sets_scheduled_status_and_future_date(self):
        self.client.force_login(self.editor)
        future = (timezone.now() + timezone.timedelta(days=2)).isoformat()
        res = self.client.post(f"/api/v1/studio/posts/{self.post.pk}/publish/",
                               {"publish_at": future}, content_type="application/json")
        self.assertEqual(res.status_code, 200)
        self.post.refresh_from_db()
        self.assertEqual(self.post.status, BlogPost.Status.SCHEDULED)
        self.assertNotIn(self.post, BlogPost.objects.live())

    def test_publish_refuses_when_an_image_lacks_alt_text(self):
        self.post.draft_body = '<figure class="align-center size-large"><img src="/media/blog/a.jpg" alt=""><figcaption>c</figcaption></figure>'
        self.post.save()
        self.client.force_login(self.editor)
        res = self.client.post(f"/api/v1/studio/posts/{self.post.pk}/publish/",
                               {}, content_type="application/json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("alt text", str(res.json()).lower())
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_studio_workflow -v 2
```

Expected: FAIL — 404s, because none of the actions exist.

- [ ] **Step 3: Write the workflow helpers**

`apps/blog/studio/workflow.py`:

```python
"""Workflow transitions for blog posts.

Design covenant (spec §3):
  1. Staff can never take an irreversible or public-facing action implicitly.
  2. No claim ships that the system didn't witness.
"""
import re

from django.utils import timezone

IMG_TAG = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
ALT_ATTR = re.compile(r'\balt\s*=\s*"([^"]*)"', re.IGNORECASE)


def images_missing_alt(html: str) -> int:
    """Count <img> tags with no meaningful alt text."""
    missing = 0
    for tag in IMG_TAG.findall(html or ""):
        match = ALT_ATTR.search(tag)
        if not match or not match.group(1).strip():
            missing += 1
    return missing


def apply_medical_review(post, user) -> None:
    """Recompute the medical-review stamp from the acting user, every time.

    Never inherited from a previous publish: if a non-clinician republishes, the
    badge is cleared, because that clinician did not review the new words.
    """
    profile = getattr(user, "author_profile", None)
    if profile and profile.can_medically_review:
        post.medically_reviewed_by = profile
        post.medically_reviewed_at = timezone.now()
    else:
        post.medically_reviewed_by = None
        post.medically_reviewed_at = None


def promote_draft_to_live(post, user, publish_at=None) -> None:
    """The ONLY place `body` is ever written from `draft_body`."""
    from apps.blog.models import BlogPost

    now = timezone.now()
    post.body = post.draft_body or post.body
    post.approved_by = user
    post.review_note = ""

    if publish_at and publish_at > now:
        post.status = BlogPost.Status.SCHEDULED
        post.published_at = publish_at
    else:
        post.status = BlogPost.Status.PUBLISHED
        post.published_at = publish_at or post.published_at or now
        if post.first_published_at is None:
            post.first_published_at = post.published_at

    apply_medical_review(post, user)
    post.save()
```

- [ ] **Step 4: Add the actions to the viewset**

Append to `StudioPostViewSet` in `apps/blog/studio/views.py`:

```python
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        post = self.get_object()
        post.status = BlogPost.Status.PENDING_REVIEW
        post.save()
        notify_submitted_for_review(post, request.user)
        return Response({"status": post.status})

    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        post = self.get_object()
        if post.status != BlogPost.Status.PENDING_REVIEW:
            raise ValidationError({"detail": "This post is not out for review."})
        post.status = BlogPost.Status.DRAFT
        post.save()
        return Response({"status": post.status})

    @action(detail=True, methods=["post"], url_path="request-changes",
            permission_classes=[IsStudioUser, CanReview])
    def request_changes(self, request, pk=None):
        note = (request.data.get("note") or "").strip()
        if not note:
            raise ValidationError({"note": "Tell the author what needs changing."})
        post = self.get_object()
        post.status = BlogPost.Status.CHANGES_REQUESTED
        post.review_note = note
        post.save()
        notify_changes_requested(post, request.user, note)
        return Response({"status": post.status, "review_note": post.review_note})

    @action(detail=True, methods=["post"], permission_classes=[IsStudioUser, CanPublish])
    def publish(self, request, pk=None):
        post = self.get_object()
        self._assert_fresh(post, request.data.get("expected_updated_at"))

        missing = images_missing_alt(post.draft_body or post.body)
        if missing:
            raise ValidationError({
                "detail": f"{missing} image(s) still need alt text before this can be published.",
                "code": "missing_alt",
            })

        publish_at = parse_datetime(request.data["publish_at"]) if request.data.get("publish_at") else None
        promote_draft_to_live(post, request.user, publish_at)
        revalidate_post(post)
        return Response(StudioPostDetailSerializer(post).data)

    @action(detail=True, methods=["post"], permission_classes=[IsStudioUser, CanPublish])
    def unpublish(self, request, pk=None):
        post = self.get_object()
        post.status = BlogPost.Status.DRAFT
        post.save()
        revalidate_post(post)
        return Response({"status": post.status})
```

Add the imports at the top of `views.py`:

```python
from apps.blog.permissions import CanPublish, CanReview, IsStudioUser
from .notifications import notify_changes_requested, notify_submitted_for_review
from .workflow import images_missing_alt, promote_draft_to_live
from apps.content.revalidate import revalidate_post
```

**Note:** `notifications` is built in Task 10 and `revalidate_post` may already exist in `apps/content` from the existing revalidation webhook — check `grep -rn "revalidate" apps/content/` and reuse the existing helper. If the existing helper has a different name or signature, use it instead of inventing `revalidate_post`. **Create temporary no-op stubs now** so this task's tests can run, and replace them in Task 10.

- [ ] **Step 5: Run the tests**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_studio_workflow -v 2
```

Expected: PASS (10 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/blog
git commit -m "feat: studio workflow actions and medical-review attestation"
```

---

## Task 9: Media upload and supporting studio endpoints

**Files:**
- Create: `apps/media/tests/test_upload_api.py`
- Modify: `apps/blog/studio/views.py`, `apps/blog/studio/urls.py`

**Interfaces:**
- Produces: `/api/v1/studio/media/` (list, upload, patch, delete), `/api/v1/studio/authors/`, `/api/v1/studio/categories/`, `/api/v1/studio/me/`.

- [ ] **Step 1: Write the failing test**

`apps/media/tests/test_upload_api.py`:

```python
import io

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from PIL import Image

from apps.media.models import MediaAsset

User = get_user_model()


def png_upload(width=3000, height=1500):
    buf = io.BytesIO()
    Image.new("RGB", (width, height), "blue").save(buf, format="PNG")
    buf.seek(0)
    buf.name = "photo.png"
    return buf


class MediaUploadTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("writer", password="x")
        self.user.groups.add(Group.objects.get(name="Blog Author"))
        self.client.force_login(User.objects.get(pk=self.user.pk))

    def test_upload_normalises_and_records_dimensions(self):
        res = self.client.post("/api/v1/studio/media/",
                               {"file": png_upload(), "alt_text": "A nurse"}, format="multipart")
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body["width"], 2560)   # downscaled from 3000
        self.assertEqual(body["height"], 1280)
        self.assertEqual(body["alt_text"], "A nurse")
        self.assertTrue(body["url"].startswith("/media/blog/"))

    def test_upload_rejects_non_image(self):
        bad = io.BytesIO(b"not an image")
        bad.name = "x.png"
        res = self.client.post("/api/v1/studio/media/", {"file": bad}, format="multipart")
        self.assertEqual(res.status_code, 400)

    def test_upload_records_uploader(self):
        self.client.post("/api/v1/studio/media/", {"file": png_upload(800, 600)}, format="multipart")
        self.assertEqual(MediaAsset.objects.first().uploaded_by, self.user)

    def test_anonymous_upload_is_rejected(self):
        self.client.logout()
        res = self.client.post("/api/v1/studio/media/", {"file": png_upload(800, 600)}, format="multipart")
        self.assertIn(res.status_code, (401, 403))
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.media.tests.test_upload_api -v 2
```

Expected: FAIL — 404.

- [ ] **Step 3: Implement the media viewset**

Append to `apps/blog/studio/views.py`:

```python
class StudioMediaViewSet(viewsets.ModelViewSet):
    """Upload and manage blog images. Every upload is normalised server-side:
    real content-type sniffing, HEIC support for staff iPhones, EXIF stripped
    (phone photos carry GPS), downscaled and re-encoded."""

    permission_classes = [IsStudioUser]
    serializer_class = MediaAssetSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = MediaAsset.objects.all()

    def create(self, request, *args, **kwargs):
        upload = request.FILES.get("file")
        if not upload:
            raise ValidationError({"file": "No file was uploaded."})
        try:
            processed, width, height, mime = process_upload(upload)
        except ImageRejected as exc:
            raise ValidationError({"file": str(exc)})

        asset = MediaAsset(
            alt_text=request.data.get("alt_text", ""),
            caption=request.data.get("caption", ""),
            title=request.data.get("title", ""),
            width=width, height=height, mime=mime,
            filesize=processed.size, uploaded_by=request.user,
        )
        ext = "webp" if mime == "image/webp" else "jpg"
        asset.file.save(f"{uuid.uuid4().hex}.{ext}", processed, save=True)
        return Response(self.get_serializer(asset).data, status=http_status.HTTP_201_CREATED)


class StudioAuthorViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsStudioUser]
    serializer_class = StudioAuthorSerializer
    queryset = Author.objects.filter(is_active=True)


class StudioCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStudioUser]
    serializer_class = StudioCategorySerializer
    queryset = BlogCategory.objects.all()

    def perform_create(self, serializer):
        if not self.request.user.has_perm("blog.add_blogcategory"):
            raise PermissionDenied("Only editors can create categories.")
        serializer.save()


class StudioMeView(APIView):
    """Who am I and what may I do — drives the studio's UI gating."""

    permission_classes = [IsStudioUser]

    def get(self, request):
        profile = getattr(request.user, "author_profile", None)
        return Response({
            "id": request.user.id,
            "username": request.user.get_username(),
            "name": (profile.name if profile else request.user.get_full_name()) or request.user.get_username(),
            "can_publish": request.user.has_perm("blog.publish_blogpost"),
            "can_review": request.user.has_perm("blog.review_blogpost"),
            "can_medically_review": bool(profile and profile.can_medically_review),
            "credentials": profile.credentials if profile else "",
        })
```

Add a `StudioCategorySerializer` to `serializers.py`:

```python
class StudioCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogCategory
        fields = ("id", "name", "slug", "description")
        read_only_fields = ("slug",)
```

Add imports to `views.py`: `uuid`, `from rest_framework.parsers import MultiPartParser, FormParser, JSONParser`, `from rest_framework.views import APIView`, `from apps.media.models import MediaAsset`, `from apps.media.imaging import ImageRejected, process_upload`, `from apps.blog.models import Author, BlogCategory`, and the new serializers.

- [ ] **Step 4: Register the routes**

In `apps/blog/studio/urls.py`:

```python
router.register("media", StudioMediaViewSet, basename="studio-media")
router.register("authors", StudioAuthorViewSet, basename="studio-author")
router.register("categories", StudioCategoryViewSet, basename="studio-category")

urlpatterns = [
    path("me/", StudioMeView.as_view(), name="studio-me"),
    path("", include(router.urls)),
]
```

- [ ] **Step 5: Run the full suite**

```bash
docker compose exec -T web python manage.py test apps -v 2
```

Expected: PASS — including the 401 sweep, which now automatically covers the three new endpoints.

- [ ] **Step 6: Commit**

```bash
git add apps
git commit -m "feat: studio media upload, author, category and me endpoints"
```

---

## Task 10: Review notification emails

**Files:**
- Create: `apps/blog/studio/notifications.py`
- Create: `templates/email/review_submitted.txt`, `templates/email/changes_requested.txt`
- Create: `apps/blog/tests/test_notifications.py`
- Modify: `apps/blog/studio/views.py` (replace the Task 8 stubs)

**Interfaces:**
- Produces: `notify_submitted_for_review(post, user)`, `notify_changes_requested(post, user, note)`.

- [ ] **Step 1: Write the failing test**

`apps/blog/tests/test_notifications.py`:

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core import mail
from django.test import TestCase

from apps.blog.models import BlogPost
from apps.blog.studio.notifications import notify_changes_requested, notify_submitted_for_review

User = get_user_model()


class NotificationTests(TestCase):
    def setUp(self):
        self.writer = User.objects.create_user("writer", email="writer@test.ng", password="x")
        self.writer.groups.add(Group.objects.get(name="Blog Author"))
        self.editor = User.objects.create_user("editor", email="editor@test.ng", password="x")
        self.editor.groups.add(Group.objects.get(name="Blog Editor"))
        self.post = BlogPost.objects.create(title="A post", slug="a-post")

    def test_submission_emails_every_editor(self):
        notify_submitted_for_review(self.post, self.writer)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("editor@test.ng", mail.outbox[0].to)
        self.assertIn("A post", mail.outbox[0].subject)

    def test_changes_requested_emails_the_author_with_the_note(self):
        notify_changes_requested(self.post, self.editor, "Add the dosing schedule.")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("writer@test.ng", mail.outbox[0].to)
        self.assertIn("dosing schedule", mail.outbox[0].body)

    def test_no_crash_when_nobody_has_an_email_address(self):
        User.objects.all().update(email="")
        notify_submitted_for_review(self.post, self.writer)
        self.assertEqual(len(mail.outbox), 0)
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_notifications -v 2
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`apps/blog/studio/notifications.py`:

```python
"""Two transactional emails, and only two.

Clinic staff will not sit in the studio waiting: the review loop's latency IS
the email. Deliberately no digests, no notification centre, no preferences.
"""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

log = logging.getLogger(__name__)
STUDIO_URL = getattr(settings, "STUDIO_BASE_URL", "https://inocul8.com.ng/studio")


def _send(subject, template, context, recipients):
    recipients = [r for r in recipients if r]
    if not recipients:
        log.warning("Skipping '%s' — no recipients with an email address.", subject)
        return
    try:
        EmailMessage(
            subject=subject,
            body=render_to_string(template, context),
            to=recipients,
        ).send(fail_silently=False)
    except Exception:  # never let a notification break a workflow transition
        log.exception("Failed to send studio notification: %s", subject)


def _editor_emails():
    User = get_user_model()
    return list(
        User.objects.filter(groups__name="Blog Editor")
        .exclude(email="")
        .values_list("email", flat=True)
        .distinct()
    )


def notify_submitted_for_review(post, user):
    _send(
        subject=f"Review needed: {post.title}",
        template="email/review_submitted.txt",
        context={"post": post, "user": user, "url": f"{STUDIO_URL}/posts/{post.pk}"},
        recipients=_editor_emails(),
    )


def notify_changes_requested(post, editor, note):
    author_email = getattr(getattr(post, "author", None), "user", None)
    recipients = [author_email.email] if author_email else []
    _send(
        subject=f"Changes requested: {post.title}",
        template="email/changes_requested.txt",
        context={"post": post, "editor": editor, "note": note,
                 "url": f"{STUDIO_URL}/posts/{post.pk}"},
        recipients=recipients,
    )
```

**Note on `notify_changes_requested`:** it emails the post's `author.user`. If `post.author` is unset (common for a first draft), fall back to the last user who edited it — retrieve via auditlog, or simply skip. For v1, skipping with the logged warning is acceptable; the studio banner still shows the note.

`templates/email/review_submitted.txt`:

```
{{ user.get_username }} submitted "{{ post.title }}" for review.

Review it here: {{ url }}

— Inocul8 Blog Studio
```

`templates/email/changes_requested.txt`:

```
{{ editor.get_username }} has requested changes to "{{ post.title }}".

Note from the editor:
{{ note }}

Open the post: {{ url }}

— Inocul8 Blog Studio
```

- [ ] **Step 4: Replace the Task 8 stubs and run tests**

Delete the temporary no-op stubs in `views.py` and confirm the real imports resolve.

```bash
docker compose exec -T web python manage.py test apps -v 2
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps templates
git commit -m "feat: review submission and changes-requested notification emails"
```

---

## Task 11: Public API additive changes

**Files:**
- Modify: `apps/blog/serializers.py`
- Create: `apps/blog/tests/test_public_payload.py`

**Interfaces:**
- Produces: `featured_image`, `author`, `medically_reviewed_by`, `legacy_team_reviewed`, `og_title`, `og_description` on the public detail payload. Plan 2 Task 13 consumes these.

**Constraint: additive only.** No existing field may be renamed, retyped or removed — the deployed frontend builds against this payload.

- [ ] **Step 1: Write the failing test**

`apps/blog/tests/test_public_payload.py`:

```python
from django.test import TestCase
from django.utils import timezone

from apps.blog.models import Author, BlogPost

EXISTING_LIST_FIELDS = {
    "id", "title", "slug", "excerpt", "categories", "tags", "reading_minutes", "published_at",
}
EXISTING_DETAIL_FIELDS = EXISTING_LIST_FIELDS | {
    "body", "updated_at", "meta_title", "meta_description", "focus_keyword",
    "canonical_url", "noindex",
}


class PublicPayloadIsAdditiveOnlyTests(TestCase):
    """The deployed frontend builds against this payload. New keys are fine;
    a removed or renamed key breaks the live site's build."""

    def setUp(self):
        self.post = BlogPost.objects.create(
            title="T", slug="t", body="<p>x</p>", status=BlogPost.Status.PUBLISHED,
            published_at=timezone.now(), legacy_team_reviewed=True,
        )

    def test_list_keeps_every_existing_field(self):
        row = self.client.get("/api/v1/posts/").json()["results"][0]
        self.assertTrue(EXISTING_LIST_FIELDS.issubset(row.keys()),
                        f"missing: {EXISTING_LIST_FIELDS - row.keys()}")

    def test_detail_keeps_every_existing_field(self):
        row = self.client.get("/api/v1/posts/t/").json()
        self.assertTrue(EXISTING_DETAIL_FIELDS.issubset(row.keys()),
                        f"missing: {EXISTING_DETAIL_FIELDS - row.keys()}")

    def test_detail_exposes_the_new_review_and_media_fields(self):
        row = self.client.get("/api/v1/posts/t/").json()
        for key in ("featured_image", "author", "medically_reviewed_by",
                    "legacy_team_reviewed", "og_title", "og_description"):
            self.assertIn(key, row)
        self.assertTrue(row["legacy_team_reviewed"])
        self.assertIsNone(row["medically_reviewed_by"])

    def test_reviewer_is_exposed_with_credentials_when_set(self):
        self.post.medically_reviewed_by = Author.objects.create(
            name="Dr Ada", credentials="MBBS", is_clinician=True
        )
        self.post.save()
        row = self.client.get("/api/v1/posts/t/").json()
        self.assertEqual(row["medically_reviewed_by"]["name"], "Dr Ada")
        self.assertEqual(row["medically_reviewed_by"]["credentials"], "MBBS")
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_public_payload -v 2
```

Expected: the first two tests PASS (proving nothing is broken), the last two FAIL.

- [ ] **Step 3: Extend the public serializers**

In `apps/blog/serializers.py`, add and wire in:

```python
class PublicAuthorSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Author
        fields = ("name", "slug", "credentials", "title", "bio", "photo_url")

    def get_photo_url(self, obj):
        return obj.photo.file.url if obj.photo and obj.photo.file else None


class PublicImageSerializer(serializers.ModelSerializer):
    url = serializers.CharField(source="file.url", read_only=True)

    class Meta:
        model = MediaAsset
        fields = ("url", "alt_text", "caption", "width", "height")
```

Extend `BlogPostListSerializer.Meta.fields` with `"featured_image"` and add
`featured_image = PublicImageSerializer(read_only=True)`.

Extend `BlogPostDetailSerializer` with:

```python
    featured_image = PublicImageSerializer(read_only=True)
    author = PublicAuthorSerializer(read_only=True)
    medically_reviewed_by = PublicAuthorSerializer(read_only=True)
```

and add to `Meta.fields`: `"featured_image", "author", "medically_reviewed_by",
"medically_reviewed_at", "legacy_team_reviewed", "og_title", "og_description"`.

**Do not remove or rename anything already in those tuples.**

- [ ] **Step 4: Add the SEOFields columns**

In `apps/content/models.py`, add to `SEOFields`:

```python
    og_title = models.CharField(max_length=255, blank=True)
    og_description = models.TextField(blank=True, help_text="Falls back to the meta description.")
```

Then:

```bash
docker compose exec -T web python manage.py makemigrations content blog
docker compose exec -T web python manage.py migrate
docker compose exec -T web python manage.py test apps -v 2
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps
git commit -m "feat: expose featured image, author and review fields on the public API"
```

---

## Task 12: Scheduled publishing and operations

**Files:**
- Create: `apps/blog/management/commands/publish_due.py`
- Create: `apps/blog/tests/test_publish_due.py`
- Modify: `apps/blog/admin.py` (slug-change action)

**Interfaces:**
- Produces: `manage.py publish_due`.

- [ ] **Step 1: Write the failing test**

`apps/blog/tests/test_publish_due.py`:

```python
from datetime import timedelta

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.blog.models import BlogPost


class PublishDueTests(TestCase):
    def test_flips_due_scheduled_posts_to_published(self):
        due = BlogPost.objects.create(
            title="Due", slug="due", status=BlogPost.Status.SCHEDULED,
            published_at=timezone.now() - timedelta(minutes=1), draft_body="<p>x</p>",
        )
        later = BlogPost.objects.create(
            title="Later", slug="later", status=BlogPost.Status.SCHEDULED,
            published_at=timezone.now() + timedelta(days=1), draft_body="<p>x</p>",
        )
        call_command("publish_due")

        due.refresh_from_db()
        later.refresh_from_db()
        self.assertEqual(due.status, BlogPost.Status.PUBLISHED)
        self.assertEqual(later.status, BlogPost.Status.SCHEDULED)
        self.assertIn(due, BlogPost.objects.live())

    def test_sets_first_published_at_once(self):
        post = BlogPost.objects.create(
            title="D", slug="d", status=BlogPost.Status.SCHEDULED,
            published_at=timezone.now() - timedelta(minutes=1),
        )
        call_command("publish_due")
        post.refresh_from_db()
        self.assertIsNotNone(post.first_published_at)
```

- [ ] **Step 2: Run it to verify it fails**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_publish_due -v 2
```

Expected: FAIL — `Unknown command: 'publish_due'`.

- [ ] **Step 3: Implement the command**

`apps/blog/management/commands/publish_due.py`:

```python
"""Flip scheduled posts live once their time arrives, then revalidate.

Run from cron every 5 minutes. Celery is deliberately not used — it is not in
requirements.txt and this does not warrant a queue.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.blog.models import BlogPost


class Command(BaseCommand):
    help = "Publish scheduled posts whose publish time has arrived."

    def handle(self, *args, **options):
        due = BlogPost.objects.filter(
            status=BlogPost.Status.SCHEDULED, published_at__lte=timezone.now()
        )
        count = 0
        for post in due:
            post.status = BlogPost.Status.PUBLISHED
            if post.first_published_at is None:
                post.first_published_at = post.published_at
            post.save()
            count += 1
            self.stdout.write(f"Published {post.slug}")
        if count:
            from apps.content.revalidate import revalidate_all  # reuse existing helper
            revalidate_all()
        self.stdout.write(self.style.SUCCESS(f"{count} post(s) published."))
```

**Before writing the import:** run `grep -rn "revalidate" apps/content/` and use whatever helper already exists (the revalidation webhook is already in production). Do not create a second revalidation path.

- [ ] **Step 4: Run the tests**

```bash
docker compose exec -T web python manage.py test apps.blog.tests.test_publish_due -v 2
```

Expected: PASS.

- [ ] **Step 5: Add the maintainer-only slug-change admin action**

Slug changes on ranked URLs are an architectural decision, not an authoring one, so this lives in admin (maintainer-only) rather than the studio — see spec §6.5. In `apps/blog/admin.py`, add the imports:

```python
from django.contrib import messages
from django.db import transaction

from apps.content.models import Redirect
```

and add `save_model` to `BlogPostAdmin`:

```python
    def save_model(self, request, obj, form, change):
        if change and "slug" in form.changed_data:
            old_slug = form.initial["slug"]
            with transaction.atomic():
                super().save_model(request, obj, form, change)
                Redirect.objects.update_or_create(
                    old_path=f"/{old_slug}",
                    defaults={"new_path": f"/{obj.slug}", "status_code": 301,
                              "is_active": True, "note": "Blog slug change"},
                )
                # Collapse chains: anything pointing at the old slug now points
                # straight at the new one, so a -> b -> c never forms.
                Redirect.objects.filter(new_path=f"/{old_slug}").update(new_path=f"/{obj.slug}")
            messages.warning(request, f"301 created: /{old_slug} → /{obj.slug}")
        else:
            super().save_model(request, obj, form, change)
```

- [ ] **Step 6: Run the full suite and commit**

```bash
docker compose exec -T web python manage.py test apps -v 2
git add apps
git commit -m "feat: scheduled publishing command and slug-change redirect guard"
```

---

## Task 13: Register auditlog, deploy and verify

**Files:**
- Modify: `apps/blog/apps.py` (auditlog registration), `config/settings.py` (throttling)

- [ ] **Step 1: Register the new models with auditlog**

Find how existing models are registered (`grep -rn "auditlog" apps/ config/`) and follow the same pattern for `BlogPost`, `MediaAsset` and `Author`. If registration happens in an `AppConfig.ready()`, add there.

- [ ] **Step 2: Add studio write throttling**

In `config/settings.py`, inside `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`, add:

```python
    "studio": "300/hour",
```

and set `throttle_scope = "studio"` on `StudioPostViewSet` and `StudioMediaViewSet`.

- [ ] **Step 3: Run the whole suite one final time**

```bash
docker compose exec -T web python manage.py test apps -v 2
```

Expected: PASS, all tests.

- [ ] **Step 4: Push and deploy**

```bash
git push -u origin feat/blog-studio
```

Then on the VPS:

```bash
cd "C:/Users/Hammed/Desktop/Inocul8_Webuzo"
./plink.exe -ssh -batch -P 22 -hostkey "SHA256:sLMnXzaKGwSJkwC9Rm2Achs7OKdg6Fl5h87xn6Jv9GE" \
  -pw "T2JLmb42AvIc600eNi" root@67.223.117.192 \
  "cd /opt/inocul8-backend && git fetch origin && git checkout feat/blog-studio && git pull && \
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build web"
```

The entrypoint runs `migrate` automatically.

- [ ] **Step 5: Verify the live public API is unchanged**

```bash
curl -s "https://api.inocul8.com.ng/api/v1/posts/" | head -c 400
curl -s "https://api.inocul8.com.ng/api/v1/posts/" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('count:',JSON.parse(d).count))"
```

Expected: **count: 70**. If it is not exactly 70, stop and investigate before doing anything else — that is a live SEO regression.

- [ ] **Step 6: Verify studio endpoints are locked**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.inocul8.com.ng/api/v1/studio/posts/
```

Expected: `401` or `403`.

- [ ] **Step 7: Run the URL verifier against production**

The toolkit repo already has the right tool for this moment:

```bash
cd "C:/Users/Hammed/Desktop/Inocul8_Webuzo" && node scripts/verify-urls.mjs
```

Expected: all 70 post URLs still 200.

- [ ] **Step 8: Install the cron job**

```bash
./plink.exe -ssh -batch -P 22 -hostkey "SHA256:sLMnXzaKGwSJkwC9Rm2Achs7OKdg6Fl5h87xn6Jv9GE" \
  -pw "T2JLmb42AvIc600eNi" root@67.223.117.192 \
  "(crontab -l 2>/dev/null; echo '*/5 * * * * cd /opt/inocul8-backend && docker compose exec -T web python manage.py publish_due >> /var/log/inocul8-publish.log 2>&1') | crontab -"
```

Verify: `crontab -l | grep publish_due`

- [ ] **Step 9: Add media to backups**

`/opt/inocul8-backend/media` is currently **not backed up**. Once staff upload images it becomes irreplaceable client data on a single VPS. Find the existing Postgres backup job (`crontab -l`, and check `/opt` for backup scripts) and extend it to include the media directory, or add:

```bash
0 3 * * * tar czf /var/backups/inocul8-media-$(date +\%F).tar.gz -C /opt/inocul8-backend media && find /var/backups -name 'inocul8-media-*' -mtime +14 -delete
```

- [ ] **Step 10: Create the studio accounts**

In Django admin, create one user per staff member with **`is_staff=False`**, and add each to `Blog Author` or `Blog Editor`. For clinicians, also create an `Author` profile with `is_clinician=True` and real `credentials`, linked to their user.

- [ ] **Step 11: Commit any final changes**

```bash
git add -A && git commit -m "chore: auditlog registration and studio throttling"
git push
```

---

## Definition of done

- [ ] `docker compose exec -T web python manage.py test apps` passes end to end.
- [ ] `check_sanitizer` reports clean against production data.
- [ ] The public API still returns exactly 70 posts, with every pre-existing field intact.
- [ ] Every `/api/v1/studio/` route returns 401/403 anonymously.
- [ ] `is_published` still exists in the database (dropped later, in Plan 2's closing task).
- [ ] `body` is still editable in Django admin (locked later, in Plan 2's closing task).
- [ ] `publish_due` cron installed; media directory backed up.
