// Shared studio API contract. Field names verified against the live backend
// (https://api.inocul8.com.ng/api/v1/studio/) with the studio-test account —
// not hand-guessed — so treat this file as the source of truth for shape,
// not the Django serializers.

export type PostStatus =
  | "draft" | "pending_review" | "changes_requested" | "scheduled" | "published";

export type MediaAssetT = {
  id: number; url: string; alt_text: string; caption: string; title: string;
  width: number; height: number; mime: string; created_at: string;
};

export type StudioAuthorT = {
  id: number; name: string; slug: string; credentials: string;
  title: string; is_clinician: boolean; can_medically_review: boolean;
};

export type StudioCategoryT = { id: number; name: string; slug: string };

export type StudioPostRow = {
  id: number; title: string; slug: string; status: PostStatus;
  published_at: string | null; updated_at: string;
  author_name: string; featured_image: MediaAssetT | null; is_featured: boolean;
};

// NOTE: the detail endpoint (`GET /studio/posts/:id/`) does NOT return
// `author_name` — only the list endpoint does. Detail exposes the raw
// `author` foreign key id instead, so StudioPostDetail intentionally omits
// author_name rather than inheriting it from StudioPostRow.
//
// The fields marked `readonly` below are all rejected by the backend on a
// plain create/update call, for one of two reasons — kept distinct in the
// comments so nobody "fixes" this by dropping the modifiers:
//   - workflow-locked: writable in principle, but only through a dedicated
//     action/permission, not a raw PATCH. `author`, `is_featured`,
//     `noindex`, and `canonical_url` go through the editor-only `flags`
//     action (byline is an authority claim a writer must not be able to
//     put a clinician's name on); `status` and `review_note` go through the
//     review/publish actions.
//   - system-computed: the server derives these; there is no action that
//     accepts them as input at all.
// A later task typing a PATCH body as `Partial<StudioPostDetail>` should
// get a compiler error for touching any of these, not a 400 at runtime.
export type StudioPostDetail = Omit<
  StudioPostRow,
  "author_name" | "status" | "published_at" | "is_featured"
> & {
  readonly status: PostStatus; // workflow-locked: review/publish actions
  readonly published_at: string | null; // system-computed: set by the publish action
  readonly is_featured: boolean; // workflow-locked: editor-only flags action
  excerpt: string;
  body: string;
  draft_title: string;
  draft_excerpt: string;
  draft_body: string;
  draft_tags: string[];
  draft_meta_title: string;
  draft_meta_description: string;
  draft_focus_keyword: string;
  draft_og_title: string;
  draft_og_description: string;
  categories: StudioCategoryT[];
  tags: string[];
  readonly author: number | null; // workflow-locked: editor-only flags action
  reading_minutes: number;
  readonly first_published_at: string | null; // system-computed: set once by the publish action
  readonly medically_reviewed_by: StudioAuthorT | null; // system-computed: set by the medical-review action
  readonly medically_reviewed_at: string | null; // system-computed
  readonly legacy_team_reviewed: boolean; // system-computed: migration-era flag
  readonly review_note: string; // workflow-locked: set through the review action
  has_pending_changes: boolean;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  readonly canonical_url: string; // workflow-locked: editor-only flags action
  og_title: string;
  og_description: string;
  readonly noindex: boolean; // workflow-locked: editor-only flags action
};

export type StudioMe = {
  id: number; username: string; name: string;
  can_publish: boolean; can_review: boolean;
  can_medically_review: boolean; credentials: string;
};

export const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  changes_requested: "Changes requested",
  scheduled: "Scheduled",
  published: "Published",
};

export const STATUS_CLASS: Record<PostStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  pending_review: "bg-amber-100 text-amber-800",
  changes_requested: "bg-red-100 text-red-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-emerald-100 text-emerald-700",
};
