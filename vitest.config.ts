import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

// Two projects, one `npm test`, because backend and frontend tests need
// genuinely different runtimes — not just different files.
export default defineConfig({
  test: {
    projects: [
      {
        // Convex functions run in a V8-isolate-like runtime, not Node —
        // edge-runtime is the environment convex-test itself is built and
        // documented against (see convex/_generated/ai/guidelines.md's
        // Testing guidelines), so tests exercise the same execution model
        // as real Convex deployments instead of silently passing in Node
        // but behaving differently in production.
        resolve: {
          // Mirrors vite.config.ts's aliases so a test can import the same
          // way application code does, without a second, drifting alias map.
          alias: {
            "@/convex": path.resolve(__dirname, "./convex"),
            "@": path.resolve(__dirname, "./src"),
          },
        },
        test: {
          name: "convex",
          environment: "edge-runtime",
          include: ["convex/**/*.test.ts"],
        },
      },
      {
        // Page/component tests render real React output into jsdom (a
        // fake browser DOM, not a real one) and assert on what a user
        // would actually see — specifically built to catch the
        // loading-state-collapsed-into-empty-state bug class found across
        // the app on 2026-07-21, where `useQuery(...) ?? []` or similar
        // made "still loading" indistinguishable from "confirmed empty".
        plugins: [react()],
        resolve: {
          alias: {
            "@/convex": path.resolve(__dirname, "./convex"),
            "@": path.resolve(__dirname, "./src"),
          },
        },
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
