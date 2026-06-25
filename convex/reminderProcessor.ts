import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalMutation, internalQuery } from "./_generated/server";

// ─── Fetch one page of reminders due today or overdue, not yet sent ──────────
// Paginated rather than collect()-ing every due reminder on the platform: at
// scale a single day could have thousands of reminders due, and an unbounded
// fetch + sequential send risks the daily dispatch silently timing out before
// every user is notified.
export const getDueRemindersPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const result = await ctx.db
      .query("reminders")
      .withIndex("by_due_date", (q) => q.lte("dueDate", today))
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.filter((r) => !r.sent),
    };
  },
});

// ─── Mark reminder as sent ───────────────────────────────────────────────────
export const markReminderSent = internalMutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { sent: true });
  },
});
