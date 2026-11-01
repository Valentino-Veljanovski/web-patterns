import { HeroShader } from "web-patterns/graphics";

export default function GraphicsPage() {
  return (
    <>
      <section className="hero">
        <HeroShader />
        <div className="hero-content">
          <h1>Graphics patterns</h1>
          <p className="lead">
            A WebGL noise field drifts behind this text on wide screens with a fine pointer. On phones, with
            reduced motion, or without WebGL, the background is simply the page colour.
          </p>
        </div>
      </section>
      <section>
        <h2>What the wrapper tells you</h2>
        <p className="card">
          The wrapper element carries a data-shader attribute. It reads &quot;on&quot; only after a WebGL program
          compiled and linked, and &quot;off&quot; otherwise. The host proof reads that attribute instead of
          guessing from pixels.
        </p>
      </section>
    </>
  );
}
