import { ConvexError, v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.js";
import { bumpStat, bumpPlanCounters, readStats } from "./platformStats.ts";
import { getCurrentUserOrThrow } from "./authHelpers.ts";

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  if (user.role !== "admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return user;
}

export async function logAdminAction(
  ctx: MutationCtx,
  admin: Doc<"users">,
  action: string,
  targetId?: string,
  details?: string,
) {
  await ctx.db.insert("admin_audit_log", {
    adminUserId: admin._id,
    adminEmail: admin.email,
    action,
    targetId,
    details,
    createdAt: new Date().toISOString(),
  });
}

export const getAuditLog = query({
  args: {},
  handler: async (ctx): Promise<Doc<"admin_audit_log">[]> => {
    await requireAdmin(ctx);
    try {
      return await ctx.db.query("admin_audit_log").order("desc").take(100);
    } catch {
      return [];
    }
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx): Promise<{ totalUsers: number; proUsers: number; freeUsers: number; totalChecklists: number; totalAgents: number; totalRejectionAnalyses: number }> => {
    await requireAdmin(ctx);
    const stats = await readStats(ctx);
    // proUsers/expertUsers are denormalized counters (see platformStats.ts),
    // kept accurate by bumpPlanCounters at every real plan change — never a
    // collect() over every paying user, which wouldn't scale.
    const paidCount = stats.proUsers + stats.expertUsers;
    return {
      totalUsers: stats.totalUsers,
      proUsers: paidCount,
      freeUsers: Math.max(0, stats.totalUsers - paidCount),
      totalChecklists: stats.totalChecklists,
      totalAgents: stats.totalAgents,
      totalRejectionAnalyses: stats.totalRejectionAnalyses,
    };
  },
});

// Hard server-side ceiling regardless of what a caller requests — at scale,
// an unbounded client-supplied limit could trigger a multi-million-row read
// in a single query even from a legitimate admin session.
const MAX_USERS_PAGE = 500;

export const getUsers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Doc<"users">[]> => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 50, MAX_USERS_PAGE);
    return await ctx.db.query("users").order("desc").take(limit);
  },
});

export const updateUserPlan = mutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("expert")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    await bumpPlanCounters(ctx, target?.plan, args.plan);
    await ctx.db.patch(args.userId, { plan: args.plan });
    await logAdminAction(ctx, admin, "updateUserPlan", args.userId, `${target?.plan ?? "free"} -> ${args.plan} (${target?.email ?? "unknown"})`);
  },
});

// Bootstrap mutation — works exactly once, while the database has zero admins.
// After the first admin exists this permanently throws, so there's no ongoing
// attack surface. The founder calls this once from /admin after signing up.
export const claimFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Restrict to the configured founder email so a random user cannot
    // claim the admin seat if they sign up before the founder does.
    const founderEmail = process.env.FOUNDER_EMAIL;
    if (founderEmail && user.email?.toLowerCase() !== founderEmail.toLowerCase()) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Admin seat claim is restricted to the platform owner.",
      });
    }

    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();
    const adminAlreadyExists = !!existingAdmin;
    if (adminAlreadyExists) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "An admin account already exists. Contact the existing admin to grant access.",
      });
    }

    await ctx.db.patch(user._id, { role: "admin" });
    await ctx.db.insert("admin_audit_log", {
      adminUserId: user._id,
      adminEmail: user.email,
      action: "claimFirstAdmin",
      targetId: user._id,
      details: `Bootstrap: ${user.email ?? user._id} claimed first admin`,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    await ctx.db.patch(args.userId, { role: args.role });
    await logAdminAction(ctx, admin, "updateUserRole", args.userId, `${target?.role ?? "user"} -> ${args.role} (${target?.email ?? "unknown"})`);
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    const [
      checklists, reminders, analyses, agentProfiles, vaultDocs, countryWatches,
      aiUsageRows, communityPosts, wallOfFameStories, waitTimeReports, clientIntakes,
      expirations, pendingEmailChanges, rejectionAnalyserUsage, inAppNotifications,
      orgMembers, visaStatuses, travelTrips, managedDependents, checklistAudits,
      userDailyUsage, sentContactRequests, employeeLinks, riskScoreResults, pendingRejectionUploads,
      agentReviews, marketplaceLeads, approvalStories,
    ] = await Promise.all([
      ctx.db.query("saved_checklists").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(500),
      ctx.db.query("reminders").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(500),
      ctx.db.query("rejection_analyses").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(500),
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(5),
      ctx.db.query("vault_documents").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(500),
      ctx.db.query("country_watches").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(20),
      ctx.db.query("ai_assistant_usage").withIndex("by_user_month", (q) => q.eq("userId", args.userId)).take(500),
      ctx.db.query("community_posts").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(500),
      ctx.db.query("wall_of_fame_stories").withIndex("by_user", (q) => q.eq("submittedByUserId", args.userId)).take(50),
      ctx.db.query("wait_time_reports").withIndex("by_user", (q) => q.eq("submittedByUserId", args.userId)).take(500),
      ctx.db.query("client_intakes").withIndex("by_agent", (q) => q.eq("agentId", args.userId)).take(500),
      ctx.db.query("one_time_plan_expirations").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(10),
      ctx.db.query("pending_email_changes").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(10),
      ctx.db.query("rejection_analyser_usage").withIndex("by_user_month", (q) => q.eq("userId", args.userId)).take(500),
      ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(500),
      ctx.db.query("org_members").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(20),
      ctx.db.query("visa_status").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(20),
      ctx.db.query("travel_trips").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(50),
      ctx.db.query("managed_dependents").withIndex("by_parent", (q) => q.eq("parentUserId", args.userId)).take(50),
      ctx.db.query("checklist_audits").withIndex("by_user_route", (q) => q.eq("userId", args.userId)).take(500),
      ctx.db.query("user_daily_usage").withIndex("by_user_resource_date", (q) => q.eq("userId", args.userId)).take(500),
      ctx.db.query("agent_contact_requests").withIndex("by_from_user", (q) => q.eq("fromUserId", args.userId)).take(500),
      ctx.db.query("org_employee_links").withIndex("by_employee_user", (q) => q.eq("employeeUserId", args.userId)).take(50),
      ctx.db.query("risk_score_results").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(20),
      ctx.db.query("pending_rejection_uploads").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(10),
      ctx.db.query("agent_reviews").withIndex("by_reviewer_agent", (q) => q.eq("reviewerUserId", args.userId)).take(200),
      ctx.db.query("marketplace_leads").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(200),
      ctx.db.query("approval_stories").withIndex("by_submitter", (q) => q.eq("submittedByUserId", args.userId)).take(200),
    ]);

    // Delete storage blobs before their rows.
    for (const doc of vaultDocs) {
      await ctx.storage.delete(doc.storageId);
    }
    for (const intake of clientIntakes) {
      const documents = await ctx.db
        .query("client_documents")
        .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
        .take(30);
      for (const doc of documents) {
        await ctx.storage.delete(doc.storageId);
        await ctx.db.delete(doc._id);
      }
    }
    for (const upload of pendingRejectionUploads) {
      try { await ctx.storage.delete(upload.storageId); } catch {}
    }

    // Delete employer notes about this user as an employee.
    for (const link of employeeLinks) {
      const notes = await ctx.db
        .query("org_employee_notes")
        .withIndex("by_link", (q) => q.eq("linkId", link._id))
        .take(100);
      for (const note of notes) {
        await ctx.db.delete(note._id);
      }
    }

    for (const row of [
      ...checklists, ...reminders, ...analyses, ...agentProfiles, ...vaultDocs,
      ...countryWatches, ...aiUsageRows, ...communityPosts, ...wallOfFameStories,
      ...waitTimeReports, ...clientIntakes, ...expirations, ...pendingEmailChanges,
      ...rejectionAnalyserUsage, ...inAppNotifications, ...orgMembers, ...visaStatuses,
      ...travelTrips, ...managedDependents, ...checklistAudits, ...userDailyUsage,
      ...sentContactRequests, ...employeeLinks, ...riskScoreResults, ...pendingRejectionUploads,
      ...agentReviews, ...marketplaceLeads, ...approvalStories,
    ]) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(args.userId);

    await bumpStat(ctx, "totalUsers", -1);
    await bumpPlanCounters(ctx, target.plan, undefined);
    await bumpStat(ctx, "totalChecklists", -checklists.length);
    await bumpStat(ctx, "totalRejectionAnalyses", -analyses.length);
    if (agentProfiles.length > 0) await bumpStat(ctx, "totalAgents", -agentProfiles.length);

    await logAdminAction(ctx, admin, "deleteUser", args.userId, target.email ?? "unknown");
  },
});

export const getAgents = query({
  args: {},
  handler: async (ctx): Promise<Doc<"agent_profiles">[]> => {
    await requireAdmin(ctx);
    return await ctx.db.query("agent_profiles").order("desc").take(100);
  },
});

export const verifyAgent = mutation({
  args: { agentId: v.id("agent_profiles"), verified: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const target = await ctx.db.get(args.agentId);
    await ctx.db.patch(args.agentId, { verified: args.verified });
    await logAdminAction(ctx, admin, "verifyAgent", args.agentId, `verified=${args.verified} (${target?.fullName ?? "unknown"})`);
  },
});

// ─── System health check ──────────────────────────────────────────────────────
// Returns which env vars are configured (true/false only — never their values).
// Used by the Setup panel in the admin UI to give a clear at-a-glance status.
export const getSystemHealth = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const check = (name: string) => Boolean(process.env[name]);
    return {
      SITE_URL:              process.env.SITE_URL ?? null,
      RESEND_FROM_EMAIL:     process.env.RESEND_FROM_EMAIL ?? null,
      RESEND_API_KEY:        check("RESEND_API_KEY"),
      OPENAI_API_KEY:        check("OPENAI_API_KEY"),
      STRIPE_SECRET_KEY:     check("STRIPE_SECRET_KEY"),
      STRIPE_WEBHOOK_SECRET: check("STRIPE_WEBHOOK_SECRET"),
      PAYSTACK_SECRET_KEY:   check("PAYSTACK_SECRET_KEY"),
      AUTH_GOOGLE_ID:        check("AUTH_GOOGLE_ID"),
      AUTH_GOOGLE_SECRET:    check("AUTH_GOOGLE_SECRET"),
      TELEGRAM_BOT_TOKEN:    check("TELEGRAM_BOT_TOKEN"),
      TWILIO_ACCOUNT_SID:    check("TWILIO_ACCOUNT_SID"),
      TWILIO_AUTH_TOKEN:     check("TWILIO_AUTH_TOKEN"),
      TWILIO_WHATSAPP_NUMBER:check("TWILIO_WHATSAPP_NUMBER"),
    };
  },
});

// ─── One-time bootstrap gate: has any admin been claimed? ────────────────────
// Public (no auth required) — the only information disclosed is a boolean.
// Used by the admin page to hide the "Claim first admin seat" button once an
// admin already exists, so non-admin users see a clean "access denied" rather
// than a button that immediately errors on click.
export const checkAdminExists = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();
    return admin !== null;
  },
});

// ─── Payout request admin queries / mutations ────────────────────────────────

export const listPayoutRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const pending = await ctx.db
      .query("payout_requests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(100);
    // Hydrate with agent name for display
    return await Promise.all(
      pending.map(async (req) => {
        const agent = await ctx.db.get(req.agentUserId);
        return {
          _id: req._id,
          agentUserId: req.agentUserId,
          agentName: agent?.name ?? agent?.email ?? "Unknown agent",
          agentEmail: agent?.email ?? null,
          amountCents: req.amountCents,
          status: req.status,
          requestedAt: req.requestedAt,
          notes: req.notes ?? null,
        };
      }),
    );
  },
});

export const processPayoutRequest = mutation({
  args: {
    requestId: v.id("payout_requests"),
    decision: v.union(v.literal("paid"), v.literal("declined")),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError({ code: "NOT_FOUND", message: "Payout request not found." });
    if (req.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This request has already been processed." });
    }
    await ctx.db.patch(args.requestId, {
      status: args.decision,
      processedAt: new Date().toISOString(),
      processedByUserId: admin._id,
      adminNotes: args.adminNotes,
    });
    await logAdminAction(
      ctx, admin, "processPayoutRequest", args.requestId,
      `${args.decision} $${(req.amountCents / 100).toFixed(2)} — ${args.adminNotes ?? "no notes"}`,
    );
  },
});

// Re-export the Id type alias used in the admin page
export type { Id };

// Used by "use node" actions that can't call requireAdmin directly.
export const verifyAdminForAction = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return true;
  },
});

// ── AI Usage Analytics ────────────────────────────────────────────────────────
// Real data from user_daily_usage. Admin-only. Full table scan is fine at this
// scale — the table will have <10k rows for months, and this panel is admin-only.

export const getAIUsage = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allRows = await ctx.db.query("user_daily_usage").collect();

    // Only care about AI rows
    const aiRows = allRows.filter(
      (r) => r.resource === "agent_ai_agent" || r.resource === "agent_ai_business",
    );

    // Build last-7-days date keys (UTC)
    const today = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    const todayKey = days[days.length - 1];

    // Aggregate by day
    const byDay: Record<string, { agent: number; business: number }> = {};
    for (const day of days) byDay[day] = { agent: 0, business: 0 };
    for (const row of aiRows) {
      if (!byDay[row.dateKey]) continue;
      if (row.resource === "agent_ai_agent") byDay[row.dateKey].agent += row.count;
      else byDay[row.dateKey].business += row.count;
    }

    // Today's totals
    const todayAgent = byDay[todayKey]?.agent ?? 0;
    const todayBusiness = byDay[todayKey]?.business ?? 0;

    // All-time totals
    const totalAgent = aiRows.filter(r => r.resource === "agent_ai_agent").reduce((s, r) => s + r.count, 0);
    const totalBusiness = aiRows.filter(r => r.resource === "agent_ai_business").reduce((s, r) => s + r.count, 0);

    // Top users this week (last 7 days) — load emails from users table
    const weekKeys = new Set(days);
    const weekRows = aiRows.filter((r) => weekKeys.has(r.dateKey));
    const userTotals: Record<string, { agent: number; business: number; userId: string }> = {};
    for (const row of weekRows) {
      const uid = row.userId;
      if (!userTotals[uid]) userTotals[uid] = { agent: 0, business: 0, userId: uid };
      if (row.resource === "agent_ai_agent") userTotals[uid].agent += row.count;
      else userTotals[uid].business += row.count;
    }

    const topUserIds = Object.values(userTotals)
      .sort((a, b) => (b.agent + b.business) - (a.agent + a.business))
      .slice(0, 15);

    const topUsers = await Promise.all(
      topUserIds.map(async (entry) => {
        const user = await ctx.db.get(entry.userId as Id<"users">);
        return {
          email: user?.email ?? "unknown",
          name: user?.name ?? null,
          agentMessages: entry.agent,
          bizMessages: entry.business,
          total: entry.agent + entry.business,
        };
      }),
    );

    return {
      todayAgent,
      todayBusiness,
      todayTotal: todayAgent + todayBusiness,
      totalAgent,
      totalBusiness,
      totalAllTime: totalAgent + totalBusiness,
      trend: days.map((day) => ({
        day,
        agent: byDay[day].agent,
        business: byDay[day].business,
        total: byDay[day].agent + byDay[day].business,
      })),
      topUsers,
    };
  },
});
