import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
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
    return await ctx.db.query("admin_audit_log").order("desc").take(100);
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

    const [checklists, reminders, analyses, agentProfiles, vaultDocs, countryWatches, aiUsageRows, expirations] =
      await Promise.all([
        ctx.db.query("saved_checklists").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
        ctx.db.query("reminders").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
        ctx.db.query("rejection_analyses").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
        ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
        ctx.db.query("vault_documents").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
        ctx.db.query("country_watches").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
        ctx.db.query("ai_assistant_usage").withIndex("by_user_month", (q) => q.eq("userId", args.userId)).collect(),
        ctx.db.query("one_time_plan_expirations").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect(),
      ]);

    // Delete storage files before their rows — leaving files behind without
    // rows is a GDPR right-to-erasure violation for a product that promises
    // data privacy in its own marketing and emails.
    for (const doc of vaultDocs) {
      await ctx.storage.delete(doc.storageId);
    }

    for (const doc of [...checklists, ...reminders, ...analyses, ...agentProfiles, ...vaultDocs, ...countryWatches, ...aiUsageRows, ...expirations]) {
      await ctx.db.delete(doc._id);
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

// Re-export the Id type alias used in the admin page
export type { Id };
