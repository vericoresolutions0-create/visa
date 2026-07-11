import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import type { Id } from "./_generated/dataModel";

// Inline helper — call from within any mutation to write an audit event in the
// same transaction, with no extra round-trip.
export async function logSecurityEvent(
  ctx: MutationCtx,
  event: {
    actorUserId: Id<"users">;
    action: string;
    severity: "info" | "warn" | "critical";
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await ctx.db.insert("security_audit_logs", {
    actorUserId: event.actorUserId,
    action: event.action,
    severity: event.severity,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    metadata: event.metadata ? JSON.stringify(event.metadata) : undefined,
    createdAt: new Date().toISOString(),
  });
}

// Stand-alone internalMutation for callers that can't write DB directly (actions).
export const log = internalMutation({
  args: {
    actorUserId: v.id("users"),
    action: v.string(),
    severity: v.union(v.literal("info"), v.literal("warn"), v.literal("critical")),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("security_audit_logs", {
      actorUserId: args.actorUserId,
      action: args.action,
      severity: args.severity,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      metadata: args.metadata,
      createdAt: new Date().toISOString(),
    });
  },
});

// Admin-only read — returns the 200 most recent security events.
export const getSecurityAuditLog = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("security_audit_logs")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit ?? 200);
  },
});

// Public admin query wrapping the internal one above — used by the admin panel.
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./authHelpers.ts";

export const adminGetSecurityLog = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    try {
      return await ctx.db
        .query("security_audit_logs")
        .withIndex("by_created")
        .order("desc")
        .take(args.limit ?? 200);
    } catch {
      return [];
    }
  },
});

export const adminGetActorEvents = query({
  args: { actorUserId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, _args) => {
    await requireAdmin(ctx);
    try {
      return await ctx.db
        .query("security_audit_logs")
        .withIndex("by_actor", (q) => q.eq("actorUserId", _args.actorUserId))
        .order("desc")
        .take(_args.limit ?? 100);
    } catch {
      return [];
    }
  },
});
