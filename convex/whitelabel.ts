import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./admin.ts";

export const submit = mutation({
  args: {
    agencyName: v.string(),
    website: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    volume: v.optional(v.string()),
    plan: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.agencyName.trim() || !args.email.trim() || !args.plan.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Agency name, email, and preferred plan are required." });
    }
    // No sign-in required for this public lead form, so there's no account
    // to gate by — this is a platform-wide backstop against scripted spam.
    await ctx.runMutation(internal.rateLimits.checkAndIncrementWhitelabelUsage, {});
    await ctx.db.insert("whitelabel_applications", {
      agencyName: args.agencyName.trim(),
      website: args.website?.trim(),
      email: args.email.trim(),
      phone: args.phone?.trim(),
      country: args.country?.trim(),
      volume: args.volume?.trim(),
      plan: args.plan,
      message: args.message?.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("whitelabel_applications").order("desc").take(100);
  },
});

export const markRead = mutation({
  args: { id: v.id("whitelabel_applications") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { read: true });
  },
});
