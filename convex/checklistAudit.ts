import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./authHelpers.ts";
import { computeRiskScore, type RiskScoreAnswers } from "../src/lib/risk-score.ts";

export const submitAudit = mutation({
  args: {
    destination: v.string(),
    visaType: v.string(),
    answers: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const { factors } = computeRiskScore(args.answers as RiskScoreAnswers);
    const flaggedCount = factors.filter((f) => f.earnedPoints / f.maxPoints < 0.5).length;

    await ctx.db.insert("checklist_audits", {
      userId: user._id,
      destination: args.destination,
      visaType: args.visaType,
      answers: args.answers,
      flaggedCount,
      createdAt: new Date().toISOString(),
    });

    return { flaggedCount };
  },
});

export const getMyLatestAudit = query({
  args: { destination: v.string(), visaType: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const audits = await ctx.db
      .query("checklist_audits")
      .withIndex("by_user_route", (q) => q.eq("userId", user._id).eq("destination", args.destination).eq("visaType", args.visaType))
      .order("desc")
      .take(1);
    return audits[0] ?? null;
  },
});
