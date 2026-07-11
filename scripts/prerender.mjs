/**
 * Post-build static pre-renderer.
 *
 * Runs after `vite build`. For every visa corridor route it writes a
 * static HTML file to dist/ with corridor-specific <head> metadata
 * (title, description, canonical, OG tags). Vercel serves static files
 * before applying the catch-all rewrite, so these files win over index.html
 * automatically — no vercel.json changes needed.
 *
 * Also generates dist/sitemap.xml listing every indexable route.
 *
 * Data here mirrors src/lib/corridor-data.ts. When you add a corridor
 * there, add a matching entry to CORRIDORS below.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = join(__dirname, "..");
const DIST     = join(ROOT, "dist");
const SITE     = "https://visaclear.app";
const BASE_TITLE = "VisaClear by Vericore";

// ── Corridor data ─────────────────────────────────────────────────────────────
// Mirrors src/lib/corridor-data.ts CORRIDORS. Keep in sync when adding routes.
const CORRIDORS = [
  {
    originSlug: "nigeria", destinationSlug: "canada",
    origin: "Nigeria", destination: "Canada",
    originFlag: "🇳🇬", destinationFlag: "🇨🇦",
    visaTypes: [
      { slug: "express-entry",  name: "Express Entry",   shortName: "Express Entry",  processingTime: "~6 months after ITA", approvalRate: "82%" },
      { slug: "study-permit",   name: "Study Permit",    shortName: "Study Permit",   processingTime: "4–16 weeks",          approvalRate: "76%" },
      { slug: "visitor-visa",   name: "Visitor Visa",    shortName: "Visitor Visa",   processingTime: "2–8 weeks",           approvalRate: "58%" },
    ],
  },
  {
    originSlug: "nigeria", destinationSlug: "united-kingdom",
    origin: "Nigeria", destination: "United Kingdom",
    originFlag: "🇳🇬", destinationFlag: "🇬🇧",
    visaTypes: [
      { slug: "skilled-worker", name: "Skilled Worker Visa", shortName: "Skilled Worker", processingTime: "3–8 weeks", approvalRate: "78%" },
      { slug: "student",        name: "Student Visa",        shortName: "Student",        processingTime: "3–6 weeks", approvalRate: "83%" },
    ],
  },
  {
    originSlug: "united-kingdom", destinationSlug: "spain",
    origin: "United Kingdom", destination: "Spain",
    originFlag: "🇬🇧", destinationFlag: "🇪🇸",
    visaTypes: [
      { slug: "digital-nomad-visa",  name: "Spain Digital Nomad Visa", shortName: "Digital Nomad",  processingTime: "6–8 weeks",  approvalRate: "78%" },
      { slug: "non-lucrative-visa",  name: "Non-Lucrative Visa",       shortName: "Non-Lucrative",  processingTime: "8–10 weeks", approvalRate: "71%" },
    ],
  },
  {
    originSlug: "united-kingdom", destinationSlug: "portugal",
    origin: "United Kingdom", destination: "Portugal",
    originFlag: "🇬🇧", destinationFlag: "🇵🇹",
    visaTypes: [
      { slug: "d7-visa", name: "D7 Passive Income Visa", shortName: "D7 Visa", processingTime: "2–3 months", approvalRate: "85%" },
    ],
  },
  {
    originSlug: "india", destinationSlug: "united-kingdom",
    origin: "India", destination: "United Kingdom",
    originFlag: "🇮🇳", destinationFlag: "🇬🇧",
    visaTypes: [
      { slug: "skilled-worker", name: "Skilled Worker Visa", shortName: "Skilled Worker", processingTime: "3–8 weeks", approvalRate: "74%" },
      { slug: "student",        name: "Student Visa",        shortName: "Student",        processingTime: "3–6 weeks", approvalRate: "81%" },
    ],
  },
  {
    originSlug: "philippines", destinationSlug: "united-arab-emirates",
    origin: "Philippines", destination: "United Arab Emirates",
    originFlag: "🇵🇭", destinationFlag: "🇦🇪",
    visaTypes: [
      { slug: "employment-visa", name: "UAE Employment Visa", shortName: "Employment Visa", processingTime: "2–4 weeks", approvalRate: "91%" },
    ],
  },
  {
    originSlug: "brazil", destinationSlug: "portugal",
    origin: "Brazil", destination: "Portugal",
    originFlag: "🇧🇷", destinationFlag: "🇵🇹",
    visaTypes: [
      { slug: "d7-visa", name: "D7 Passive Income Visa", shortName: "D7 Visa", processingTime: "2–4 months", approvalRate: "88%" },
    ],
  },
];

// ── Static pages for sitemap (not pre-rendered with custom meta, just listed) ─
const STATIC_PAGES = [
  { path: "/",                 priority: "1.0", changefreq: "weekly"  },
  { path: "/checklist",        priority: "0.9", changefreq: "weekly"  },
  { path: "/pricing",          priority: "0.9", changefreq: "monthly" },
  { path: "/rejection-analyser", priority: "0.8", changefreq: "monthly" },
  { path: "/passport-photo",   priority: "0.8", changefreq: "monthly" },
  { path: "/risk-score",       priority: "0.8", changefreq: "monthly" },
  { path: "/wait-times",       priority: "0.7", changefreq: "weekly"  },
  { path: "/wall-of-fame",     priority: "0.7", changefreq: "weekly"  },
  { path: "/community",        priority: "0.7", changefreq: "daily"   },
  { path: "/blog",             priority: "0.7", changefreq: "daily"   },
  { path: "/about",            priority: "0.6", changefreq: "monthly" },
  { path: "/contact",          priority: "0.6", changefreq: "monthly" },
  { path: "/visa",             priority: "0.9", changefreq: "weekly"  },
  { path: "/visa/compare",     priority: "0.8", changefreq: "weekly"  },
];

// ── HTML patching helpers ─────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Replace a single-line or multiline <meta name="X" content="..."> value. */
function patchMeta(html, name, newContent) {
  // Matches both single-line and multi-line meta tags
  const re = new RegExp(
    `(<meta\\s+name="${name}"\\s+content=")[^"]*("\\s*/?>)`,
    "g",
  );
  return html.replace(re, `$1${escapeHtml(newContent)}$2`);
}

function patchMetaProperty(html, property, newContent) {
  const re = new RegExp(
    `(<meta\\s+property="${property}"\\s+content=")[^"]*("\\s*/?>)`,
    "g",
  );
  return html.replace(re, `$1${escapeHtml(newContent)}$2`);
}

function patchTitle(html, newTitle) {
  return html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(newTitle)}</title>`);
}

function patchCanonical(html, newUrl) {
  return html.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/>)/,
    `$1${newUrl}$2`,
  );
}

function patchOgUrl(html, newUrl) {
  const re = /(<meta\s+property="og:url"\s+content=")[^"]*("\s*\/>)/;
  return html.replace(re, `$1${newUrl}$2`);
}

function patchJsonLd(html, jsonLd) {
  // Replace the existing JSON-LD block with a corridor-specific one
  return html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n      ${JSON.stringify(jsonLd, null, 2)}\n    </script>`,
  );
}

// ── Pre-render one corridor route ─────────────────────────────────────────────

function renderCorridor(shell, corridor, vt) {
  const url      = `${SITE}/visa/${corridor.originSlug}/${corridor.destinationSlug}/${vt.slug}`;
  const title    = `${corridor.originFlag} ${corridor.origin} → ${corridor.destinationFlag} ${corridor.destination}: ${vt.shortName} | ${BASE_TITLE}`;
  const desc     = `${vt.name} from ${corridor.origin} to ${corridor.destination}. Processing: ${vt.processingTime}. Approval rate: ${vt.approvalRate}. Real requirements, costs, and community data.`;
  const ogTitle  = `${corridor.originFlag} ${corridor.origin} → ${corridor.destinationFlag} ${corridor.destination}: ${vt.shortName}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": ogTitle,
    "description": desc,
    "url": url,
    "author": { "@type": "Organization", "name": "Vericore Ltd" },
    "publisher": { "@type": "Organization", "name": BASE_TITLE },
    "about": {
      "@type": "GovernmentPermit",
      "name": vt.name,
    },
  };

  let html = shell;
  html = patchTitle(html, title);
  html = patchMeta(html, "description", desc);
  html = patchCanonical(html, url);
  html = patchMetaProperty(html, "og:title", ogTitle);
  html = patchMetaProperty(html, "og:description", desc);
  html = patchMetaProperty(html, "og:url", url);
  html = patchMeta(html, "twitter:title", ogTitle);
  html = patchMeta(html, "twitter:description", desc);
  html = patchJsonLd(html, jsonLd);
  return html;
}

// ── Pre-render a static page with custom meta ─────────────────────────────────

function renderStaticPage(shell, { path: pagePath, title, description }) {
  const url = `${SITE}${pagePath}`;
  let html = shell;
  html = patchTitle(html, `${title} | ${BASE_TITLE}`);
  html = patchMeta(html, "description", description);
  html = patchCanonical(html, url);
  html = patchMetaProperty(html, "og:title", title);
  html = patchMetaProperty(html, "og:description", description);
  html = patchMetaProperty(html, "og:url", url);
  html = patchMeta(html, "twitter:title", title);
  html = patchMeta(html, "twitter:description", description);
  return html;
}

// ── Sitemap generation ────────────────────────────────────────────────────────

function buildSitemap(corridorUrls) {
  const today = new Date().toISOString().slice(0, 10);

  const staticEntries = STATIC_PAGES.map(({ path, priority, changefreq }) => `
  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join("");

  const corridorEntries = corridorUrls.map(({ url }) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${corridorEntries}
</urlset>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const shell = readFileSync(join(DIST, "index.html"), "utf8");
const corridorUrls = [];
let count = 0;

// Pre-render each visa hub sub-page with custom meta
const HUB_PAGES = [
  {
    path: "/visa",
    title: "Visa Corridor Guide",
    description: "Explore real requirements, processing times, costs, and approval rates for every major visa corridor. Find a verified agent to guide your application.",
  },
  {
    path: "/visa/compare",
    title: "Compare Visa Corridors",
    description: "Side-by-side comparison of visa corridors — processing times, approval rates, fees, and requirements across multiple routes.",
  },
];

for (const page of HUB_PAGES) {
  const outDir = join(DIST, ...page.path.split("/").filter(Boolean));
  mkdirSync(outDir, { recursive: true });
  const html = renderStaticPage(shell, page);
  writeFileSync(join(outDir, "index.html"), html, "utf8");
  count++;
}

// Pre-render each corridor + visa type
for (const corridor of CORRIDORS) {
  for (const vt of corridor.visaTypes) {
    const outDir = join(DIST, "visa", corridor.originSlug, corridor.destinationSlug, vt.slug);
    mkdirSync(outDir, { recursive: true });
    const html = renderCorridor(shell, corridor, vt);
    writeFileSync(join(outDir, "index.html"), html, "utf8");
    const url = `${SITE}/visa/${corridor.originSlug}/${corridor.destinationSlug}/${vt.slug}`;
    corridorUrls.push({ url });
    count++;
    console.log(`  ✓  ${url}`);
  }
}

// Generate sitemap
const sitemap = buildSitemap(corridorUrls);
writeFileSync(join(DIST, "sitemap.xml"), sitemap, "utf8");
console.log(`  ✓  ${SITE}/sitemap.xml`);

console.log(`\nPre-rendered ${count} pages + sitemap.xml\n`);
