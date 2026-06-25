"use node";

import { action } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import OpenAI from "openai";
import { internal } from "../_generated/api.js";

type PhotoIssue = { pass: boolean; label: string; detail: string };

type PhotoCheckResult = {
  score: number;
  verdict: "Approved" | "Review Required" | "Rejected";
  issues: PhotoIssue[];
  summary: string;
};

export const checkPassportPhoto = action({
  args: {
    imageBase64: v.string(),
    destination: v.string(),
  },
  handler: async (ctx, args): Promise<PhotoCheckResult> => {
    // No sign-in is required for this guest feature, so there's no user to
    // gate by — this is a platform-wide backstop against scripted abuse.
    await ctx.runMutation(internal.rateLimits.checkAndIncrementPhotoCheckUsage, {});

    if (!process.env.OPENAI_API_KEY) {
      throw new ConvexError({
        code: "AI_NOT_CONFIGURED",
        message: "The Photo Checker isn't available yet — check back soon.",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are an expert passport photo compliance checker for ${args.destination} visa and passport requirements.

Analyze the provided photo and check:
1. White/light plain background (required)
2. Face clearly visible and centered (required)
3. Neutral expression, mouth closed (required)
4. Eyes open and clearly visible (required)
5. No glasses (required for most modern passports)
6. No hat, headwear (unless for religious reasons)
7. Adequate lighting, no harsh shadows on face
8. Photo appears recent (not blurry or pixelated)

Respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-100>,
  "verdict": "<Approved|Review Required|Rejected>",
  "issues": [
    { "pass": <true|false>, "label": "<check name>", "detail": "<short explanation>" }
  ],
  "summary": "<one encouraging sentence of overall assessment>"
}

Score 80-100 = Approved. Score 50-79 = Review Required. Score 0-49 = Rejected.
Always return all 8 checks in the issues array.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: args.imageBase64, detail: "high" },
              },
              {
                type: "text",
                text: `Check this passport photo for ${args.destination} visa requirements. Return only valid JSON.`,
              },
            ],
          },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const result = JSON.parse(raw) as PhotoCheckResult;
      return result;
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      if (error instanceof OpenAI.APIError) {
        throw new ConvexError({ code: "AI_ERROR", message: `AI error: ${error.message}` });
      }
      throw new ConvexError({ code: "AI_ERROR", message: "Photo analysis failed. Please try again." });
    }
  },
});
