import type { MetadataRoute } from "next";
import { webManifest } from "web-patterns/seo";
import { site } from "./site";

// Served as /manifest.webmanifest and linked from <head> by Next.
export default function manifest(): MetadataRoute.Manifest {
  return webManifest(site, {
    shortName: "web-patterns",
    themeColor: "#0b0f17",
    backgroundColor: "#0b0f17",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  });
}
