import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./admin.ts";

export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.name.trim() || !args.email.trim() || !args.message.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Name, email, and message are required." });
    }
    if (args.name.length > 200) throw new ConvexError({ code: "BAD_REQUEST", message: "Name must be under 200 characters." });
    if (args.email.length > 254) throw new ConvexError({ code: "BAD_REQUEST", message: "Email address is too long." });
    if ((args.subject ?? "").length > 200) throw new ConvexError({ code: "BAD_REQUEST", message: "Subject must be under 200 characters." });
    if (args.message.length > 5000) throw new ConvexError({ code: "BAD_REQUEST", message: "Message must be under 5,000 characters." });
    // No sign-in required for this guest form, so there's no account to
    // gate by — this is a platform-wide backstop against scripted spam.
    await ctx.runMutation(internal.rateLimits.checkAndIncrementContactUsage, {});
    await ctx.db.insert("contact_messages", {
      name: args.name.trim(),
      email: args.email.trim(),
      subject: args.subject?.trim(),
      message: args.message.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("contact_messages").order("desc").take(100);
  },
});

export const markRead = mutation({
  args: { id: v.id("contact_messages") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { read: true });
  },
});
