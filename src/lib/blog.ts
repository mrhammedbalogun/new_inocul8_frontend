// Blog content layer. Reads posts extracted from the clean WP DB
// (toolkit scripts/extract-posts.mjs). SEAM: swap the JSON for a DRF fetch later.
//
// Posts keep their original root slugs (/<slug>) to preserve SEO equity. Legacy
// /category/<old> URLs 301 to /blog/category/<new> (redirects wired in Stage 7).

import raw from "@/lib/data/blog-posts.json";

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
  readingMinutes: number;
  wordCount: number;
  html: string;
};

// Stored (WP) category slug -> public slug + display name (docs/02 §4).
const CATEGORY_REMAP: Record<string, Category> = {
  uncategorized: { slug: "talk-vaccines", name: "Talk Vaccines with Inocul8" },
  vaccines: { slug: "vaccines", name: "Vaccines" },
  "travel-health-blog": { slug: "travel-health", name: "Travel Health" },
  "travel-vaccine": { slug: "travel-health", name: "Travel Health" },
  paxlovid: { slug: "paxlovid", name: "Paxlovid" },
  "infectious-diseases": { slug: "infectious-diseases", name: "Infectious Diseases" },
};

function remap(cats: Category[]): Category[] {
  const seen = new Map<string, Category>();
  for (const c of cats) {
    const mapped = CATEGORY_REMAP[c.slug] ?? c;
    seen.set(mapped.slug, mapped);
  }
  return [...seen.values()];
}

function textFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const posts: BlogPost[] = (raw as BlogPost[])
  .map((p) => {
    const categories = remap(p.categories);
    if (categories.length === 0) categories.push(CATEGORY_REMAP.uncategorized);
    const excerpt = p.excerpt || textFromHtml(p.html).slice(0, 155).replace(/\s\S*$/, "") + "…";
    return { ...p, categories, excerpt };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export function getAllPosts(): BlogPost[] {
  return posts;
}

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getAllPostSlugs(): string[] {
  return posts.map((p) => p.slug);
}

export function getCategories(): { slug: string; name: string; count: number }[] {
  const map = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of posts) {
    for (const c of p.categories) {
      const cur = map.get(c.slug) ?? { slug: c.slug, name: c.name, count: 0 };
      cur.count += 1;
      map.set(c.slug, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function getCategory(slug: string): { slug: string; name: string } | undefined {
  return getCategories().find((c) => c.slug === slug);
}

export function getPostsByCategory(slug: string): BlogPost[] {
  return posts.filter((p) => p.categories.some((c) => c.slug === slug));
}

/** Related posts sharing a category, falling back to most recent. */
export function getRelatedPosts(post: BlogPost, n = 3): BlogPost[] {
  const slugs = new Set(post.categories.map((c) => c.slug));
  const sameCat = posts.filter((p) => p.slug !== post.slug && p.categories.some((c) => slugs.has(c.slug)));
  const rest = posts.filter((p) => p.slug !== post.slug && !sameCat.includes(p));
  return [...sameCat, ...rest].slice(0, n);
}

export function formatDate(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
}
