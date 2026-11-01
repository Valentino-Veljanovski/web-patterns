import { defineConfig } from "vitest/config";

// JSX comes from tsconfig ("jsx": "react-jsx"); no extra transform needed.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    setupFiles: ["test/setup.ts"],
  },
});
