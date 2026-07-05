import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { bumpStat } from "./platformStats.ts";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";

export const generateRejectionUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if ((user.plan ?? "free") !== "expert") {
      throw new ConvexError({ code: "FORBIDDEN", message: "The Rejection Analyser requires an Expert plan." });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Called by the frontend immediately after a successful PDF upload, before
// analyseRejection is called. This records the (user, storageId) pair so
// the action can verify the caller actually uploaded the file themselves,
// preventing one Expert user from reading or deleting another user's PDF.
export const confirmRejectionUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if ((user.plan ?? "free") !== "expert") {
      throw new ConvexError({ code: "FORBIDDEN", message: "The Rejection Analyser requires an Expert plan." });
    }
    // Clean up any stale pending uploads from this user first.
    const stale = await ctx.db
      .query("pending_rejection_uploads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const row of stale) {
      try { await ctx.storage.delete(row.storageId); } catch {}
      await ctx.db.delete(row._id);
    }
    await ctx.db.insert("pending_rejection_uploads", {
      userId: user._id,
      storageId: args.storageId,
      createdAt: new Date().toISOString(),
    });
  },
});

export const saveAnalysis = internalMutation({
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

export const getPendingUpload = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pending_rejection_uploads")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .unique();
  },
});

export const deletePendingUpload = internalMutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("pending_rejection_uploads")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (row) await ctx.db.delete(row._id);
  },
});

// Export userId type for use in actions
export type UserId = Id<"users">;
