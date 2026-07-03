import { ConvexError } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./authHelpers.ts";

// Generous ceiling — sized to absorb real legitimate traffic while still
// stopping an unattended script from running unbounded OpenAI spend on an
// endpoint that has no user account to gate by.
const PHOTO_CHECK_GLOBAL_DAILY_LIMIT = 1000;

export const checkAndIncrementPhotoCheckUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const dateKey = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("photo_check_daily_usage")
      .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
      .unique();

    if (existing && existing.count >= PHOTO_CHECK_GLOBAL_DAILY_LIMIT) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "The Photo Checker is at capacity right now. Please try again later.",
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("photo_check_daily_usage", { dateKey, count: 1 });
    }
  },
});

// Same backstop, sized for a small business's real contact volume — high
// enough that no genuine visitor ever hits it, low enough to stop a script
// from spamming the inbox.
const CONTACT_FORM_GLOBAL_DAILY_LIMIT = 100;

export const checkAndIncrementContactUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const dateKey = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("contact_daily_usage")
      .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
      .unique();

    if (existing && existing.count >= CONTACT_FORM_GLOBAL_DAILY_LIMIT) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "We've hit our message limit for today. Please try again tomorrow or email us directly.",
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("contact_daily_usage", { dateKey, count: 1 });
    }
  },
});

// Same backstop pattern, for the public (no-sign-in) Risk Score quiz. No
// AI cost behind this one (pure rubric), but it still writes a real row per
// submission, so a script hammering it could still bloat the table.
const RISK_SCORE_GLOBAL_DAILY_LIMIT = 5000;

export const checkAndIncrementRiskScoreUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const dateKey = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("risk_score_daily_usage")
      .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
      .unique();

    if (existing && existing.count >= RISK_SCORE_GLOBAL_DAILY_LIMIT) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "The Risk Score tool is at capacity right now. Please try again later.",
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("risk_score_daily_usage", { dateKey, count: 1 });
    }
  },
});

// Same backstop, for the public white-label "Apply for a Licence" form.
const WHITELABEL_GLOBAL_DAILY_LIMIT = 100;

export const checkAndIncrementWhitelabelUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const dateKey = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("whitelabel_daily_usage")
      .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
      .unique();

    if (existing && existing.count >= WHITELABEL_GLOBAL_DAILY_LIMIT) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "We've hit our application limit for today. Please try again tomorrow or email us directly.",
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("whitelabel_daily_usage", { dateKey, count: 1 });
    }
  },
});

// Per-user monthly cap for the Rejection Analyser (gpt-4o, Expert-only).
// 20 analyses/month is far above any legitimate use; this is purely a cost
// backstop in case an Expert account is compromised or scripts are run.
const REJECTION_ANALYSER_MONTHLY_LIMIT = 20;

export const checkAndIncrementRejectionAnalyserUsage = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const yearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const existing = await ctx.db
      .query("rejection_analyser_usage")
      .withIndex("by_user_month", (q) =>
        q.eq("userId", user._id).eq("yearMonth", yearMonth)
      )
      .unique();

    if (existing && existing.count >= REJECTION_ANALYSER_MONTHLY_LIMIT) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: `You've reached the ${REJECTION_ANALYSER_MONTHLY_LIMIT} analyses/month limit. Your allowance resets on the 1st of next month.`,
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("rejection_analyser_usage", { userId: user._id, yearMonth, count: 1 });
    }
  },
});

// Same backstop, for the public blog newsletter subscribe form.
const NEWSLETTER_GLOBAL_DAILY_LIMIT = 500;

export const checkAndIncrementNewsletterUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const dateKey = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("newsletter_daily_usage")
      .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
      .unique();

    if (existing && existing.count >= NEWSLETTER_GLOBAL_DAILY_LIMIT) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "We've hit our subscription limit for today. Please try again tomorrow.",
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("newsletter_daily_usage", { dateKey, count: 1 });
    }
  },
});
