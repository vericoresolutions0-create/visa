import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";
import { hasActiveAgentTrial } from "./agentTrials.ts";
import type { Doc, Id } from "./_generated/dataModel";

const PAID_PLANS = ["pro", "expert"] as const;
const isPaid = (plan: string | undefined) =>
  PAID_PLANS.includes(plan as (typeof PAID_PLANS)[number]);

// A trial-only agent (agentTrialPlan set, no paid agentPlan yet — the normal
// state for the entire duration of a trial) is still an active agent for
// notification purposes. Checking agentPlan alone silently excludes every
// agent who hasn't converted to paid yet, which is exactly the population
// trial-expiry warnings need to reach. Caught live: a debug trial user seeded
// against a real local backend got zero notification despite the dispatcher
// running successfully, traced to this gate.
const isActiveAgent = (user: Doc<"users">) => !!user.agentPlan || hasActiveAgentTrial(user);

// Business/org accounts have no plan of their own (org features today are
// free — see organizations.ts) so the isPaid check never covers them. Same
// gap as the trial-agent bug above: without this, an org admin on the free
// personal plan gets a permanently-empty bell with zero indication anything
// is wrong, even though real notifications are being created for them.
async function isOrgAdmin(ctx: QueryCtx, userId: Id<"users">): Promise<boolean> {
  const membership = await ctx.db
    .query("org_members")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return !!membership && membership.orgRole === "org_admin";
}

// ─── Read notifications (paid users, active agents incl. trial, org admins) ──
export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    if (!isPaid(user.plan) && !isActiveAgent(user) && !(await isOrgAdmin(ctx, user._id))) return [];
    return await ctx.db
      .query("in_app_notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(30);
  },
});

// ─── Unread count (paid users, active agents incl. trial, org admins) ────────
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    if (!isPaid(user.plan) && !isActiveAgent(user) && !(await isOrgAdmin(ctx, user._id))) return 0;
    const unread = await ctx.db
      .query("in_app_notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false),
      )
      .take(50);
    return unread.length;
  },
});

// ─── Mark all read ────────────────────────────────────────────────────────────
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!isPaid(user.plan) && !isActiveAgent(user) && !(await isOrgAdmin(ctx, user._id))) return;
    const unread = await ctx.db
      .query("in_app_notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false),
      )
      .take(200);
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
  },
});

// ─── Mark one read ────────────────────────────────────────────────────────────
export const markRead = mutation({
  args: { id: v.id("in_app_notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const notification = await ctx.db.get(args.id);
    if (!notification) throw new ConvexError({ code: "NOT_FOUND", message: "Notification not found" });
    if (notification.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your notification" });
    }
    await ctx.db.patch(args.id, { read: true });
  },
});

// ─── Internal: create a notification for a paid user ─────────────────────────
// All dispatchers go through this single chokepoint so the paid-plan guard
// is never accidentally bypassed by a new caller.
export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("reminder_due"),
      v.literal("document_expiry"),
      v.literal("trip_deadline"),
    ),
    title: v.string(),
    body: v.string(),
    linkTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    // Silently skip if user no longer exists or is no longer paid — crons run
    // on a schedule and a user may have downgraded since the row was scanned.
    if (!user || !isPaid(user.plan)) return;
    await ctx.db.insert("in_app_notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      linkTo: args.linkTo,
      read: false,
      createdAt: new Date().toISOString(),
    });
  },
});

// ─── Internal: create any agent-side notification ─────────────────────────────
// Generalized version of createAgentLeadNotification below — gates on active
// agent status (paid agentPlan OR an unexpired trial) since agents are a
// separate account type from paid applicants. New agent notification types
// should go through this rather than inserting into in_app_notifications
// directly.
export const createAgentNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("marketplace_lead_alert"),
      v.literal("agent_trial_expiring"),
      v.literal("agent_payment_failed"),
      v.literal("agent_commission_earned"),
      v.literal("agent_payout_status"),
      v.literal("agent_review_received"),
      v.literal("agent_returning_client"),
    ),
    title: v.string(),
    body: v.string(),
    linkTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !isActiveAgent(user)) return;
    await ctx.db.insert("in_app_notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      linkTo: args.linkTo,
      read: false,
      createdAt: new Date().toISOString(),
    });
  },
});

// ─── Internal: notify every admin of an organisation ──────────────────────────
// Looks the org's admins up fresh at call time rather than trusting a
// passed-in userId, since a business account can have its admin membership
// change. Today org_members enforces exactly one org_admin per org (see
// organizations.ts getMyOrgAdminMembershipOrThrow), so this fires once in
// practice — written as a fan-out over every admin found so it needs no
// changes when multi-admin orgs ship.
export const createOrgAdminNotification = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    type: v.union(
      v.literal("org_member_invite_accepted"),
      v.literal("org_member_ready"),
      v.literal("org_invite_reminder"),
      v.literal("org_cohort_completed"),
    ),
    title: v.string(),
    body: v.string(),
    linkTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("org_members")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .take(500);
    const admins = members.filter((m) => m.orgRole === "org_admin");
    for (const admin of admins) {
      await ctx.db.insert("in_app_notifications", {
        userId: admin.userId,
        type: args.type,
        title: args.title,
        body: args.body,
        linkTo: args.linkTo,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  },
});

// ─── Internal: create a marketplace lead alert for an agent ──────────────────
// Separate from createNotification because agents gate on active-agent
// status (paid or trial), not consumer plan.
export const createAgentLeadNotification = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    linkTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    // Silently skip if user no longer exists or has no active agent status
    if (!user || !isActiveAgent(user)) return;
    await ctx.db.insert("in_app_notifications", {
      userId: args.userId,
      type: "marketplace_lead_alert",
      title: args.title,
      body: args.body,
      linkTo: args.linkTo,
      read: false,
      createdAt: new Date().toISOString(),
    });
  },
});
