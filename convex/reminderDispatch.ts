"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const PAGE_SIZE = 50;

// ─── Daily reminder dispatcher ────────────────────────────────────────────────
// Called by cron once per day. Processes due reminders in bounded pages and
// reschedules itself for the next page, so the total number of due reminders
// (even at very large scale) can never cause a single invocation to time out
// and silently leave the rest of that day's reminders unsent.
export const dispatchDueReminders = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const { page, isDone, continueCursor } = await ctx.runQuery(
      internal.reminderProcessor.getDueRemindersPage,
      { paginationOpts: { cursor: args.cursor ?? null, numItems: PAGE_SIZE } },
    );

    await Promise.allSettled(
      page.map(async (reminder) => {
        try {
          await ctx.runAction(internal.emails.reminder.sendReminderEmail, {
            to: reminder.email,
            title: reminder.title,
            dueDate: reminder.dueDate,
            note: reminder.note,
          });
          await ctx.runMutation(internal.reminderProcessor.markReminderSent, { id: reminder._id });
        } catch (err) {
          // Log error but continue processing other reminders in this page
          console.error(`Failed to send reminder ${reminder._id} to ${reminder.email}`, err);
        }
      }),
    );

    if (!isDone) {
      await ctx.scheduler.runAfter(0, internal.reminderDispatch.dispatchDueReminders, {
        cursor: continueCursor,
      });
    }
  },
});
