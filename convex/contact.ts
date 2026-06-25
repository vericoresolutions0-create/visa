import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in." });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user || user.role !== "admin") throw new ConvexError({ code: "FORBIDDEN", message: "Admins only." });
    return await ctx.db.query("contact_messages").order("desc").take(100);
  },
});

export const markRead = mutation({
  args: { id: v.id("contact_messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in." });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user || user.role !== "admin") throw new ConvexError({ code: "FORBIDDEN", message: "Admins only." });
    await ctx.db.patch(args.id, { read: true });
  },
});
