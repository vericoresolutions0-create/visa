import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// Kept in sync by hand with the CSP in index.html and vercel.json — there's
// no single shared source across a .ts config, static HTML, and JSON.
// http://127.0.0.1:* / ws://127.0.0.1:* cover local Convex dev; the
// *.convex.cloud / *.convex.site wildcards cover the real deployment once
// one exists, with no edit needed when that URL is set.
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site http://127.0.0.1:* ws://127.0.0.1:*",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:",
    "upgrade-insecure-requests",
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
};

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    headers: SECURITY_HEADERS,
  },
  preview: {
    headers: SECURITY_HEADERS,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/convex": path.resolve(__dirname, "./convex"),
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return "vendor-react";
          }
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("/motion/") || id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("i18next")) return "vendor-i18n";
          if (id.includes("convex") || id.includes("@tanstack")) return "vendor-data";
          // Large icon library — split so it loads in parallel with react on first paint.
          if (id.includes("lucide-react")) return "vendor-icons";
          // Charting library pulls in d3 — only used on dashboard stats pages.
          if (id.includes("recharts") || id.includes("node_modules/d3") || id.includes("node_modules/victory-")) return "vendor-charts";
          // PDF generation — only used on checklist export; very large, defer it.
          if (id.includes("jspdf")) return "vendor-pdf";
          // Error monitoring — not on the critical render path.
          if (id.includes("@sentry")) return "vendor-sentry";
          return undefined;
        },
      },
    },
  },
});
