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
// author_name rather than inheriting it from StudioPostRow. `author` is also
// read-only through normal create/update calls: it's workflow-locked to the
// editor-only `flags` action, so never send it in a POST/PATCH body.
export type StudioPostDetail = Omit<StudioPostRow, "author_name"> & {
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
  /** Read-only author id; see note above — do not write this field. */
  author: number | null;
  reading_minutes: number;
  first_published_at: string | null;
  medically_reviewed_by: StudioAuthorT | null;
  medically_reviewed_at: string | null;
  legacy_team_reviewed: boolean;
  review_note: string;
  has_pending_changes: boolean;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  noindex: boolean;
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
