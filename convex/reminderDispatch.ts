"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const PAGE_SIZE = 50;
const PAID_PLANS = ["pro", "expert"];

// ─── Daily reminder dispatcher ────────────────────────────────────────────────
// Called by cron once per day. Processes due reminders in bounded pages and
// reschedules itself for the next page, so the total number of due reminders
// (even at very large scale) can never cause a single invocation to time out
// and silently leave the rest of that day's reminders unsent.
//
// Free-user gate: if the reminder owner is on a free plan (or no plan), the
// email is skipped. The reminder row is still marked sent so the cron doesn't
// retry it every day — the data stays clean, the email just never fires.
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
          // Look up the reminder owner and enforce paid-only gate
          const owner = await ctx.runQuery(
            internal.notificationProcessor.getUserById,
            { userId: reminder.userId },
          );

          if (!owner || !PAID_PLANS.includes(owner.plan ?? "")) {
            // Mark sent so the cron doesn't retry this reminder every day
            await ctx.runMutation(internal.reminderProcessor.markReminderSent, {
              id: reminder._id,
            });
            return;
          }

          // Send email to paid user
          await ctx.runAction(internal.emails.reminder.sendReminderEmail, {
            to: reminder.email,
            title: reminder.title,
            dueDate: reminder.dueDate,
            note: reminder.note,
          });

          // Create in-app notification so the bell badge lights up
          await ctx.runMutation(internal.notifications.createNotification, {
            userId: reminder.userId,
            type: "reminder_due",
            title: `Reminder due: ${reminder.title}`,
            body:
              reminder.note ??
              `Your reminder "${reminder.title}" is due today.`,
            linkTo: "/dashboard/reminders",
          });

          await ctx.runMutation(internal.reminderProcessor.markReminderSent, {
            id: reminder._id,
          });
        } catch (err) {
          console.error(
            `Failed to send reminder ${reminder._id} to ${reminder.email}`,
            err,
          );
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
