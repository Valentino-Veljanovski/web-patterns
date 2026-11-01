# SEO files: metadata, JSON-LD, robots, sitemap, manifest

Two ways to ship the same files. A Next App Router app generates them from one site config through `src/seo/siteMetadata.ts`. A static host serves the example files in `src/seo/static/` after you adapt them. Both come from the company-site prototype, which was never deployed, and from the 3D-service landing page prototype.

## One config, every file

`createSiteMetadata(site)` is the root layout's `metadata`: `metadataBase`, a title template, the description, the Open Graph defaults and the Twitter card. `pageMetadata(site, page)` is a page's `metadata` with the canonical URL and the Open Graph URL derived from `page.path`. `sitemapEntries`, `robotsRules` and `webManifest` are the return values of `app/sitemap.ts`, `app/robots.ts` and `app/manifest.ts`. The example app does exactly this: `examples/next-app/app/site.ts` holds the config, the three route files are each a few lines, and `/sitemap.xml`, `/robots.txt` and `/manifest.webmanifest` come out of the build. The host proof fetches all three and checks status and content type.

The functions are pure. `lastModified` is passed in, so a build gives the same sitemap twice. Do not fake it: a date that moves on every build teaches crawlers to ignore it.

## JSON-LD

`<JsonLd data={…} />` renders one `<script type="application/ld+json">`. The old component serialised with a plain `JSON.stringify`, so a value containing `</script>` closed the tag and whatever followed ran as script. `serializeJsonLd` escapes `<`, `>` and `&` as `<`, `>` and `&`. JSON parsers turn the escapes back into the characters, so search engines see the original value; the HTML parser never sees a closing tag. The test renders a name of `</script><script>alert("x")</script>` and checks both.

The presets `person`, `organization`, `localBusiness` and `musicGroup` build the common objects from what you pass. Keys you leave out are left out, not emitted as `null`. The old file carried placeholder business data in the component itself; there is none here.

## robots.txt

The rules do three things, in this order: allow everyone, list the paths that must never be indexed even if the server already denies them (form endpoints, logs, dotfiles, debug query strings), and block the crawlers that only feed competitive-intelligence dashboards. Google ignores `Crawl-delay`; the example leaves it out. The sitemap line at the end is what crawlers read first, so keep it absolute and correct.

The old example was mostly prose between the rules. The prose is this section; the file is the rules.

## sitemap.xml

One `<url>` per real HTML page. Hash anchors are not pages and do not belong in it. `hreflang` links are only worth adding when the alternate URLs really serve another language. Sites with more than 50,000 URLs split into several sitemaps and a sitemap index; nothing in this repository is that size.

## site.webmanifest

The example keeps the fields browsers act on: name, short name, description, start URL, scope, display mode, colours, icons and one shortcut. JSON has no comments, so the "example, adapt" marker is a `$comment` key, which browsers ignore. The old manifest also declared share targets, protocol handlers and side-panel widths; add those only when the site implements the endpoint they point to.

## Route metadata for two frameworks

`src/navigation/routeMetadata.ts` describes a page's title, description and Open Graph tags once and gives the result to either TanStack Start's `head()` or to Next through `toNextMetadata()`. The artist site is a TanStack Start app and the other sources are Next apps, so the helper is documented for both; the test checks that both outputs carry the same title and description.
