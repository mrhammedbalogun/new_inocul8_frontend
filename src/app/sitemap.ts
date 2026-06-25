import type { MetadataRoute } from "next";
import { site, megaMenu, mainNav } from "@/lib/site";
import { allServicePaths } from "@/lib/services";
import { getAllPosts, getCategories } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = mainNav.map((l) => l.href);
  const menuRoutes = megaMenu.flatMap((c) => [c.href, ...c.links.map((l) => l.href)]);
  // The content layer is the source of truth for the /what-we-do tree — include
  // every service URL even if the curated mega-menu omits some.
  const [serviceRoutes, posts, blogCategories] = await Promise.all([
    allServicePaths(),
    getAllPosts(),
    getCategories(),
  ]);
  const blogRoutes = blogCategories.map((c) => `/blog/category/${c.slug}`);
  const postEntries = posts.map((p) => ({ path: `/${p.slug}`, lastModified: p.modified || p.date }));

  const seen = new Set<string>();
  const pageEntries = [...staticRoutes, ...menuRoutes, ...serviceRoutes, ...blogRoutes]
    .filter((p) => p.startsWith("/") && !p.includes("#"))
    .filter((p) => (seen.has(p) ? false : seen.add(p)))
    .map((path) => ({ path, lastModified: now }));

  return [...pageEntries, ...postEntries].map(({ path, lastModified }) => ({
    url: `${site.url}${path === "/" ? "" : path}`,
    lastModified: typeof lastModified === "string" ? new Date(lastModified.replace(" ", "T")) : lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/blog") || path.startsWith("/what-we-do") ? 0.7 : 0.6,
  }));
}
