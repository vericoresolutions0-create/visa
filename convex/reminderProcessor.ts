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
    // by_sent_due_date filters to unsent=false rows at the DB level so the
    // cron never has to page through the entire historical backlog of already-
    // sent reminders, which would grow without bound and eventually time out.
    return await ctx.db
      .query("reminders")
      .withIndex("by_sent_due_date", (q) => q.eq("sent", false).lte("dueDate", today))
      .paginate(args.paginationOpts);
  },
});

// ─── Mark reminder as sent ───────────────────────────────────────────────────
export const markReminderSent = internalMutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { sent: true });
  },
});
