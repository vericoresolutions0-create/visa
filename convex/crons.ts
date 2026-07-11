import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 8:00 AM UTC daily — sends email alerts for all due reminders
crons.cron(
  "send due reminder emails",
  "0 8 * * *",
  internal.reminderDispatch.dispatchDueReminders,
  {},
);

// 9:00 AM UTC daily — downgrades plans paid via a one-time payment method
// (Pix, boleto, OXXO, Paystack) whose cycle lapsed without renewal.
crons.cron(
  "downgrade expired one-time plans",
  "0 9 * * *",
  internal.billing.dispatchExpiredPlanDowngrades,
  {},
);

// 7:00 AM UTC daily — warns paid users when vault documents are expiring
// in 30 or 7 days. Silently skips free users.
crons.cron(
  "document expiry alerts",
  "0 7 * * *",
  internal.notificationDispatch.dispatchDocumentExpiryAlerts,
  {},
);

// 7:30 AM UTC daily — warns paid users when a saved trip's travel date is
// 7, 3, or 1 day away. Silently skips free users and trips with no date.
crons.cron(
  "trip deadline alerts",
  "30 7 * * *",
  internal.notificationDispatch.dispatchTripDeadlineAlerts,
  {},
);

// Monday 8:00 AM UTC weekly — emails admins when any destination's checklist
// hasn't been re-verified in 90+ days.
crons.cron(
  "visa data freshness digest",
  "0 8 * * 1",
  internal.dataFreshnessDigest.sendStaleDataDigest,
  {},
);

// 10:00 AM UTC daily — alerts verified agents about leads that have been open
// 48+ hours with zero unlocks, giving them a second-chance nudge.
crons.cron(
  "lead sentinel alerts",
  "0 10 * * *",
  internal.leadSentinel.checkStaleLeads,
  {},
);

// 6:00 AM UTC daily — finds agent trials whose expiry timestamp has passed,
// clears the trial fields on users, and resets agent_profiles.tier back to
// the real paid plan so the marketplace reflects the correct tier.
crons.cron(
  "cleanup expired agent trials",
  "0 6 * * *",
  internal.agentTrials.cleanupExpiredTrials,
  {},
);

export default crons;
