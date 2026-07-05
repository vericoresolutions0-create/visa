import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./authHelpers.ts";
import { requireAdmin } from "./admin.ts";
import { checkUserDailyLimit } from "./rateLimits.ts";

// Below this, a "community average" would just be 1-2 people's experience
// dressed up as a trend — exactly the kind of thin data that looks fake
// even when every individual report is real. Below the threshold we show
// the honest "not enough reports yet" state instead of a number.
export const MIN_SAMPLES_TO_DISPLAY = 5;

const MIN_WAIT_DAYS = 1;
const MAX_WAIT_DAYS = 365 * 3;

export const submitWaitTimeReport = mutation({
  args: {
    destination: v.string(),
    visaType: v.string(),
    applicationDate: v.string(),
    decisionDate: v.string(),
    outcome: v.optional(v.union(v.literal("approved"), v.literal("refused"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await checkUserDailyLimit(
      ctx, user._id, "wait_time_report", 5,
      "You can submit up to 5 wait time reports per day. Resets at midnight UTC.",
    );

    const applied = new Date(args.applicationDate).getTime();
    const decided = new Date(args.decisionDate).getTime();
    if (Number.isNaN(applied) || Number.isNaN(decided)) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Please enter valid dates." });
    }
    const waitDays = Math.round((decided - applied) / (24 * 60 * 60 * 1000));
    if (waitDays < MIN_WAIT_DAYS || waitDays > MAX_WAIT_DAYS) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "That date range doesn't look right — the decision date should be after the application date, within a few years.",
      });
    }

    await ctx.db.insert("wait_time_reports", {
      destination: args.destination,
      visaType: args.visaType,
      applicationDate: args.applicationDate,
      decisionDate: args.decisionDate,
      waitDays,
      outcome: args.outcome,
      submittedByUserId: user._id,
      createdAt: new Date().toISOString(),
    });
  },
});

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

// Public — returns only the aggregate (sample size + median), never the
// individual reports, so there's nothing identifying in the response.
export const getWaitTimeStats = query({
  args: { destination: v.string(), visaType: v.string() },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("wait_time_reports")
      .withIndex("by_destination_visatype", (q) => q.eq("destination", args.destination).eq("visaType", args.visaType))
      .take(500);

    const sampleSize = reports.length;
    if (sampleSize < MIN_SAMPLES_TO_DISPLAY) {
      return { sampleSize, hasEnoughData: false as const };
    }

    const waitDaysList = reports.map((r) => r.waitDays);
    return {
      sampleSize,
      hasEnoughData: true as const,
      medianWaitDays: median(waitDaysList),
      minWaitDays: Math.min(...waitDaysList),
      maxWaitDays: Math.max(...waitDaysList),
    };
  },
});

export const getMyReports = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("wait_time_reports")
      .withIndex("by_user", (q) => q.eq("submittedByUserId", user._id))
      .order("desc")
      .take(20);
  },
});

// Admin visibility only — total volume and which routes already have
// enough data, so the founder can see this is real and growing without
// having to inspect raw tables.
export const getAdminOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("wait_time_reports").order("desc").take(1000);

    const byRoute = new Map<string, number>();
    for (const r of all) {
      const key = `${r.destination} · ${r.visaType}`;
      byRoute.set(key, (byRoute.get(key) ?? 0) + 1);
    }

    const routes = Array.from(byRoute.entries())
      .map(([route, count]) => ({ route, count, hasEnoughData: count >= MIN_SAMPLES_TO_DISPLAY }))
      .sort((a, b) => b.count - a.count);

    return { totalReports: all.length, routes };
  },
});
