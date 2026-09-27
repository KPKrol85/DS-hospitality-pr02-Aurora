import { defineConfig } from "vitest/config";

// Regression suite for the data-driven views. It imports the modules in js/features/ directly
// and is not part of npm run build or the dist/ package.
export default defineConfig({
  // The tests load no CSS. An inline PostCSS config keeps Vite from loading the production
  // postcss.config.js and its build plugins.
  css: {
    postcss: {},
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
