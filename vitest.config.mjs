// Config for `npm test`. Kept deliberately small: this project's tests are
// plain Node-side unit tests for pure logic and auth guards (see
// lib/**/*.test.js) -- no DOM/component rendering, so no jsdom/react
// plugin is needed.

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.js"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      // Mirrors the "@/*" path alias in jsconfig.json, so test files can
      // import with the same paths the app code uses.
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
