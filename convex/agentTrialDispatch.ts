"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Agent trial expiry warnings ──────────────────────────────────────────────
// Runs daily. Trials previously lapsed with zero proactive notice — the only
// visibility was a passive in-app banner on the agent's own dashboard
// (agentTrials.ts getMyTrialStatus), invisible to an agent who doesn't happen
// to log in during their final week. Warns at 7, 3, and 1 day(s) left via
// email + in-app notification, reusing the same daysLeft computation the
// dashboard banner already uses so the two stay consistent.
export const dispatchAgentTrialExpiryWarnings = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const thresholds = [7, 3, 1];

    const activeTrials = await ctx.runQuery(
      internal.agentTrials.internalListActiveTrials,
      {},
    );

    const due = activeTrials.filter((t) => thresholds.includes(t.daysLeft));

    await Promise.allSettled(
      due.map(async (trial) => {
        try {
          const dayWord = trial.daysLeft === 1 ? "day" : "days";
          const title = `Trial ending in ${trial.daysLeft} ${dayWord}`;
          const body = `Your ${trial.plan === "agent_listing" ? "Listing" : trial.plan === "agent_featured" ? "Featured" : "White Label"} trial ends on ${new Date(trial.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Subscribe to keep your placement.`;

          await ctx.runMutation(internal.notifications.createAgentNotification, {
            userId: trial.userId,
            type: "agent_trial_expiring",
            title,
            body,
            linkTo: "/agents/dashboard",
          });

          if (trial.email) {
            await ctx.runAction(internal.emails.agentTrial.sendAgentTrialExpiringEmail, {
              to: trial.email,
              name: trial.name ?? "there",
              plan: trial.plan,
              expiresAt: trial.expiresAt,
              daysRemaining: trial.daysLeft,
            });
          }
        } catch (err) {
          console.error(`Failed to send trial expiry warning for user ${trial.userId}`, err);
        }
      }),
    );
  },
});
