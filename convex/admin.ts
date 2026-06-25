import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.js";
import { bumpStat, readStats } from "./platformStats.ts";

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || user.role !== "admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return user;
}

export const getStats = query({
  args: {},
  handler: async (ctx): Promise<{ totalUsers: number; proUsers: number; freeUsers: number; totalChecklists: number; totalAgents: number; totalRejectionAnalyses: number }> => {
    await requireAdmin(ctx);
    const stats = await readStats(ctx);
    // proUsers/expertUsers are read via an index scoped to just that plan
    // (the paid minority), never a scan of every user — freeUsers is then
    // derived by subtraction instead of also being scanned directly.
    const [proUsers, expertUsers] = await Promise.all([
      ctx.db.query("users").withIndex("by_plan", (q) => q.eq("plan", "pro")).collect(),
      ctx.db.query("users").withIndex("by_plan", (q) => q.eq("plan", "expert")).collect(),
    ]);
    const paidCount = proUsers.length + expertUsers.length;
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

export const getUsers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Doc<"users">[]> => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").order("desc").take(args.limit ?? 50);
  },
});

export const updateUserPlan = mutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("expert")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { plan: args.plan });
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.userId);
    await bumpStat(ctx, "totalUsers", -1);
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
    await requireAdmin(ctx);
    await ctx.db.patch(args.agentId, { verified: args.verified });
  },
});

// Re-export the Id type alias used in the admin page
export type { Id };
