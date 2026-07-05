"use node";

import { action } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import OpenAI from "openai";
import { api } from "../_generated/api.js";
import { languageInstruction } from "./_languageNames.ts";

type SuccessProbabilityResult = {
  probability: number;
  reasoning: string;
  recommendations: string[];
  disclaimer: string;
};

const DISCLAIMER =
  "This is guidance based on publicly available information, not a guarantee. Consult a licensed immigration consultant for your specific situation.";

// Expert-only anchor feature: estimates approval odds from the applicant's
// actual checklist completion and missing documents, not a generic guess.
export const estimateSuccessProbability = action({
  args: {
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
    completionPercent: v.number(),
    missingRequiredItems: v.array(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SuccessProbabilityResult> => {
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Please sign in to use this feature." });
    }
    if (user.plan !== "expert") {
      throw new ConvexError({ code: "FORBIDDEN", message: "The Success Probability Score is an Expert feature. Upgrade at /pricing." });
    }

    // Input caps.
    if (args.destination.length > 100 || args.visaType.length > 100 || args.origin.length > 100) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Input fields contain unexpectedly long values." });
    }
    if (args.completionPercent < 0 || args.completionPercent > 100) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Completion percent must be between 0 and 100." });
    }
    if (args.missingRequiredItems.length > 50) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Too many missing items provided." });
    }
    for (const item of args.missingRequiredItems) {
      if (item.length > 200) {
        throw new ConvexError({ code: "INVALID_INPUT", message: "A missing item description is too long." });
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new ConvexError({
        code: "AI_NOT_CONFIGURED",
        message: "The Success Probability Score isn't available yet — check back soon.",
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are VisaClear's visa approval likelihood estimator.
A real applicant is applying for a ${args.visaType} visa to ${args.destination} from ${args.origin}.
Their checklist is ${args.completionPercent}% complete.
${args.missingRequiredItems.length > 0
  ? `These required documents are still missing: ${args.missingRequiredItems.join(", ")}.`
  : "All required documents on their checklist are marked complete."}

Estimate their approval odds honestly based on completion alone (you cannot see the actual documents, only whether
each checklist item is marked done). Be conservative: missing required documents should sharply lower the estimate.
A 100%-complete checklist still cannot justify above ~90, since document quality cannot be verified.

Return ONLY valid JSON in this exact format:
{
  "probability": <number 0-100>,
  "reasoning": "<2-3 sentence plain-English explanation tied to their specific completion and missing items>",
  "recommendations": ["<specific next step>", "<specific next step>"]
}
Keep the JSON keys exactly as shown above, in English. Only the text VALUES should be translated.${languageInstruction(args.language)}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 512,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: systemPrompt }],
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { probability: number; reasoning: string; recommendations: string[] };
      return { ...parsed, disclaimer: DISCLAIMER };
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      if (error instanceof OpenAI.APIError) {
        throw new ConvexError({ code: "AI_ERROR", message: `AI error: ${error.message}` });
      }
      throw new ConvexError({ code: "AI_ERROR", message: "Could not estimate your success probability. Please try again." });
    }
  },
});
