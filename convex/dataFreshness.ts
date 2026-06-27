import { internalQuery, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import { getDataFreshness } from "../src/lib/visa-data.ts";

// Visa rules can't be honestly kept current by an AI guess (see
// countryWatch.ts) — they need a human to actually recheck the official
// source. This just makes sure "needs rechecking" is visible and acted on,
// instead of a checklist quietly going stale with nobody noticing.
export const STALE_THRESHOLD_DAYS = 90;

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  return Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
}

export const getFreshnessReport = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return getDataFreshness()
      .map((row) => ({
        ...row,
        daysSinceVerified: daysSince(row.lastVerified),
        isStale: daysSince(row.lastVerified) >= STALE_THRESHOLD_DAYS,
      }))
      .sort((a, b) => b.daysSinceVerified - a.daysSinceVerified);
  },
});

// Called via ctx.runQuery from the "use node" digest action in
// dataFreshnessDigest.ts — node actions have no direct ctx.db access.
export const getAdminEmails = internalQuery({
  args: {},
  handler: async (ctx) => {
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();
    return admins.map((a) => a.email).filter((email): email is string => Boolean(email));
  },
});
