import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at 8:00 AM UTC — sends email alerts for all due reminders
crons.daily(
  "send due reminder emails",
  { hourUTC: 8, minuteUTC: 0 },
  internal.reminderDispatch.dispatchDueReminders,
  {},
);

// Run daily at 9:00 AM UTC — downgrades plans paid via a one-time payment
// method (Pix, boleto, OXXO, Paystack) whose cycle lapsed without renewal.
crons.daily(
  "downgrade expired one-time plans",
  { hourUTC: 9, minuteUTC: 0 },
  internal.billing.dispatchExpiredPlanDowngrades,
  {},
);

// Run daily at 7:00 AM UTC — warns paid users when vault documents are
// expiring in exactly 30 or 7 days. Silently skips free users.
crons.daily(
  "document expiry alerts",
  { hourUTC: 7, minuteUTC: 0 },
  internal.notificationDispatch.dispatchDocumentExpiryAlerts,
  {},
);

// Run daily at 7:30 AM UTC — warns paid users when a saved trip's travel
// date is 7, 3, or 1 day away. Silently skips free users and trips with
// no travelDate set.
crons.daily(
  "trip deadline alerts",
  { hourUTC: 7, minuteUTC: 30 },
  internal.notificationDispatch.dispatchTripDeadlineAlerts,
  {},
);

// Run weekly (Monday 8:00 AM UTC) — emails admins when any destination's
// checklist hasn't been re-verified in 90+ days, so staleness gets noticed
// and acted on instead of silently sitting there.
crons.weekly(
  "visa data freshness digest",
  { dayOfWeek: "monday", hourUTC: 8, minuteUTC: 0 },
  internal.dataFreshnessDigest.sendStaleDataDigest,
  {},
);

export default crons;
