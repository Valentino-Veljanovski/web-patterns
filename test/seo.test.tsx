import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { JsonLd, localBusiness, musicGroup, organization, person, serializeJsonLd } from "../src/seo/JsonLd";
import { createSiteMetadata, pageMetadata, robotsRules, sitemapEntries, webManifest, type SiteConfig } from "../src/seo/siteMetadata";
import { routeMetadata, toNextMetadata } from "../src/navigation/routeMetadata";

const SITE: SiteConfig = {
  name: "Example Site",
  url: "https://example.com",
  description: "A site used in the tests.",
  locale: "en_US",
};

describe("JsonLd S", () => {
  // Old structured-data-jsonld.tsx line 63: plain JSON.stringify, so a value containing "</script>" closed the tag.
  it("JsonLd escapes </script> inside a value", () => {
    const name = '</script><script>alert("x")</script>';
    const { container } = render(<JsonLd data={person({ name, url: "https://example.com" })} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const html = script!.innerHTML;
    expect(html).not.toContain("</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("\\u003c/script");
    expect(JSON.parse(html).name).toBe(name);
  });

  it("serializeJsonLd escapes <, > and & and keeps the JSON valid", () => {
    const out = serializeJsonLd({ a: "<b>&</b>" });
    expect(out).toBe('{"a":"\\u003cb\\u003e\\u0026\\u003c/b\\u003e"}');
    expect(JSON.parse(out)).toEqual({ a: "<b>&</b>" });
  });

  it("person() and musicGroup() produce valid @context/@type", () => {
    const p = person({ name: "Ada", url: "https://example.com", jobTitle: "Engineer", sameAs: ["https://github.com/ada"] });
    expect(p["@context"]).toBe("https://schema.org");
    expect(p["@type"]).toBe("Person");
    expect(p.name).toBe("Ada");
    expect(p.jobTitle).toBe("Engineer");
    const m = musicGroup({ name: "Band", genre: ["Pop"], sameAs: ["https://example.com/band"] });
    expect(m["@context"]).toBe("https://schema.org");
    expect(m["@type"]).toBe("MusicGroup");
    expect(m.genre).toEqual(["Pop"]);
    const o = organization({ name: "Org", url: "https://example.com", logo: "https://example.com/logo.png" });
    expect(o["@type"]).toBe("Organization");
    const b = localBusiness({
      name: "Shop",
      url: "https://example.com",
      address: { locality: "Munich", country: "DE" },
      geo: { latitude: 48.1351, longitude: 11.582 },
    });
    expect(b["@type"]).toBe("LocalBusiness");
    expect(b.address).toEqual({ "@type": "PostalAddress", addressLocality: "Munich", addressCountry: "DE" });
    expect(b.geo).toEqual({ "@type": "GeoCoordinates", latitude: 48.1351, longitude: 11.582 });
    // No placeholder data from the old file is baked into the presets.
    for (const data of [p, m, o, b]) {
      const text = JSON.stringify(data);
      expect(text).not.toMatch(/Your Business|XX-XXXXXXX|One-sentence description/);
      expect(text).not.toContain("undefined");
    }
  });
});

describe("siteMetadata S", () => {
  it("createSiteMetadata sets metadataBase, title template, description, openGraph and twitter", () => {
    const m = createSiteMetadata(SITE);
    expect(String(m.metadataBase)).toBe("https://example.com/");
    expect(m.title).toEqual({ default: "Example Site", template: "%s · Example Site" });
    expect(m.description).toBe(SITE.description);
    expect(m.openGraph).toMatchObject({ type: "website", locale: "en_US", siteName: "Example Site", url: "https://example.com/" });
    expect(m.twitter).toMatchObject({ card: "summary" });
  });

  it("pageMetadata sets canonical and OG url from the page path", () => {
    const m = pageMetadata(SITE, { path: "/services", title: "Services", description: "What we offer.", image: "/og-services.jpg" });
    expect(m.title).toBe("Services");
    expect(m.description).toBe("What we offer.");
    expect(m.alternates?.canonical).toBe("https://example.com/services");
    expect(m.openGraph).toMatchObject({ url: "https://example.com/services", title: "Services", description: "What we offer.", images: ["/og-services.jpg"] });
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
    expect(pageMetadata(SITE, { path: "/", title: "Home" }).alternates?.canonical).toBe("https://example.com/");
    expect(pageMetadata({ ...SITE, url: "https://example.com/" }, { path: "a/b", title: "x" }).alternates?.canonical).toBe("https://example.com/a/b");
  });

  it("sitemapEntries, robotsRules and webManifest derive from the site config", () => {
    const sm = sitemapEntries(SITE, ["/", "/services", "/contact"], { lastModified: new Date("2026-11-01T00:00:00Z") });
    expect(sm.map((e) => e.url)).toEqual(["https://example.com/", "https://example.com/services", "https://example.com/contact"]);
    expect(sm[0]).toMatchObject({ priority: 1, changeFrequency: "weekly" });
    expect(sm[1]).toMatchObject({ priority: 0.8, changeFrequency: "monthly" });
    const r = robotsRules(SITE, { disallow: ["/api/"] });
    expect(r).toEqual({ rules: { userAgent: "*", allow: "/", disallow: ["/api/"] }, sitemap: "https://example.com/sitemap.xml" });
    const w = webManifest(SITE, { shortName: "Example", themeColor: "#0b0f17", backgroundColor: "#0b0f17", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] });
    expect(w).toMatchObject({ name: "Example Site", short_name: "Example", description: SITE.description, start_url: "/", display: "standalone", lang: "en-US" });
    expect(w.icons).toHaveLength(1);
  });
});

describe("routeMetadata S", () => {
  it("routeMetadata gives the same title/description to TanStack head() and to toNextMetadata()", () => {
    const head = routeMetadata({ title: "Music", description: "Featured songs and listening links.", siteName: "Artist Name", url: "https://example.com/music", image: "https://example.com/og.jpg" });
    const titleEntry = head.meta.find((m) => "title" in m);
    expect(titleEntry).toEqual({ title: "Music · Artist Name" });
    expect(head.title).toBe("Music · Artist Name");
    expect(head.meta).toContainEqual({ name: "description", content: "Featured songs and listening links." });
    expect(head.meta).toContainEqual({ property: "og:title", content: "Music · Artist Name" });
    expect(head.meta).toContainEqual({ property: "og:description", content: "Featured songs and listening links." });
    expect(head.meta).toContainEqual({ property: "og:url", content: "https://example.com/music" });
    expect(head.meta).toContainEqual({ property: "og:image", content: "https://example.com/og.jpg" });

    const next = toNextMetadata(head);
    expect(next.title).toBe("Music · Artist Name");
    expect(next.description).toBe("Featured songs and listening links.");
    expect(next.openGraph).toMatchObject({ title: "Music · Artist Name", description: "Featured songs and listening links.", siteName: "Artist Name", url: "https://example.com/music", images: ["https://example.com/og.jpg"] });
  });

  it("routeMetadata without a site name uses the title alone", () => {
    const head = routeMetadata({ title: "Only", description: "d" });
    expect(head.title).toBe("Only");
    expect(head.meta.some((m) => "property" in m && m.property === "og:url")).toBe(false);
  });
});

describe("static SEO example files", () => {
  const dir = join(process.cwd(), "src/seo/static");
  const files = ["robots.txt", "sitemap.xml", "site.webmanifest"];

  it("exist and are marked as examples", () => {
    expect(readdirSync(dir).sort()).toEqual([...files].sort());
    for (const f of files) {
      expect(readFileSync(join(dir, f), "utf8")).toContain("example — adapt");
    }
  });

  // Old robots.txt: 149 lines, mostly prose. The rules stay, the prose went to docs/seo.md.
  it("robots.txt has fewer comment lines than rule lines", () => {
    const lines = readFileSync(join(dir, "robots.txt"), "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
    const comments = lines.filter((l) => l.startsWith("#"));
    const rules = lines.filter((l) => !l.startsWith("#"));
    expect(comments.length).toBeLessThan(rules.length);
    expect(rules).toContain("User-agent: *");
    expect(rules.some((l) => l.startsWith("Sitemap: "))).toBe(true);
  });

  it("sitemap.xml is a urlset and site.webmanifest is valid JSON", () => {
    const xml = readFileSync(join(dir, "sitemap.xml"), "utf8");
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect((xml.match(/<url>/g) ?? []).length).toBeGreaterThan(0);
    const manifest = JSON.parse(readFileSync(join(dir, "site.webmanifest"), "utf8"));
    expect(manifest.$comment).toContain("example — adapt");
    expect(manifest.start_url).toBe("/");
    expect(Array.isArray(manifest.icons)).toBe(true);
  });
});
