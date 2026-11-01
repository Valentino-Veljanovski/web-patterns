import type { SiteConfig } from "web-patterns/seo";

// One config for the root layout, every page's metadata, sitemap.ts, robots.ts and manifest.ts.
// The example app is never deployed; the origin is a reserved documentation domain.
export const site: SiteConfig = {
  name: "web-patterns example",
  url: "https://web-patterns.example",
  description: "Every web-patterns component rendered in a Next 16 App Router app. Built in CI as the host proof.",
  locale: "en_US",
};

export const PAGES = ["/", "/motion", "/scroll", "/graphics", "/diagrams", "/navigation", "/seo", "/contact", "/chat"];
