"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const PAID_PLANS = ["pro", "expert"];

// ─── Visa/permit renewal warnings ─────────────────────────────────────────────
// Runs daily. Real legal stakes — missing a renewal window can mean losing
// status entirely — so this starts warning at 90 days out, well before the
// 30/7-day pattern used for lower-stakes vault document expiry. Distinct
// from (and complementary to) the existing on-demand EU renewal checklist
// (euRenewalChecklist.ts): that's a pull tool a user has to remember to
// open; this is the proactive push that gets them there before it's urgent.
export const dispatchVisaRenewalWarnings = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thresholds = [90, 60, 30, 14];

    for (const days of thresholds) {
      const target = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      const targetDateStr = target.toISOString().split("T")[0];

      const statuses = await ctx.runQuery(
        internal.notificationProcessor.getVisaStatusesExpiringOn,
        { expiryDate: targetDateStr },
      );

      await Promise.allSettled(
        statuses.map(async (status) => {
          try {
            const user = await ctx.runQuery(
              internal.notificationProcessor.getUserById,
              { userId: status.userId },
            );
            if (!user || !PAID_PLANS.includes(user.plan ?? "")) return;

            const title = `${status.visaType} status expires in ${days} days`;
            const body = `Your ${status.visaType} status in ${status.hostCountry} expires on ${targetDateStr}. Start your renewal now to avoid losing status.`;

            await ctx.runMutation(internal.notifications.createNotification, {
              userId: status.userId,
              type: "visa_status_expiring",
              title,
              body,
              linkTo: "/dashboard/immigration-status",
            });

            await ctx.runAction(internal.emails.visaRenewal.sendVisaRenewalWarningEmail, {
              to: user.email ?? "",
              name: user.name ?? "there",
              visaType: status.visaType,
              hostCountry: status.hostCountry,
              expiryDate: targetDateStr,
              daysRemaining: days,
            });
          } catch (err) {
            console.error(`Failed to send visa renewal warning for status ${status._id}`, err);
          }
        }),
      );
    }
  },
});
