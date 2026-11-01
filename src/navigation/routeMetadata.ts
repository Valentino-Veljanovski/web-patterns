import type { Metadata } from "next";

/**
 * routeMetadata
 * =============
 * One description of a page's title, description and Open Graph tags,
 * usable from two frameworks:
 *
 * - TanStack Start: `head: () => routeMetadata({ ... })` returns `{ title,
 *   meta }` in the shape `createFileRoute(...)({ head })` expects, with the
 *   `{ title }` entry first.
 * - Next App Router: `export const metadata = toNextMetadata(routeMetadata({ ... }))`,
 *   or call `toNextMetadata` from `generateMetadata`.
 *
 * The page title is `"<title> · <siteName>"` when a site name is given,
 * otherwise the title alone. Both outputs carry the same strings, which the
 * tests check. This file imports only a type from `next`, so the TanStack
 * side has no Next dependency at run time.
 */

export interface RouteMetadataInput {
  title: string;
  description: string;
  /** Appended to the title as "<title> · <siteName>" and used as og:site_name. */
  siteName?: string;
  /** Absolute URL of the page, for og:url. */
  url?: string;
  /** Absolute URL of the share image, for og:image. */
  image?: string;
  /** og:type, default "website". */
  type?: "website" | "article" | "profile";
}

export type MetaEntry = { title: string } | { name: string; content: string } | { property: string; content: string };

export interface RouteHead {
  title: string;
  meta: MetaEntry[];
  /** Kept for `toNextMetadata`; TanStack ignores unknown keys. */
  input: RouteMetadataInput;
}

export function routeMetadata(input: RouteMetadataInput): RouteHead {
  const { title: pageTitle, description, siteName, url, image, type = "website" } = input;
  const title = siteName ? `${pageTitle} · ${siteName}` : pageTitle;
  const meta: MetaEntry[] = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
  ];
  if (siteName) meta.push({ property: "og:site_name", content: siteName });
  if (url) meta.push({ property: "og:url", content: url });
  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:card", content: "summary_large_image" });
  } else {
    meta.push({ name: "twitter:card", content: "summary" });
  }
  return { title, meta, input };
}

/** The same page description as a Next `Metadata` object. */
export function toNextMetadata(head: RouteHead): Metadata {
  const { description, siteName, url, image, type = "website" } = head.input;
  return {
    title: head.title,
    description,
    openGraph: {
      title: head.title,
      description,
      type,
      ...(siteName ? { siteName } : {}),
      ...(url ? { url } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: head.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
