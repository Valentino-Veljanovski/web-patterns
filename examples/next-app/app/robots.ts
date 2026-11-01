import type { MetadataRoute } from "next";
import { robotsRules } from "web-patterns/seo";
import { site } from "./site";

// Served as /robots.txt. The contact route must not be crawled.
export default function robots(): MetadataRoute.Robots {
  return robotsRules(site, { disallow: ["/api/"] });
}
