import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      // The library root is not a Next app; the example app is.
      next: { rootDir: "examples/next-app" },
    },
  },
]);
