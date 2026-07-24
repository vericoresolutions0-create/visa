import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initSentry } from "@/lib/sentry.ts";
// Must run before the first React render — registers the Trusted Types
// 'default' policy the CSP requires. See src/lib/trusted-types.ts.
import "@/lib/trusted-types.ts";

// Only initialise Sentry (error reporting + performance monitoring) when the
// user has explicitly accepted cookies. Essential cookies (session state,
// Convex auth) are never gated — only analytics/observability tools are.
if (localStorage.getItem("vc_cookie_consent") === "accepted") {
  initSentry();
}

createRoot(document.getElementById("root")!).render(<App />);
