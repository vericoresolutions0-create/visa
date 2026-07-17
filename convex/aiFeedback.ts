import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./authHelpers.ts";
import { requireAdmin } from "./admin.ts";

// Real thumbs up/down on an AI Assistant answer — the checklist page's
// feedback buttons used to only flip local component state and show a
// "thanks" toast, with nothing ever recorded anywhere. This is what they
// actually call now.
export const recordChecklistFeedback = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    feedback: v.union(v.literal("up"), v.literal("down")),
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await ctx.db.insert("ai_checklist_feedback", {
      userId: user._id,
      question: args.question.slice(0, 2_000),
      answer: args.answer.slice(0, 4_000),
      feedback: args.feedback,
      origin: args.origin,
      destination: args.destination,
      visaType: args.visaType,
      createdAt: new Date().toISOString(),
    });
  },
});

// Admin: browse real feedback on the AI Assistant's answers, so a wave of
// thumbs-down on a given corridor/visa type is actually visible somewhere
// instead of silently accumulating in the database with nobody looking.
export const listFeedback = query({
  args: { filter: v.optional(v.union(v.literal("up"), v.literal("down"))) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.filter) {
      return await ctx.db
        .query("ai_checklist_feedback")
        .withIndex("by_feedback", (q) => q.eq("feedback", args.filter!))
        .order("desc")
        .take(200);
    }
    return await ctx.db.query("ai_checklist_feedback").order("desc").take(200);
  },
});
