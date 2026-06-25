// Content layer for standalone top-level pages (About, Contact, Hepatitis B,
// Yellow Fever, …). Fetches from the DRF API with ISR + static JSON fallback.

import type { Metadata } from "next";
import { apiGet } from "@/lib/api";
import staticData from "@/lib/data/top-level-pages.json";

export type TopLevelPage = {
  id: number;
  slug: string;
  path: string;
  title: string;
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  html: string;
};

const staticPages = staticData as TopLevelPage[];

type ApiPage = {
  id: number; title: string; slug: string; body: string;
  meta_title: string; meta_description: string; focus_keyword: string;
};

export async function getPage(slug: string): Promise<TopLevelPage | undefined> {
  const fallback = staticPages.find((p) => p.slug === slug);
  const api = await apiGet<ApiPage | null>(`/pages/${slug}/`, null);
  if (!api || !api.slug) return fallback;
  return {
    id: api.id,
    slug: api.slug,
    path: `/${api.slug}`,
    title: api.title,
    // The API page model has no excerpt; keep the legacy one for the hero subtitle.
    excerpt: fallback?.excerpt ?? "",
    seoTitle: api.meta_title || api.title,
    metaDescription: api.meta_description ?? "",
    focusKeyword: api.focus_keyword ?? "",
    html: api.body ?? "",
  };
}

/** Build Next Metadata from a top-level page's SEO fields. */
export async function pageMetadata(slug: string, type: "article" | "website" = "article"): Promise<Metadata> {
  const p = await getPage(slug);
  if (!p) return {};
  return {
    title: p.seoTitle || p.title,
    description: p.metaDescription || p.excerpt,
    keywords: p.focusKeyword ? [p.focusKeyword] : undefined,
    alternates: { canonical: p.path },
    openGraph: { title: `${p.title} | Inocul8`, description: p.metaDescription, url: p.path, type },
  };
}
