import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./admin.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const subscribe = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter a valid email address." });
    }

    const existing = await ctx.db.query("newsletter_subscribers").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (existing) {
      return { alreadySubscribed: true };
    }

    // No sign-in required for this public form, so there's no account to
    // gate by — this is a platform-wide backstop against scripted spam.
    await ctx.runMutation(internal.rateLimits.checkAndIncrementNewsletterUsage, {});
    await ctx.db.insert("newsletter_subscribers", { email, subscribedAt: new Date().toISOString() });
    return { alreadySubscribed: false };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("newsletter_subscribers").order("desc").take(200);
  },
});
