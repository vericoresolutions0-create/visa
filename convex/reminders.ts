import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";
import { checkUserDailyLimit } from "./rateLimits.ts";

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
    const user = await getCurrentUserOrThrow(ctx);
    await checkUserDailyLimit(ctx, user._id, "createReminder", 20, "You can create up to 20 reminders per day.");

    return await ctx.db.insert("reminders", {
      userId: user._id,
      title: args.title,
      note: args.note,
      dueDate: args.dueDate,
      email: user.email ?? args.email,
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
    const user = await getCurrentUser(ctx);
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
    const user = await getCurrentUserOrThrow(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Reminder not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this reminder" });
    }
    await ctx.db.delete(args.id);
  },
});
