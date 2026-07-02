// Content layer for the /what-we-do service tree.
//
// Fetches from the Django/DRF API (apiGet) with ISR, and falls back to the
// static JSON reconstructed from the legacy DB if the API is unavailable — so
// builds and the live site never break. Accessors are async; the exported
// types are the contract the routes depend on.

import type { IconName } from "@/components/ui/icon";
import { apiGet } from "@/lib/api";
import staticData from "@/lib/data/what-we-do.json";

export type ServicePage = {
  id: number;
  path: string;
  slug: string;
  parentPath: string;
  title: string;
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  html: string;
  image: string | null;
};

export type ServiceCategory = {
  slug: string;
  path: string;
  label: string;
  icon: IconName;
  blurb: string;
  page: ServicePage;
  services: ServicePage[];
};

const WWD = "/what-we-do";
const staticPages = staticData as ServicePage[];

const CATEGORY_META: Record<string, { label: string; icon: IconName; blurb: string; order: number }> = {
  "immunization-services": {
    label: "Immunization Services",
    icon: "baby",
    blurb: "The complete childhood immunization ladder, birth to 4–6 years, following the Nigerian NPI schedule.",
    order: 1,
  },
  "sexual-reproductive-health-services": {
    label: "Sexual & Reproductive Health",
    icon: "heart-pulse",
    blurb: "Confidential HPV, hepatitis, HIV PrEP/PEP and related vaccines and care for adults.",
    order: 2,
  },
  "travel-health-services": {
    label: "Travel Health Services",
    icon: "plane",
    blurb: "Destination-based travel vaccine bundles and documented records accepted by embassies.",
    order: 3,
  },
  "myhealth-services": {
    label: "myHealth Services",
    icon: "stethoscope",
    blurb: "Ongoing, affordable support plans for living well with chronic infections like hepatitis B and herpes.",
    order: 4,
  },
  "other-immunization-services": {
    label: "Other Immunization",
    icon: "syringe",
    blurb: "Flu, shingles, rabies, typhoid, cholera, pneumococcal, tetanus and more — for every adult need.",
    order: 5,
  },
  "employee-wellness-initiative": {
    label: "Employee Wellness",
    icon: "briefcase",
    blurb: "On-site corporate immunization, health talks and screenings for a healthier, happier workforce.",
    order: 6,
  },
};

// The /what-we-do hub index is SEO copy only (no API entity) — keep it static.
export const hubPage = staticPages.find((p) => p.path === WWD);

// ---- API response shapes ----
type ApiServiceList = { id: number; name: string; slug: string; summary: string; image: string | null };
type ApiServiceDetail = ApiServiceList & {
  body: string; category: string; meta_title: string; meta_description: string; focus_keyword: string;
};
type ApiCategory = {
  id: number; name: string; slug: string; summary: string; body: string; icon: string;
  meta_title: string; meta_description: string; focus_keyword: string; services: ApiServiceList[];
};

function mapService(s: ApiServiceList & Partial<ApiServiceDetail>, categorySlug: string): ServicePage {
  return {
    id: s.id,
    slug: s.slug,
    path: `${WWD}/${categorySlug}/${s.slug}`,
    parentPath: `${WWD}/${categorySlug}`,
    title: s.name,
    excerpt: s.summary ?? "",
    seoTitle: s.meta_title || s.name,
    metaDescription: s.meta_description ?? "",
    focusKeyword: s.focus_keyword ?? "",
    html: s.body ?? "",
    image: s.image ?? null,
  };
}

function mapCategory(c: ApiCategory): ServiceCategory {
  const meta = CATEGORY_META[c.slug];
  return {
    slug: c.slug,
    path: `${WWD}/${c.slug}`,
    label: meta?.label ?? c.name,
    icon: (c.icon as IconName) || meta?.icon || "syringe",
    blurb: c.summary || meta?.blurb || "",
    page: {
      id: c.id, slug: c.slug, path: `${WWD}/${c.slug}`, parentPath: WWD,
      title: c.name, excerpt: c.summary ?? "",
      seoTitle: c.meta_title || c.name, metaDescription: c.meta_description ?? "",
      focusKeyword: c.focus_keyword ?? "", html: c.body ?? "", image: null,
    },
    services: (c.services ?? []).map((s) => mapService(s, c.slug)).sort((a, b) => a.title.localeCompare(b.title, "en")),
  };
}

// ---- static fallback (mirrors the old JSON-only behaviour) ----
function staticCategories(): ServiceCategory[] {
  return staticPages
    .filter((p) => p.parentPath === WWD)
    .map((page) => {
      const meta = CATEGORY_META[page.slug];
      return {
        slug: page.slug, path: page.path,
        label: meta?.label ?? page.title, icon: meta?.icon ?? "syringe",
        blurb: meta?.blurb ?? page.excerpt, page,
        services: staticPages
          .filter((s) => s.parentPath === page.path)
          .sort((a, b) => a.title.localeCompare(b.title, "en")),
      };
    });
}

// ---- public accessors ----
export async function getCategories(): Promise<ServiceCategory[]> {
  const data = await apiGet<{ results: ApiCategory[] }>("/categories/", { results: [] });
  const cats = data.results.length ? data.results.map(mapCategory) : staticCategories();
  return cats.sort((a, b) => (CATEGORY_META[a.slug]?.order ?? 99) - (CATEGORY_META[b.slug]?.order ?? 99));
}

export async function getCategory(slug: string): Promise<ServiceCategory | undefined> {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function getService(categorySlug: string, serviceSlug: string): Promise<ServicePage | undefined> {
  const detail = await apiGet<ApiServiceDetail | null>(`/services/${serviceSlug}/`, null);
  if (detail && detail.slug) return mapService(detail, detail.category || categorySlug);
  const cat = await getCategory(categorySlug);
  return cat?.services.find((s) => s.slug === serviceSlug);
}

export async function getCategoryParams(): Promise<{ category: string }[]> {
  return (await getCategories()).map((c) => ({ category: c.slug }));
}

export async function getServiceParams(): Promise<{ category: string; service: string }[]> {
  const cats = await getCategories();
  return cats.flatMap((c) => c.services.map((s) => ({ category: c.slug, service: s.slug })));
}

export async function allServicePaths(): Promise<string[]> {
  const cats = await getCategories();
  return [WWD, ...cats.flatMap((c) => [c.path, ...c.services.map((s) => s.path)])];
}
