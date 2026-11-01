import { NavigationCards } from "./NavigationCards";

export default function NavigationPage() {
  return (
    <>
      <h1>Navigation</h1>
      <p className="lead">
        The card below is a link that navigates through <code>useViewTransitionRouter</code>. With view transitions
        available and no reduced-motion preference, the card morphs into the heading of the target page. Otherwise it
        is a plain client-side navigation. The document carries <code>data-vt</code> with the branch that was taken.
      </p>
      <NavigationCards />
    </>
  );
}
