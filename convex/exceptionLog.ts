import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin, logAdminAction } from "./admin.ts";

const MAX_MESSAGE_LENGTH = 500;
const MAX_UNRESOLVED = 100;
const MAX_RESOLVED = 30;

async function recordExceptionImpl(ctx: MutationCtx, args: { functionName: string; errorMessage: string }) {
  const errorMessage = args.errorMessage.slice(0, MAX_MESSAGE_LENGTH);
  const now = new Date().toISOString();

  const existing = await ctx.db
    .query("backend_exceptions")
    .withIndex("by_function_message", (q) => q.eq("functionName", args.functionName).eq("errorMessage", errorMessage))
    .filter((q) => q.eq(q.field("resolvedAt"), undefined))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { occurrenceCount: existing.occurrenceCount + 1, lastSeenAt: now });
    return;
  }

  await ctx.db.insert("backend_exceptions", {
    functionName: args.functionName,
    errorMessage,
    occurrenceCount: 1,
    firstSeenAt: now,
    lastSeenAt: now,
  });
}

export const recordException = internalMutation({
  args: { functionName: v.string(), errorMessage: v.string() },
  handler: async (ctx, args) => recordExceptionImpl(ctx, args),
});

// Call from an action's catch block (or any spot that already knows
// something needs manual review): captureException(ctx, "stripe.webhook", err).
// Actions can't touch ctx.db directly, so this hops through the internal
// mutation above rather than writing straight to the table.
export async function captureException(ctx: ActionCtx, functionName: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  await ctx.runMutation(internal.exceptionLog.recordException, { functionName, errorMessage });
}

export const listExceptions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [unresolved, recent] = await Promise.all([
      ctx.db
        .query("backend_exceptions")
        .withIndex("by_resolved_lastSeen", (q) => q.eq("resolvedAt", undefined))
        .order("desc")
        .take(MAX_UNRESOLVED),
      // Recently-resolved rows, filtered client-of-this-query-side from the
      // small "recent N overall" page — same simplest-correct approach as
      // email_delivery_failures.listRecent, to avoid a third index.
      ctx.db
        .query("backend_exceptions")
        .withIndex("by_lastSeen")
        .order("desc")
        .take(MAX_RESOLVED),
    ]);
    const recentResolved = recent.filter((r) => r.resolvedAt);
    return { unresolved, recentResolved };
  },
});

export const resolveException = mutation({
  args: { exceptionId: v.id("backend_exceptions") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const exception = await ctx.db.get(args.exceptionId);
    if (!exception) throw new ConvexError({ code: "NOT_FOUND", message: "Alert not found." });
    await ctx.db.patch(args.exceptionId, { resolvedAt: new Date().toISOString(), resolvedByAdminId: admin._id });
    await logAdminAction(ctx, admin, "exception_resolved", args.exceptionId, `${exception.functionName}: ${exception.errorMessage.slice(0, 80)}`);
  },
});
