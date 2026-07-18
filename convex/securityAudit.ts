import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import { bumpStat } from "./platformStats.ts";
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

export const adminGetSecurityStats = query({
  args: {},
  handler: async (ctx, _args) => {
    await requireAdmin(ctx);
    try {
      const all = await ctx.db
        .query("security_audit_logs")
        .withIndex("by_created")
        .order("desc")
        .take(1000);
      const mitigations = await ctx.db
        .query("security_threat_actions")
        .withIndex("by_created")
        .order("desc")
        .take(2000);
      return {
        total: all.length,
        critical: all.filter((e) => e.severity === "critical").length,
        warn: all.filter((e) => e.severity === "warn").length,
        info: all.filter((e) => e.severity === "info").length,
        mitigated: mitigations.filter(
          (a) => a.action === "reviewed" || a.action === "dismissed",
        ).length,
      };
    } catch {
      return { total: 0, critical: 0, warn: 0, info: 0, mitigated: 0 };
    }
  },
});

export const adminGetThreatActions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    try {
      return await ctx.db
        .query("security_threat_actions")
        .withIndex("by_created")
        .order("desc")
        .take(args.limit ?? 500);
    } catch {
      return [];
    }
  },
});

export const adminTakeAction = mutation({
  args: {
    eventId: v.optional(v.id("security_audit_logs")),
    actorUserId: v.id("users"),
    action: v.union(
      v.literal("reviewed"),
      v.literal("dismissed"),
      v.literal("note_added"),
      v.literal("user_suspended"),
      v.literal("user_unsuspended"),
      v.literal("leads_revoked"),
      v.literal("leads_restored"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = new Date().toISOString();

    if (args.action === "user_suspended" || args.action === "user_unsuspended") {
      const suspended = args.action === "user_suspended";
      const actor = await ctx.db.get(args.actorUserId);
      const wasSuspended = !!actor?.isSuspended;

      await ctx.db.patch(args.actorUserId, suspended
        ? { isSuspended: true, suspendedAt: now, suspendedByAdminId: admin._id }
        : { isSuspended: false });

      // Keeps platform_stats.suspendedUsersCount accurate so
      // convex/systemHealth.ts's getSystemHealth never has to take(5000) the
      // whole users table just to count this flag. Guarded on the real
      // before/after state (not just which button was clicked) so clicking
      // "Suspend" twice on an already-suspended user — or "Unsuspend" on a
      // user who isn't — can never drift the counter away from the truth.
      if (wasSuspended !== suspended) {
        await bumpStat(ctx, "suspendedUsersCount", suspended ? 1 : -1);
      }

      // Mirror onto agent_profiles (if the suspended account is an agent) so
      // the public marketplace — listing, search, public profile, contact —
      // stops surfacing/accepting messages for them immediately. Without
      // this, a suspended agent stayed fully visible and bookable, since
      // those queries only ever checked `verified`, never account suspension.
      const profile = await ctx.db
        .query("agent_profiles")
        .withIndex("by_user", (q) => q.eq("userId", args.actorUserId))
        .unique();
      if (profile) {
        await ctx.db.patch(profile._id, { suspended });
      }
    } else if (args.action === "leads_revoked" || args.action === "leads_restored") {
      // Enforced in marketplace.ts's unlockLead. A no-op audit-log-only entry
      // if the actor isn't an agent (no agent_profiles row) — logged, not
      // thrown, since an admin reviewing a mixed threat feed may not always
      // know an actor's account type before clicking this.
      const profile = await ctx.db
        .query("agent_profiles")
        .withIndex("by_user", (q) => q.eq("userId", args.actorUserId))
        .unique();
      if (profile) {
        const revoked = args.action === "leads_revoked";
        const wasRevoked = !!profile.leadAccessRevoked;
        await ctx.db.patch(profile._id, { leadAccessRevoked: revoked });
        // Same drift-proofing as suspendedUsersCount above — only bump on a
        // real state transition, not on every click of the button.
        if (wasRevoked !== revoked) {
          await bumpStat(ctx, "leadAccessRevokedCount", revoked ? 1 : -1);
        }
      } else {
        console.error(`adminTakeAction: ${args.action} requested for ${args.actorUserId}, who has no agent_profiles row — logged only, nothing to enforce.`);
      }
    }

    await ctx.db.insert("security_threat_actions", {
      eventId: args.eventId,
      actorUserId: args.actorUserId,
      adminId: admin._id,
      action: args.action,
      notes: args.notes,
      createdAt: now,
    });
  },
});
