import type { MetadataRoute } from "next";
import { site, megaMenu, mainNav } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = mainNav.map((l) => l.href);
  const serviceRoutes = megaMenu.flatMap((c) => [c.href, ...c.links.map((l) => l.href)]);

  const unique = Array.from(new Set([...staticRoutes, ...serviceRoutes])).filter(
    (p) => p.startsWith("/") && !p.includes("#")
  );

  return unique.map((path) => ({
    url: `${site.url}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
