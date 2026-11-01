import Link from "next/link";
import { VIEW_TRANSITION_NAME } from "web-patterns/navigation";

export default function NavigationTargetPage() {
  return (
    <>
      <h1 style={{ viewTransitionName: VIEW_TRANSITION_NAME }} data-nav-target>
        Target page
      </h1>
      <p className="lead">
        The heading carries the same <code>view-transition-name</code> as the card on the previous page, so the browser
        morphs one into the other when the transition is used.
      </p>
      <p>
        <Link href="/navigation">Back to the card</Link>
      </p>
    </>
  );
}
