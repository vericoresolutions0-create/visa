import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { bumpStat } from "./platformStats.ts";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";

export const generateRejectionUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const plan = user.plan ?? "free";
    const isTrialActive = user.trialStartedAt
      ? new Date() < new Date(new Date(user.trialStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      : false;
    const effectivePlan = isTrialActive ? "pro" : plan;
    if (effectivePlan !== "expert") {
      throw new ConvexError({ code: "FORBIDDEN", message: "The Rejection Analyser requires an Expert plan." });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAnalysis = mutation({
  args: {
    destination: v.string(),
    visaType: v.string(),
    refusalText: v.string(),
    analysis: v.string(),
    recoveryPlan: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const id = await ctx.db.insert("rejection_analyses", {
      ...args,
      userId: user._id,
      createdAt: new Date().toISOString(),
    });
    await bumpStat(ctx, "totalRejectionAnalyses", 1);
    return id;
  },
});

export const getMyAnalyses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("rejection_analyses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const deleteAnalysis = mutation({
  args: { id: v.id("rejection_analyses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Analysis not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this analysis" });
    }
    await ctx.db.delete(args.id);
    await bumpStat(ctx, "totalRejectionAnalyses", -1);
  },
});

// Export userId type for use in actions
export type UserId = Id<"users">;
