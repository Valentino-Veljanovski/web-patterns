import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// The library sources live two levels up. Turbopack needs the repository
// root so that files outside the app directory may be compiled; the
// "web-patterns/*" import paths are mapped in tsconfig.json.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
