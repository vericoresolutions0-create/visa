import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Generous enough that a real person mistyping a password a few times, or
// retrying a flaky network request, never gets blocked — tight enough that
// a script trying hundreds of guesses gets stopped within seconds. Sign-up
// and reset get a lower ceiling since there's rarely a legitimate reason
// for many rapid attempts on those.
const LIMITS: Record<string, number> = {
  signIn: 8,
  signUp: 5,
  reset: 5,
  "reset-verification": 8,
  "email-verification": 8,
};
const DEFAULT_LIMIT = 8;

// Stops brute-force password guessing and signup/reset spam, per email.
// Convex Auth's Password provider has no built-in throttle, and its only
// other extension point (the `profile()` config callback) is called by the
// library without being awaited — a database-backed check placed there
// would silently corrupt every auth attempt rather than safely reject one.
// This is called instead from the `signIn` wrapper in convex/auth.ts, which
// the framework does properly await.
export const checkAndRecordAuthAttempt = internalMutation({
  args: { email: v.string(), flow: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    if (!normalizedEmail) return;

    const windowBucket = Math.floor(Date.now() / WINDOW_MS);
    const emailFlow = `${normalizedEmail}|${args.flow}`;
    const limit = LIMITS[args.flow] ?? DEFAULT_LIMIT;

    const existing = await ctx.db
      .query("auth_attempt_counters")
      .withIndex("by_email_flow_window", (q) =>
        q.eq("emailFlow", emailFlow).eq("windowBucket", windowBucket),
      )
      .unique();

    if (existing && existing.count >= limit) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "Too many attempts. Please wait a few minutes and try again.",
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("auth_attempt_counters", { emailFlow, windowBucket, count: 1 });
    }
  },
});
