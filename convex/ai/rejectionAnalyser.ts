"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { ConvexError } from "convex/values";
import { api } from "../_generated/api";

type RejectionAnalysisResult = {
  rootCauses: string[];
  missedDocuments: string[];
  recoveryPlan: string[];
  successProbability: number;
  urgentActions: string[];
  summary: string;
};

export const analyseRejection = action({
  args: {
    refusalText: v.string(),
    destination: v.string(),
    visaType: v.string(),
    origin: v.string(),
  },
  handler: async (ctx, args): Promise<RejectionAnalysisResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

    // Server-side plan enforcement — Rejection Analyser requires Expert plan
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    const plan = user.plan ?? "free";
    const isTrialActive = user.trialStartedAt
      ? new Date() < new Date(new Date(user.trialStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      : false;
    const effectivePlan = isTrialActive ? "pro" : plan;
    if (effectivePlan !== "expert") {
      throw new ConvexError({ code: "FORBIDDEN", message: "The Rejection Analyser requires an Expert plan. Upgrade at /pricing." });
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new ConvexError({
        code: "AI_NOT_CONFIGURED",
        message: "The Rejection Analyser isn't available yet — check back soon.",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are VisaClear's expert immigration rejection analyser.
A user has received a ${args.visaType} visa refusal for ${args.destination}, applying from ${args.origin}.

Analyse the refusal letter and provide a detailed recovery plan.

Return ONLY valid JSON in this exact format:
{
  "rootCauses": ["<cause 1>", "<cause 2>"],
  "missedDocuments": ["<doc 1>", "<doc 2>"],
  "recoveryPlan": ["<step 1>", "<step 2>", "<step 3>"],
  "successProbability": <number 0-100>,
  "urgentActions": ["<urgent action 1>"],
  "summary": "<2-3 sentence plain English summary of the rejection and how to fix it>"
}

Be specific and practical. Focus on actionable steps. successProbability should reflect how likely a re-application with fixes will succeed.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Refusal letter content:\n\n${args.refusalText}` },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const result = JSON.parse(raw) as RejectionAnalysisResult;

      // Save to database (saveAnalysis derives the user from the real
      // authenticated identity itself, so there's nothing spoofable here)
      await ctx.runMutation(api.rejections.saveAnalysis, {
        destination: args.destination,
        visaType: args.visaType,
        refusalText: args.refusalText,
        analysis: JSON.stringify(result.rootCauses),
        recoveryPlan: JSON.stringify(result.recoveryPlan),
      });

      return result;
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      if (error instanceof OpenAI.APIError) {
        throw new ConvexError({ code: "AI_ERROR", message: `AI error: ${error.message}` });
      }
      throw new ConvexError({ code: "AI_ERROR", message: "Analysis failed. Please try again." });
    }
  },
});
