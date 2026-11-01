"use client";
import { useRef, type MouseEvent } from "react";
import { supportsViewTransition, useViewTransitionRouter } from "web-patterns/navigation";
import { usePrefersReducedMotion } from "web-patterns/motion";

export function NavigationCards() {
  const navigate = useViewTransitionRouter();
  const reduced = usePrefersReducedMotion();
  const cardRef = useRef<HTMLAnchorElement>(null);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const used = supportsViewTransition() && !reduced;
    document.documentElement.setAttribute("data-vt", used ? "used" : "skipped");
    void navigate("/navigation/target", cardRef.current);
  };

  return (
    <div className="cards">
      <a ref={cardRef} href="/navigation/target" className="card" data-nav-card onClick={onClick}>
        <h2>Target page</h2>
        <p>Click to navigate. This card is the element that morphs.</p>
      </a>
    </div>
  );
}
