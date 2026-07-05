import { ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";

// Pro: 10 AI Visa Assistant questions/month. Expert: unlimited. Free: none.
const MONTHLY_LIMIT: Record<string, number | null> = { free: 0, pro: 10, expert: null };

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

// ─── Real usage for the assistant UI to display (no more fake local counts) ─
export const getMyUsage = query({
  args: {},
  handler: async (ctx): Promise<{ plan: string; limit: number | null; used: number } | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const plan = user.plan ?? "free";
    const limit = MONTHLY_LIMIT[plan] ?? 0;
    const existing = await ctx.db
      .query("ai_assistant_usage")
      .withIndex("by_user_month", (q) => q.eq("userId", user._id).eq("yearMonth", currentYearMonth()))
      .unique();
    return { plan, limit, used: existing?.count ?? 0 };
  },
});

// ─── Check the caller's plan + monthly quota, then record one use ───────────
// Called from the AI Visa Assistant action before it spends any real money on
// an OpenAI call, so the limit is actually enforced rather than advisory.
export const checkAndIncrementUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const plan = user.plan ?? "free";
    const limit = MONTHLY_LIMIT[plan] ?? 0;
    if (limit === 0) {
      throw new ConvexError({ code: "FORBIDDEN", message: "The AI Visa Assistant is a Pro feature. Upgrade at /pricing." });
    }

    const yearMonth = currentYearMonth();
    const existing = await ctx.db
      .query("ai_assistant_usage")
      .withIndex("by_user_month", (q) => q.eq("userId", user._id).eq("yearMonth", yearMonth))
      .unique();

    if (limit !== null && (existing?.count ?? 0) >= limit) {
      throw new ConvexError({
        code: "MONTHLY_LIMIT_REACHED",
        message: `You've used all ${limit} AI Visa Assistant questions this month. Upgrade to Expert for unlimited questions.`,
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("ai_assistant_usage", { userId: user._id, yearMonth, count: 1 });
    }
  },
});
