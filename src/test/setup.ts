import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// No `globals: true` in vitest.config.ts (matches the convex project's own
// style — explicit imports everywhere), so RTL's usual auto-cleanup doesn't
// register itself automatically. Without this, a component left mounted by
// one test would still be in the DOM when the next test's queries run.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement IntersectionObserver at all, and framer-motion's
// `whileInView` (used throughout the app for scroll-triggered animations)
// calls `new IntersectionObserver(...)` unconditionally on mount rather
// than feature-detecting — without this stub, any page using `whileInView`
// throws "IntersectionObserver is not defined" the instant it renders.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
// The stub only implements what the app actually calls, not the full real
// interface (root/rootMargin/thresholds etc.), so this is an intentional
// unsafe cast rather than a structurally-correct assignment.
globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;
