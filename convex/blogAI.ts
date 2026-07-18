"use node";

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api.js";
import { getOpenAIClient } from "./openaiClient.ts";

const LANG_NAMES: Record<string, string> = {
  fr: "French",
  es: "Spanish",
  pt: "Portuguese (Brazilian)",
  ar: "Arabic",
  hi: "Hindi",
};

type LangKey = "fr" | "es" | "pt" | "ar" | "hi";
const LANGS: LangKey[] = ["fr", "es", "pt", "ar", "hi"];

export const translateArticle = action({
  args: { articleId: v.id("blog_articles") },
  handler: async (ctx, { articleId }) => {
    // Actions can't call requireAdmin directly — route through internal query.
    await ctx.runQuery(internal.admin.verifyAdminForAction, {});

    if (!process.env.OPENAI_API_KEY) {
      throw new ConvexError({ code: "AI_NOT_CONFIGURED", message: "OpenAI API key is not set." });
    }

    const article = await ctx.runQuery(internal.blog.getArticleForTranslation, { articleId });
    if (!article) throw new ConvexError({ code: "NOT_FOUND", message: "Article not found." });

    const openai = getOpenAIClient(process.env.OPENAI_API_KEY);

    const results = await Promise.all(
      LANGS.map(async (lang) => {
        const langName = LANG_NAMES[lang];
        // Each language is caught independently — all 5 run in one
        // Promise.all, and Promise.all rejects (losing every result,
        // including the 4 that already succeeded) the instant any single
        // promise rejects. Without this, one throttled/timed-out language
        // used to take down the other 4 with it. On a genuine failure for
        // just this language, fall back to the original English content —
        // the same graceful-degradation the JSON-parse-failure path below
        // already used, just extended to cover the API call itself too.
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 4096,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are a professional immigration document translator. Translate the given visa guide article from English to ${langName}.
Return a JSON object with exactly these four keys: "title", "excerpt", "body", "category".
Rules:
- Preserve all markdown formatting in the body (## headings, **bold**, - bullet lists, 1. ordered lists, --- horizontal rules).
- Keep proper nouns: country names, "VisaClear", document names, currency amounts, and any official form codes (e.g. IMM 5257).
- Translate naturally — write as a fluent native ${langName} speaker, not word-for-word.
- Keep the same professional, direct, advisory tone. No AI phrases like "Certainly!" or "In conclusion".
- "category" must be the natural ${langName} translation of the English category label.`,
              },
              {
                role: "user",
                content: JSON.stringify({
                  title: article.title,
                  excerpt: article.excerpt,
                  body: article.body,
                  category: article.category,
                }),
              },
            ],
          });

          const raw = response.choices[0]?.message?.content ?? "{}";
          let parsed: { title?: string; excerpt?: string; body?: string; category?: string } = {};
          try {
            parsed = JSON.parse(raw) as typeof parsed;
          } catch {
            // fall through — partial defaults below
          }

          return {
            lang,
            translation: {
              title: (typeof parsed.title === "string" && parsed.title.trim()) ? parsed.title.trim() : article.title,
              excerpt: (typeof parsed.excerpt === "string" && parsed.excerpt.trim()) ? parsed.excerpt.trim() : article.excerpt,
              body: (typeof parsed.body === "string" && parsed.body.trim()) ? parsed.body.trim() : article.body,
              category: typeof parsed.category === "string" ? parsed.category.trim() : undefined,
            },
          };
        } catch (err) {
          console.error(`translateArticle: ${langName} (${lang}) failed for article ${articleId} — falling back to English for this language.`, err);
          return {
            lang,
            translation: {
              title: article.title,
              excerpt: article.excerpt,
              body: article.body,
              category: undefined,
            },
          };
        }
      }),
    );

    const translations = Object.fromEntries(
      results.map(({ lang, translation }) => [lang, translation]),
    ) as Record<LangKey, { title: string; excerpt: string; body: string; category?: string }>;

    await ctx.runMutation(internal.blog.saveArticleTranslations, { articleId, translations });
    return { ok: true };
  },
});
