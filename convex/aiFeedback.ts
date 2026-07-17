import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./authHelpers.ts";

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
