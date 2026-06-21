import type { MetadataRoute } from "next";
import { site, megaMenu, mainNav } from "@/lib/site";
import { allServicePaths } from "@/lib/services";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = mainNav.map((l) => l.href);
  const menuRoutes = megaMenu.flatMap((c) => [c.href, ...c.links.map((l) => l.href)]);
  // The content layer is the source of truth for the /what-we-do tree — include
  // every service URL even if the curated mega-menu omits some.
  const serviceRoutes = allServicePaths();

  const unique = Array.from(
    new Set([...staticRoutes, ...menuRoutes, ...serviceRoutes])
  ).filter((p) => p.startsWith("/") && !p.includes("#"));

  return unique.map((path) => ({
    url: `${site.url}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
