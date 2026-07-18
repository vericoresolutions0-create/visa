import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireAdmin, logAdminAction } from "../admin.ts";
import { bumpStat } from "../platformStats.ts";

// Called from convex/emails/sendEmail.ts once retries are exhausted — the
// one place a real email (password reset, email-change confirmation,
// document-expiry alert, invite) can silently vanish. Writing a durable row
// here (instead of only console.error) is what actually makes that failure
// visible to an admin instead of just to a log nobody's watching.
export const recordFailure = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    errorMessage: v.string(),
    attempts: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("email_delivery_failures", {
      to: args.to,
      subject: args.subject,
      errorMessage: args.errorMessage,
      attempts: args.attempts,
      createdAt: new Date().toISOString(),
    });
    await bumpStat(ctx, "unresolvedEmailFailuresCount", 1);
  },
});

// Admin: recent failures, most-recent first. Unresolved ones surface first
// via the by_resolved_created index (undefined sorts before any string),
// giving the admin a real actionable queue instead of an undifferentiated
// list they have to scan by eye.
export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [unresolved, resolved] = await Promise.all([
      ctx.db
        .query("email_delivery_failures")
        .withIndex("by_resolved_created", (q) => q.eq("resolvedAt", undefined))
        .order("desc")
        .take(100),
      ctx.db
        .query("email_delivery_failures")
        .withIndex("by_created")
        .order("desc")
        .take(20),
    ]);
    // resolved rows filtered client-of-this-query-side from the small
    // "recent 20 overall" page — simplest correct way to show a handful of
    // recently-resolved rows for context without a third index.
    const recentResolved = resolved.filter((r) => r.resolvedAt);
    return { unresolved, recentResolved };
  },
});

// Admin: mark a failure as reviewed (e.g. after manually following up with
// the affected user) so it drops out of the live unresolved count/queue.
export const markReviewed = mutation({
  args: { failureId: v.id("email_delivery_failures") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const failure = await ctx.db.get(args.failureId);
    if (!failure) throw new ConvexError({ code: "NOT_FOUND", message: "Failure record not found." });
    if (failure.resolvedAt) return; // already reviewed — idempotent, no double-decrement

    await ctx.db.patch(args.failureId, { resolvedAt: new Date().toISOString() });
    await bumpStat(ctx, "unresolvedEmailFailuresCount", -1);
    await logAdminAction(ctx, admin, "reviewEmailFailure", args.failureId, `${failure.to} — ${failure.subject}`);
  },
});
