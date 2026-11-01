import { BackToTop, ReadingProgress } from "web-patterns/scroll";

const SECTIONS = [
  "Reading progress",
  "Why a bar and not a number",
  "Throttling to one frame",
  "Back to top",
  "Keyboard and screen readers",
  "Reduced motion",
];

export default function ScrollPage() {
  return (
    <>
      <ReadingProgress />
      <BackToTop />
      <h1>Scroll patterns</h1>
      <p className="lead">
        The bar along the top edge follows how far you have read. The round button appears after a few hundred
        pixels and takes you back up.
      </p>
      {SECTIONS.map((title) => (
        <section key={title}>
          <h2>{title}</h2>
          <p className="card">
            This section exists to make the page long enough to scroll. The bar width and the button ring are
            written straight to the elements from a scroll handler that runs at most once per animation frame, so
            scrolling never re-renders the page.
          </p>
          <p className="card">
            While the button is hidden it is removed from the tab order and from the accessibility tree. When it
            shows, it has the accessible name given by its label prop.
          </p>
        </section>
      ))}
    </>
  );
}
