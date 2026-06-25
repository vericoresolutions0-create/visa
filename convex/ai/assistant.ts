"use node";

import { action } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import OpenAI from "openai";
import { api } from "../_generated/api.js";

export const askVisaQuestion = action({
  args: {
    question: v.string(),
    context: v.object({
      origin: v.string(),
      destination: v.string(),
      visaType: v.string(),
    }),
  },
  handler: async (ctx, args): Promise<string> => {
    // Enforces real sign-in + the Pro/Expert monthly quota before spending
    // any money on an OpenAI call. Throws (and aborts) if the caller is on
    // the free plan or has used up their monthly questions.
    await ctx.runMutation(api.aiUsage.checkAndIncrementUsage, {});

    if (!process.env.OPENAI_API_KEY) {
      throw new ConvexError({
        code: "AI_NOT_CONFIGURED",
        message: "The AI Assistant isn't available yet — check back soon.",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are VisaClear AI, a knowledgeable and practical immigration guide by Vericore.
You help applicants understand visa requirements for their specific journey.

The user is applying for a ${args.context.visaType} visa to ${args.context.destination} from ${args.context.origin}.

Formatting rules (very important):
- Write in clear, plain English. Short sentences. No jargon.
- Break your answer into 2 to 4 short paragraphs separated by blank lines.
- Never use the em dash character (—). Use a comma or a new sentence instead.
- Never use bullet points with dashes (- item). If you need a list, write each item as its own sentence or short paragraph.
- No AI-style phrases like "Certainly!", "Great question!", or "In conclusion".
- Start your answer directly with the relevant information.
- End with one plain, encouraging sentence.
- This is a premium product. Write the way a trusted senior consultant would speak to a client.
- Do NOT provide legal advice. You are an information guide only.
- Always remind users to verify with the official embassy or consulate before submitting.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.question },
        ],
      });

      return response.choices[0]?.message?.content ?? "I'm unable to answer that right now. Please try again.";
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      if (error instanceof OpenAI.APIError) {
        throw new ConvexError({ code: "AI_ERROR", message: `AI error: ${error.message}` });
      }
      throw new ConvexError({ code: "AI_ERROR", message: "Failed to get AI response. Please try again." });
    }
  },
});
