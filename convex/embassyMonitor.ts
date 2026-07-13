"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as crypto from "crypto";
import { EMBASSY_URLS } from "../src/lib/visa-data.ts";

// Strip HTML tags and normalise whitespace so the hash is stable across
// cosmetic reloads (session tokens, date headers, nav banners).
function extractTextFingerprint(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30_000);
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// Weekly cron action — fetches each monitored embassy page, hashes its text
// fingerprint, and alerts admin if the content changed since last check.
// Fetch-errors are silently skipped — intermittent failures on gov sites
// shouldn't trigger false-positive alerts.
export const checkEmbassyPages = internalAction({
  args: {},
  handler: async (ctx) => {
    const checkedAt = new Date().toISOString();

    // Read all stored snapshots in one query before any fetches start.
    const stored: Record<string, { contentHash: string }> = await ctx.runQuery(
      internal.embassyData.getAllSnapshots,
      {},
    );

    const destinations = Object.keys(EMBASSY_URLS);

    await Promise.all(
      destinations.map(async (destination) => {
        const url = EMBASSY_URLS[destination];
        if (!url) return;

        let newHash = "";
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15_000);
          const res = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent": "VisaClear-EmbassyMonitor/1.0 (+https://visaclear.app)",
            },
          });
          clearTimeout(timeoutId);
          if (!res.ok) return;
          const html = await res.text();
          newHash = sha256(extractTextFingerprint(html));
        } catch {
          return; // timeout or network error — skip this destination
        }

        const prev = stored[destination];
        const changed = !!prev && prev.contentHash !== newHash;

        await ctx.runMutation(internal.embassyData.saveSnapshot, {
          destination,
          url,
          contentHash: newHash,
          lastCheckedAt: checkedAt,
          changed,
          previousHash: changed ? prev.contentHash : undefined,
        });
      }),
    );
  },
});
