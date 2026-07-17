import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";

// Used by embassyMonitor action to read all stored hashes (and, for real
// diffing when something changes, the previous real page text) before
// fetching pages. Returns a map keyed by destination for O(1) lookups.
export const getAllSnapshots = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Capped well above the ~190 real-world destination count in
    // embassy-monitor-urls.ts so growth there doesn't silently truncate this.
    const rows = await ctx.db.query("embassy_page_snapshots").take(400);
    const map: Record<string, { contentHash: string; textSnapshot?: string }> = {};
    for (const row of rows) {
      map[row.destination] = { contentHash: row.contentHash, textSnapshot: row.textSnapshot };
    }
    return map;
  },
});

// Called by the embassyMonitor action after fetching and hashing a page.
// Upserts the snapshot row — inserts on first check, patches on subsequent checks.
export const saveSnapshot = internalMutation({
  args: {
    destination: v.string(),
    url: v.string(),
    contentHash: v.string(),
    lastCheckedAt: v.string(),
    changed: v.boolean(),         // true when hash differs from stored hash
    previousHash: v.optional(v.string()),
    textSnapshot: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    aiSeverity: v.optional(v.union(v.literal("critical"), v.literal("notable"))),
    aiChangeAdded: v.optional(v.array(v.string())),
    aiChangeRemoved: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("embassy_page_snapshots")
      .withIndex("by_destination", (q) => q.eq("destination", args.destination))
      .unique();

    if (existing) {
      const patch: Record<string, unknown> = {
        contentHash: args.contentHash,
        lastCheckedAt: args.lastCheckedAt,
        textSnapshot: args.textSnapshot,
      };
      if (args.changed) {
        patch.previousHash = args.previousHash;
        patch.changedAt = args.lastCheckedAt;
        patch.alertDismissedAt = undefined; // re-open the alert on a new change
        // Only overwrite the AI fields when this change actually produced a
        // real summary — a failed/skipped AI call shouldn't erase the last
        // genuine one while the admin still hasn't reviewed it.
        if (args.aiSummary) {
          patch.aiSummary = args.aiSummary;
          patch.aiSeverity = args.aiSeverity;
          patch.aiChangeAdded = args.aiChangeAdded;
          patch.aiChangeRemoved = args.aiChangeRemoved;
        }
      }
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("embassy_page_snapshots", {
        destination: args.destination,
        url: args.url,
        contentHash: args.contentHash,
        lastCheckedAt: args.lastCheckedAt,
        textSnapshot: args.textSnapshot,
      });
    }
  },
});

// Admin: list all destinations where the page changed and the admin hasn't
// yet reviewed the change. Ordered by change time — most recent first.
export const listActiveAlerts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Rows where changedAt is set (i.e. a change was detected) and
    // alertDismissedAt is absent (admin hasn't reviewed yet).
    const rows = await ctx.db
      .query("embassy_page_snapshots")
      .withIndex("by_changed")
      .order("desc")
      .take(100);

    return rows.filter((r) => r.changedAt && !r.alertDismissedAt);
  },
});

// Admin: list all monitored destinations with their status, for the
// full "Embassy Monitor" panel view.
export const listAllSnapshots = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Capped well above the ~190 real-world destination count in
    // embassy-monitor-urls.ts so growth there doesn't silently truncate this.
    return await ctx.db.query("embassy_page_snapshots").take(400);
  },
});

// Admin: dismiss a change alert after reviewing and (if needed) updating
// the checklist. Marks alertDismissedAt so the admin panel stops showing it.
export const dismissAlert = mutation({
  args: { destination: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("embassy_page_snapshots")
      .withIndex("by_destination", (q) => q.eq("destination", args.destination))
      .unique();
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "No snapshot found for this destination." });
    await ctx.db.patch(row._id, { alertDismissedAt: new Date().toISOString() });
  },
});

// Admin: list agent reports pending review.
export const listAgentReports = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("agent_reports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(100);
  },
});

// Admin: mark an agent report as reviewed or dismissed.
export const processAgentReport = mutation({
  args: {
    reportId: v.id("agent_reports"),
    decision: v.union(v.literal("reviewed"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError({ code: "NOT_FOUND", message: "Report not found." });
    await ctx.db.patch(args.reportId, { status: args.decision });
  },
});
