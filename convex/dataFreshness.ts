import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import { getDataFreshness } from "../src/lib/visa-data.ts";

export const STALE_THRESHOLD_DAYS = 90;

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  return Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const getFreshnessReport = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    // Load all DB overrides keyed by destination name
    const dbRows = await ctx.db.query("visa_freshness").collect();
    const dbByDest = new Map(dbRows.map((r) => [r.destination, r]));

    return getDataFreshness()
      .map((row) => {
        const dbRow = dbByDest.get(row.destination);
        const lastVerified = dbRow?.lastVerified ?? row.lastVerified;
        const verifiedByAdminAt = dbRow?.verifiedAt ?? null;
        return {
          destination: row.destination,
          visaTypeCount: row.visaTypeCount,
          lastVerified,
          verifiedByAdminAt,
          daysSinceVerified: daysSince(lastVerified),
          isStale: daysSince(lastVerified) >= STALE_THRESHOLD_DAYS,
          hasDbRecord: !!dbRow,
        };
      })
      .sort((a, b) => b.daysSinceVerified - a.daysSinceVerified);
  },
});

// Admin marks a destination's checklist data as reviewed and current.
// Creates or replaces the DB override so the static seed date is no
// longer used for this destination — date resets to today automatically.
export const markVerified = mutation({
  args: { destination: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("visa_freshness")
      .withIndex("by_destination", (q) => q.eq("destination", args.destination))
      .unique();

    const now = new Date().toISOString();
    const today = todayISO();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastVerified: today,
        verifiedByUserId: admin._id,
        verifiedAt: now,
      });
    } else {
      await ctx.db.insert("visa_freshness", {
        destination: args.destination,
        lastVerified: today,
        verifiedByUserId: admin._id,
        verifiedAt: now,
      });
    }
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
