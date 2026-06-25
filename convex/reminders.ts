import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Create reminder ─────────────────────────────────────────────────────────
export const createReminder = mutation({
  args: {
    title: v.string(),
    note: v.optional(v.string()),
    dueDate: v.string(),
    email: v.string(),
    checklistId: v.optional(v.id("saved_checklists")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    return await ctx.db.insert("reminders", {
      userId: user._id,
      title: args.title,
      note: args.note,
      dueDate: args.dueDate,
      email: args.email,
      sent: false,
      checklistId: args.checklistId,
      createdAt: new Date().toISOString(),
    });
  },
});

// ─── Get reminders for user ───────────────────────────────────────────────────
export const getReminders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];
    return await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("asc")
      .collect();
  },
});

// ─── Delete reminder ──────────────────────────────────────────────────────────
export const deleteReminder = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Reminder not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this reminder" });
    }
    await ctx.db.delete(args.id);
  },
});
