import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 3:00 AM UTC daily — deletes expired /files/download link tokens (5-minute
// TTL each) so the table doesn't grow forever. Expired tokens are already
// rejected on read; this is just housekeeping.
crons.cron(
  "cleanup expired file download tokens",
  "0 3 * * *",
  internal.fileTokens.cleanupExpiredTokens,
  {},
);

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

// 8:30 AM UTC daily — warns agents on an active trial when it's ending in 7,
// 3, or 1 day(s), via email + in-app notification. Previously the only
// warning was a passive dashboard banner, invisible to an agent who doesn't
// log in during their final week.
crons.cron(
  "agent trial expiry warnings",
  "30 8 * * *",
  internal.agentTrialDispatch.dispatchAgentTrialExpiryWarnings,
  {},
);

// Every 4 hours — finds agent trials whose expiry timestamp has passed,
// clears the trial fields on users, and resets agent_profiles.tier back to
// the real paid plan so the marketplace reflects the correct tier. Was
// previously once daily, which left up to ~24h where an agent's own
// dashboard correctly showed "no active trial" (getMyTrialStatus checks the
// expiry timestamp directly, live) while their public marketplace listing
// still showed the expired trial's tier — this shrinks that window to ~4h.
crons.interval(
  "cleanup expired agent trials",
  { hours: 4 },
  internal.agentTrials.cleanupExpiredTrials,
  {},
);

// Wednesday 9:00 AM UTC weekly — fetches each monitored embassy page, hashes
// its text content, and flags it for admin review when the content changed.
// Government visa pages don't update daily so weekly is the right cadence;
// intermittent fetch errors are silently skipped to avoid false alerts.
crons.cron(
  "check embassy pages",
  "0 9 * * 3",
  internal.embassyMonitor.checkEmbassyPages,
  {},
);

export default crons;
