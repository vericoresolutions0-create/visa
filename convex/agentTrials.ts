import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { requireAdmin, logAdminAction } from "./admin.ts";
import { getCurrentUser } from "./authHelpers.ts";
import type { Doc } from "./_generated/dataModel";

// Whether this user currently has an unexpired agent trial. Used by billing.ts
// and licenseCodes.ts to avoid clobbering a trial-granted agent_profiles.tier
// with an unrelated event — a checkout for a different plan, a cancellation,
// a refund, or a code redemption has nothing to do with an active trial, and
// shouldn't silently end it early. A trial is only meant to end via its own
// expiry (cleanupExpiredTrials below) or an explicit admin revokeTrial.
export function hasActiveAgentTrial(user: Doc<"users">): boolean {
  if (!user.agentTrialPlan || !user.agentTrialExpiresAt) return false;
  return new Date(user.agentTrialExpiresAt).getTime() > Date.now();
}

const PLAN_LABELS: Record<string, string> = {
  agent_listing: "Listing",
  agent_featured: "Featured",
  agency_white_label: "White Label",
};

// ─── Admin: grant a free trial ────────────────────────────────────────────────
// Atomically sets the trial on the users record AND updates agent_profiles.tier
// so the agent appears in the correct marketplace section immediately.
export const grantTrial = mutation({
  args: {
    agentUserId: v.id("users"),
    plan: v.union(
      v.literal("agent_listing"),
      v.literal("agent_featured"),
      v.literal("agency_white_label"),
    ),
    durationDays: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.durationDays < 1 || args.durationDays > 365)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Duration must be between 1 and 365 days." });
    if (args.note && args.note.length > 500)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Note must be under 500 characters." });

    const target = await ctx.db.get(args.agentUserId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "Agent user not found." });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + args.durationDays * 86_400_000).toISOString();

    // Patch the trial fields on the users record
    await ctx.db.patch(args.agentUserId, {
      agentTrialPlan: args.plan,
      agentTrialExpiresAt: expiresAt,
      agentTrialGrantedAt: now.toISOString(),
      agentTrialGrantedBy: admin._id,
      agentTrialNote: args.note ?? undefined,
    });

    // Sync agent_profiles.tier so getFeaturedAgents / searchAgents reflect
    // the trial immediately — these queries read agent_profiles.tier directly
    // via the by_tier index and never touch the users table.
    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.agentUserId))
      .unique();
    if (profile) {
      await ctx.db.patch(profile._id, { tier: args.plan });
    }

    await logAdminAction(
      ctx,
      admin,
      "agent_trial_granted",
      args.agentUserId,
      `${PLAN_LABELS[args.plan]} trial for ${args.durationDays} days — expires ${expiresAt}${args.note ? ` | note: ${args.note}` : ""}`,
    );
  },
});

// ─── Admin: revoke a trial ────────────────────────────────────────────────────
// Clears trial fields from users and restores agent_profiles.tier to the real
// paid plan (or removes tier entirely if the agent has no paid subscription).
export const revokeTrial = mutation({
  args: { agentUserId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const target = await ctx.db.get(args.agentUserId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "Agent user not found." });
    if (!target.agentTrialPlan)
      throw new ConvexError({ code: "BAD_REQUEST", message: "This agent has no active trial." });

    // Clear trial fields
    await ctx.db.patch(args.agentUserId, {
      agentTrialPlan: undefined,
      agentTrialExpiresAt: undefined,
      agentTrialGrantedAt: undefined,
      agentTrialGrantedBy: undefined,
      agentTrialNote: undefined,
    });

    // Restore agent_profiles.tier to the real paid plan (agentPlan on users),
    // or clear it entirely if no paid subscription exists.
    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.agentUserId))
      .unique();
    if (profile) {
      await ctx.db.patch(profile._id, { tier: target.agentPlan ?? undefined });
    }

    await logAdminAction(ctx, admin, "agent_trial_revoked", args.agentUserId, "Trial revoked manually by admin");
  },
});

// ─── Cron: expire trials automatically ───────────────────────────────────────
// Called daily at 6:00 AM UTC by crons.ts. Finds all users whose trial has
// passed its expiresAt timestamp, clears the trial fields, and resets
// agent_profiles.tier back to the paid plan (or unsets it).
export const cleanupExpiredTrials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();

    const [listing, featured, whiteLabel] = await Promise.all([
      ctx.db.query("users").withIndex("by_agent_trial_plan", (q) => q.eq("agentTrialPlan", "agent_listing")).take(500),
      ctx.db.query("users").withIndex("by_agent_trial_plan", (q) => q.eq("agentTrialPlan", "agent_featured")).take(500),
      ctx.db.query("users").withIndex("by_agent_trial_plan", (q) => q.eq("agentTrialPlan", "agency_white_label")).take(500),
    ]);

    const expired = [...listing, ...featured, ...whiteLabel].filter(
      (u) => u.agentTrialExpiresAt && u.agentTrialExpiresAt <= now,
    );

    for (const user of expired) {
      await ctx.db.patch(user._id, {
        agentTrialPlan: undefined,
        agentTrialExpiresAt: undefined,
        agentTrialGrantedAt: undefined,
        agentTrialGrantedBy: undefined,
        agentTrialNote: undefined,
      });

      const profile = await ctx.db
        .query("agent_profiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (profile) {
        await ctx.db.patch(profile._id, { tier: user.agentPlan ?? undefined });
      }
    }

    return { cleaned: expired.length };
  },
});

// ─── Admin: list all agents with active (unexpired) trials ───────────────────
export const adminListTrials = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = new Date().toISOString();

    const [listing, featured, whiteLabel] = await Promise.all([
      ctx.db.query("users").withIndex("by_agent_trial_plan", (q) => q.eq("agentTrialPlan", "agent_listing")).take(500),
      ctx.db.query("users").withIndex("by_agent_trial_plan", (q) => q.eq("agentTrialPlan", "agent_featured")).take(500),
      ctx.db.query("users").withIndex("by_agent_trial_plan", (q) => q.eq("agentTrialPlan", "agency_white_label")).take(500),
    ]);

    return [...listing, ...featured, ...whiteLabel]
      .filter((u) => u.agentTrialExpiresAt && u.agentTrialExpiresAt > now)
      .map((u) => {
        const daysLeft = Math.ceil(
          (new Date(u.agentTrialExpiresAt!).getTime() - Date.now()) / 86_400_000,
        );
        return {
          userId: u._id,
          name: u.name ?? "Unknown",
          email: u.email ?? "",
          plan: u.agentTrialPlan as "agent_listing" | "agent_featured" | "agency_white_label",
          expiresAt: u.agentTrialExpiresAt!,
          grantedAt: u.agentTrialGrantedAt ?? null,
          note: u.agentTrialNote ?? null,
          daysLeft,
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  },
});

// ─── Internal: list all active (unexpired) trials, for the expiry-warning
// dispatcher ────────────────────────────────────────────────────────────────
// Same shape as adminListTrials but without the admin auth requirement — the
// daily cron has no user identity to authenticate as.
export const internalListActiveTrials = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();

    const [listing, featured, whiteLabel] = await Promise.all([
      ctx.db.query("users").withIndex("by_agent_trial_plan", (q) => q.eq("agentTrialPlan", "agent_listing")).take(500),
      ctx.db.query("users").withIndex("by_agent_trial_plan", (q) => q.eq("agentTrialPlan", "agent_featured")).take(500),
      ctx.db.query("users").withIndex("by_agent_trial_plan", (q) => q.eq("agentTrialPlan", "agency_white_label")).take(500),
    ]);

    return [...listing, ...featured, ...whiteLabel]
      .filter((u) => u.agentTrialExpiresAt && u.agentTrialExpiresAt > now)
      .map((u) => ({
        userId: u._id,
        email: u.email ?? null,
        name: u.name ?? null,
        plan: u.agentTrialPlan as "agent_listing" | "agent_featured" | "agency_white_label",
        expiresAt: u.agentTrialExpiresAt!,
        daysLeft: Math.ceil((new Date(u.agentTrialExpiresAt!).getTime() - Date.now()) / 86_400_000),
      }));
  },
});

// ─── Agent: get own trial status ─────────────────────────────────────────────
export const getMyTrialStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    if (!user.agentTrialPlan || !user.agentTrialExpiresAt) return null;

    const expiresTs = new Date(user.agentTrialExpiresAt).getTime();
    if (expiresTs <= Date.now()) return null;

    const daysLeft = Math.ceil((expiresTs - Date.now()) / 86_400_000);
    return {
      plan: user.agentTrialPlan,
      expiresAt: user.agentTrialExpiresAt,
      grantedAt: user.agentTrialGrantedAt ?? null,
      daysLeft,
    };
  },
});
