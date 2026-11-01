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
      </ul>
    </>
  );
}
