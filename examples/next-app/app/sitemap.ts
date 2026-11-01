import type { MetadataRoute } from "next";
import { sitemapEntries } from "web-patterns/seo";
import { PAGES, site } from "./site";

// Served as /sitemap.xml. One fixed date keeps the build reproducible.
export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(site, PAGES, { lastModified: new Date("2026-11-01T00:00:00Z") });
}
