import { JsonLd, pageMetadata, person } from "web-patterns/seo";
import { site } from "../site";

export const metadata = pageMetadata(site, {
  path: "/seo",
  title: "SEO",
  description: "Page metadata with canonical and Open Graph URLs, JSON-LD, and the generated sitemap, robots and manifest.",
});

export default function SeoPage() {
  return (
    <>
      <JsonLd
        data={person({
          name: "Example Person",
          url: site.url,
          jobTitle: "Automation engineer",
          sameAs: ["https://github.com/example"],
        })}
      />
      <h1>SEO</h1>
      <p className="lead">
        This page sets its own title, description, canonical URL and Open Graph tags through <code>pageMetadata</code>,
        and renders one JSON-LD script through <code>JsonLd</code>. The root layout sets the site defaults through{" "}
        <code>createSiteMetadata</code>.
      </p>
      <ul>
        <li>
          <a href="/sitemap.xml">/sitemap.xml</a> from <code>app/sitemap.ts</code>
        </li>
        <li>
          <a href="/robots.txt">/robots.txt</a> from <code>app/robots.ts</code>
        </li>
        <li>
          <a href="/manifest.webmanifest">/manifest.webmanifest</a> from <code>app/manifest.ts</code>
        </li>
      </ul>
      <p>View the page source to see the head tags and the escaped JSON-LD.</p>
    </>
  );
}
