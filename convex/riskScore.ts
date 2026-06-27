import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./authHelpers.ts";
import { computeRiskScore } from "../src/lib/risk-score.ts";

// No sign-in required by design — the whole point is a result people share
// with friends/family with zero friction. Real, deterministic scoring (see
// src/lib/risk-score.ts), not an AI guess, so the same answers always
// produce the same result.
export const submitRiskScore = mutation({
  args: {
    destination: v.string(),
    visaType: v.string(),
    answers: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.rateLimits.checkAndIncrementRiskScoreUsage, {});

    const user = await getCurrentUser(ctx);

    const { rawScore, displayScore } = computeRiskScore(args.answers);

    const resultId = await ctx.db.insert("risk_score_results", {
      userId: user?._id,
      destination: args.destination,
      visaType: args.visaType,
      answers: args.answers,
      rawScore,
      displayScore,
      createdAt: new Date().toISOString(),
    });

    return { resultId };
  },
});

// Deliberately public/no-auth — this is the shareable result page. Anyone
// with the link (the whole mechanic: screenshot it, send it, post it) can
// view a specific result by its id, same pattern as the client-portal
// token-based access already used elsewhere in this app.
export const getRiskScoreResult = query({
  args: { resultId: v.id("risk_score_results") },
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args.resultId);
    if (!result) {
      throw new ConvexError({ code: "NOT_FOUND", message: "This result no longer exists." });
    }
    const { rawScore, displayScore, factors, topWeakFactors } = computeRiskScore(result.answers);
    return {
      destination: result.destination,
      visaType: result.visaType,
      createdAt: result.createdAt,
      rawScore,
      displayScore,
      factors,
      topWeakFactors,
    };
  },
});
