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

export default crons;
