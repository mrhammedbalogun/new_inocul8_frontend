// Blog content layer. Fetches from the DRF API with ISR + static JSON fallback
// (the posts reconstructed from the clean WP DB). Post slugs stay at the site
// root (/<slug>) to preserve SEO. formatDate is a pure helper and stays sync.

import { apiGet, apiGetAll } from "@/lib/api";
import rawStatic from "@/lib/data/blog-posts.json";

export type Category = { name: string; slug: string };

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  date: string;
  modified: string;
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  categories: Category[];
  tags: Category[];
  readingMinutes: number;
  wordCount: number;
  html: string;
};

// Stored (WP) category slug -> public slug + name. The backend already stores
// remapped slugs, so this only matters for the static fallback path.
const CATEGORY_REMAP: Record<string, Category> = {
  uncategorized: { slug: "talk-vaccines", name: "Talk Vaccines with Inocul8" },
  vaccines: { slug: "vaccines", name: "Vaccines" },
  "travel-health-blog": { slug: "travel-health", name: "Travel Health" },
  "travel-vaccine": { slug: "travel-health", name: "Travel Health" },
  paxlovid: { slug: "paxlovid", name: "Paxlovid" },
  "infectious-diseases": { slug: "infectious-diseases", name: "Infectious Diseases" },
};

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function textFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function remap(cats: Category[]): Category[] {
  const seen = new Map<string, Category>();
  for (const c of cats) {
    const mapped = CATEGORY_REMAP[c.slug] ?? c;
    seen.set(mapped.slug, mapped);
  }
  return [...seen.values()];
}

// ---- static fallback dataset ----
const staticPosts: BlogPost[] = (rawStatic as BlogPost[])
  .map((p) => {
    const categories = remap(p.categories);
    if (categories.length === 0) categories.push(CATEGORY_REMAP.uncategorized);
    const excerpt = p.excerpt || textFromHtml(p.html).slice(0, 155).replace(/\s\S*$/, "") + "…";
    return { ...p, categories, excerpt };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

// ---- API shapes ----
type ApiCat = { name: string; slug: string; description?: string; post_count?: number };
type ApiPost = {
  id: number; title: string; slug: string; excerpt: string; body?: string;
  categories: ApiCat[]; tags: string[]; reading_minutes: number;
  published_at: string; updated_at?: string;
  meta_title?: string; meta_description?: string; focus_keyword?: string;
};

function mapPost(p: ApiPost): BlogPost {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    date: p.published_at,
    modified: p.updated_at || p.published_at,
    excerpt: p.excerpt || (p.body ? textFromHtml(p.body).slice(0, 155).replace(/\s\S*$/, "") + "…" : ""),
    seoTitle: p.meta_title || p.title,
    metaDescription: p.meta_description ?? "",
    focusKeyword: p.focus_keyword ?? "",
    categories: (p.categories ?? []).map((c) => ({ name: c.name, slug: c.slug })),
    tags: (p.tags ?? []).map((t) => ({ name: t, slug: slugify(t) })),
    readingMinutes: p.reading_minutes ?? 1,
    wordCount: 0,
    html: p.body ?? "",
  };
}

// ---- public accessors ----
export async function getAllPosts(): Promise<BlogPost[]> {
  const rows = await apiGetAll<ApiPost>("/posts/", []);
  if (!rows.length) return staticPosts;
  return rows.map(mapPost).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPost(slug: string): Promise<BlogPost | undefined> {
  const api = await apiGet<ApiPost | null>(`/posts/${slug}/`, null);
  if (api && api.slug) return mapPost(api);
  return staticPosts.find((p) => p.slug === slug);
}

export async function getAllPostSlugs(): Promise<string[]> {
  return (await getAllPosts()).map((p) => p.slug);
}

export async function getCategories(): Promise<{ slug: string; name: string; count: number }[]> {
  const rows = await apiGet<ApiCat[]>("/blog-categories/", []);
  if (rows.length) {
    return rows
      .map((c) => ({ slug: c.slug, name: c.name, count: c.post_count ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }
  // static fallback
  const map = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of staticPosts) {
    for (const c of p.categories) {
      const cur = map.get(c.slug) ?? { slug: c.slug, name: c.name, count: 0 };
      cur.count += 1;
      map.set(c.slug, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export async function getCategory(slug: string): Promise<{ slug: string; name: string } | undefined> {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function getPostsByCategory(slug: string): Promise<BlogPost[]> {
  const rows = await apiGetAll<ApiPost>(`/posts/?categories__slug=${encodeURIComponent(slug)}`, []);
  if (rows.length) return rows.map(mapPost);
  return staticPosts.filter((p) => p.categories.some((c) => c.slug === slug));
}

/** Related posts sharing a category, falling back to most recent. */
export async function getRelatedPosts(post: BlogPost, n = 3): Promise<BlogPost[]> {
  const api = await apiGet<ApiPost[]>(`/posts/${post.slug}/related/`, []);
  if (api.length) return api.slice(0, n).map(mapPost);
  const slugs = new Set(post.categories.map((c) => c.slug));
  const sameCat = staticPosts.filter((p) => p.slug !== post.slug && p.categories.some((c) => slugs.has(c.slug)));
  const rest = staticPosts.filter((p) => p.slug !== post.slug && !sameCat.includes(p));
  return [...sameCat, ...rest].slice(0, n);
}

export function formatDate(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
}
