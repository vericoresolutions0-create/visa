import path from "node:path";
import { defineConfig } from "vitest/config";

// Convex functions run in a V8-isolate-like runtime, not Node — edge-runtime
// is the environment convex-test itself is built and documented against
// (see convex/_generated/ai/guidelines.md's Testing guidelines), so tests
// exercise the same execution model as real Convex deployments instead of
// silently passing in Node but behaving differently in production.
export default defineConfig({
  resolve: {
    // Mirrors vite.config.ts's aliases so a test can import the same way
    // application code does, without a second, drifting alias map.
    alias: {
      "@/convex": path.resolve(__dirname, "./convex"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
  },
});
