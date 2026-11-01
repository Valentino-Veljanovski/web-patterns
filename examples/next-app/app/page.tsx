import Link from "next/link";

export default function IndexPage() {
  return (
    <>
      <h1>web-patterns example</h1>
      <p className="lead">
        One page per module group. Each page renders the components with real content, in a production build of
        Next 16. The host proof opens every page twice, with reduced motion on and off.
      </p>
      <ul>
        <li>
          <Link href="/motion">Motion</Link>: ScrollReveal, SplitText, Typewriter in both modes
        </li>
        <li>
          <Link href="/scroll">Scroll</Link>: ReadingProgress and BackToTop on a long page
        </li>
        <li>
          <Link href="/graphics">Graphics</Link>: HeroShader behind a hero section
        </li>
        <li>
          <Link href="/diagrams">Diagrams</Link>: two ArchitectureDiagram instances, one of them empty
        </li>
        <li>
          <Link href="/navigation">Navigation</Link>: a card that navigates through a view transition
        </li>
        <li>
          <Link href="/seo">SEO</Link>: page metadata, JSON-LD, and the generated sitemap, robots and manifest
        </li>
        <li>
          <Link href="/contact">Contact</Link>: the contact route with a recording transport, no mail is sent
        </li>
        <li>
          <Link href="/chat">Chat</Link>: the on-page assistant, answering without a request
        </li>
      </ul>
    </>
  );
}
