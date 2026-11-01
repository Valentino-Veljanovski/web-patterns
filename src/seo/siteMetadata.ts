import type { Metadata, MetadataRoute } from "next";

/**
 * siteMetadata
 * ============
 * Pure functions that turn one `SiteConfig` into the Next App Router's
 * metadata objects, so that the root layout, every page, `app/sitemap.ts`,
 * `app/robots.ts` and `app/manifest.ts` are built from the same values:
 *
 * - `createSiteMetadata(site)`: the root `Metadata` with `metadataBase`, a
 *   title template, description, Open Graph defaults and the Twitter card.
 * - `pageMetadata(site, page)`: a page's `Metadata` with the canonical URL
 *   and the Open Graph URL derived from `page.path`.
 * - `sitemapEntries(site, paths)`, `robotsRules(site)`, `webManifest(site)`:
 *   the return values of the three metadata route files.
 *
 * Nothing here reads the environment or the clock on its own; `lastModified`
 * is passed in, so the output of a build is reproducible.
 */

export interface SiteConfig {
  /** Site name, used as the default title and og:site_name. */
  name: string;
  /** Absolute origin, e.g. "https://example.com". */
  url: string;
  description: string;
  /** og:locale, e.g. "en_US". Default "en_US". */
  locale?: string;
  /** Title template, default "%s · <name>". */
  titleTemplate?: string;
  /** Default share image, absolute or site-relative. */
  image?: string;
  /** Twitter handle, with or without "@". */
  twitter?: string;
}

export interface PageConfig {
  /** Site-relative path, e.g. "/services". */
  path: string;
  title: string;
  description?: string;
  /** Share image for this page, absolute or site-relative. */
  image?: string;
  type?: "website" | "article" | "profile";
}

/** Absolute URL for a site-relative path; "/" gives the origin with a trailing slash. */
export function absoluteUrl(site: SiteConfig, path: string): string {
  return new URL(path, site.url.endsWith("/") ? site.url : `${site.url}/`).toString();
}

export function createSiteMetadata(site: SiteConfig): Metadata {
  const { name, description, locale = "en_US", titleTemplate = `%s · ${name}`, image, twitter } = site;
  return {
    metadataBase: new URL(site.url),
    title: { default: name, template: titleTemplate },
    description,
    openGraph: {
      type: "website",
      locale,
      siteName: name,
      url: absoluteUrl(site, "/"),
      title: name,
      description,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: name,
      description,
      ...(twitter ? { site: twitter.startsWith("@") ? twitter : `@${twitter}` } : {}),
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function pageMetadata(site: SiteConfig, page: PageConfig): Metadata {
  const url = absoluteUrl(site, page.path);
  const description = page.description ?? site.description;
  const image = page.image ?? site.image;
  return {
    title: page.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: page.type ?? "website",
      url,
      title: page.title,
      description,
      siteName: site.name,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: page.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export interface SitemapOptions {
  /** Applied to every entry. Omit to leave `lastModified` out. */
  lastModified?: Date;
}

/** One sitemap entry per path; "/" gets priority 1 and weekly, the rest 0.8 and monthly. */
export function sitemapEntries(site: SiteConfig, paths: string[], options: SitemapOptions = {}): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: absoluteUrl(site, path),
    ...(options.lastModified ? { lastModified: options.lastModified } : {}),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}

export interface RobotsOptions {
  /** Paths crawlers must not index, e.g. ["/api/"]. */
  disallow?: string[];
}

export function robotsRules(site: SiteConfig, options: RobotsOptions = {}): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      ...(options.disallow?.length ? { disallow: options.disallow } : {}),
    },
    sitemap: absoluteUrl(site, "/sitemap.xml"),
  };
}

export interface ManifestOptions {
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
  icons?: MetadataRoute.Manifest["icons"];
  display?: MetadataRoute.Manifest["display"];
}

export function webManifest(site: SiteConfig, options: ManifestOptions = {}): MetadataRoute.Manifest {
  const { shortName, themeColor, backgroundColor, icons, display = "standalone" } = options;
  return {
    name: site.name,
    short_name: shortName ?? site.name,
    description: site.description,
    start_url: "/",
    scope: "/",
    display,
    lang: (site.locale ?? "en_US").replace("_", "-"),
    ...(themeColor ? { theme_color: themeColor } : {}),
    ...(backgroundColor ? { background_color: backgroundColor } : {}),
    ...(icons ? { icons } : {}),
  };
}
