import { query, internalQuery } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import { readStats } from "./platformStats.ts";
import { EMBASSY_MONITOR_URLS } from "../src/lib/embassy-monitor-urls.ts";

// Cheapest possible real read — proves the database is actually reachable
// and serving queries, not just that the HTTP router responded. Called only
// from the public /health httpAction in convex/http.ts (internal, no auth
// needed: nothing sensitive is read or returned).
export const pingDb = internalQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.db.query("users").take(1);
    return true;
  },
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Cron runs weekly — flag as stale past 9 days to give one day's slack for
// a delayed run before crying wolf.
const EMBASSY_MONITOR_STALE_MS = 9 * 24 * 60 * 60 * 1000;

export const getSystemHealth = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [
      platformStats, pendingFlags, pendingApprovals, pendingCreatorCommissions, pendingPayoutRequests,
      users, agentProfiles, embassySnapshots, recentSecurityEvents, recentAiFeedback, authAttemptCounters,
    ] =
      await Promise.all([
        readStats(ctx),
        ctx.db.query("checklist_flags").withIndex("by_status", (q) => q.eq("status", "pending")).take(500),
        ctx.db.query("approval_stories").withIndex("by_status", (q) => q.eq("status", "pending")).take(500),
        ctx.db.query("creator_commissions").withIndex("by_status", (q) => q.eq("status", "pending")).take(2000),
        ctx.db.query("payout_requests").withIndex("by_status", (q) => q.eq("status", "pending")).take(200),
        ctx.db.query("users").take(5000),
        ctx.db.query("agent_profiles").take(2000),
        ctx.db.query("embassy_page_snapshots").take(400),
        ctx.db.query("security_audit_logs").withIndex("by_created").order("desc").take(1000),
        ctx.db.query("ai_checklist_feedback").order("desc").take(500),
        ctx.db.query("auth_attempt_counters").take(2000),
      ]);

    const now = Date.now();

    // Embassy Monitor: is the weekly cron actually still running for real?
    const lastEmbassyCheck = embassySnapshots.reduce<string | null>(
      (latest, row) => (!latest || row.lastCheckedAt > latest ? row.lastCheckedAt : latest),
      null,
    );
    const embassyMonitorStale =
      embassySnapshots.length === 0 ||
      lastEmbassyCheck === null ||
      now - new Date(lastEmbassyCheck).getTime() > EMBASSY_MONITOR_STALE_MS;

    // Real, live trust & safety state — not derived anywhere else today.
    const suspendedUsersCount = users.filter((u) => u.isSuspended).length;
    const leadAccessRevokedCount = agentProfiles.filter((p) => p.leadAccessRevoked).length;

    // Recent (7-day) critical security events — a quick "is something bad
    // happening right now" signal that links through to the full Security Log.
    const recentCriticalSecurityEvents = recentSecurityEvents.filter(
      (e) => e.severity === "critical" && now - new Date(e.createdAt).getTime() < WEEK_MS,
    ).length;

    // AI Assistant quality — real thumbs down rate over the last 7 days,
    // from the feedback the checklist page actually records.
    const recentFeedback = recentAiFeedback.filter((f) => now - new Date(f.createdAt).getTime() < WEEK_MS);
    const recentFeedbackDown = recentFeedback.filter((f) => f.feedback === "down").length;

    // Active brute-force lockouts right now — rows whose count is at/above
    // the limit for their flow, within the current 5-minute window used by
    // convex/authRateLimit.ts. A live count, not a guess.
    const AUTH_LIMITS: Record<string, number> = { signIn: 8, signUp: 5, reset: 5, "reset-verification": 8, "email-verification": 8 };
    const currentWindowBucket = Math.floor(now / (5 * 60 * 1000));
    const activeLockouts = authAttemptCounters.filter((row) => {
      const flow = row.emailFlow.split("|")[1] ?? "";
      const limit = AUTH_LIMITS[flow] ?? 8;
      return row.windowBucket === currentWindowBucket && row.count >= limit;
    }).length;

    const envVars: Record<string, boolean> = {
      AUTH_GOOGLE_ID: !!process.env.AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET: !!process.env.AUTH_GOOGLE_SECRET,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: !!process.env.RESEND_FROM_EMAIL,
      SITE_URL: !!process.env.SITE_URL,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_PUBLISHABLE_KEY: !!process.env.STRIPE_PUBLISHABLE_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      PAYSTACK_SECRET_KEY: !!process.env.PAYSTACK_SECRET_KEY,
    };

    // Score: start at 100, deduct for unset env vars (PAYSTACK is
    // known-pending at -5, everything else unset is -10) plus real
    // operational signals below. Suspended-user/lead-revoked counts are
    // deliberately NOT scored — those mean the safety system is working,
    // not that something's broken. Active login lockouts aren't scored
    // either — bots probing a public login form is normal internet
    // background noise that the rate limiter is already handling correctly.
    const OPTIONAL_KEYS = new Set(["PAYSTACK_SECRET_KEY"]);
    let score = 100;
    for (const [key, isSet] of Object.entries(envVars)) {
      if (!isSet) score -= OPTIONAL_KEYS.has(key) ? 5 : 10;
    }
    if (embassyMonitorStale) score -= 10;
    score -= Math.min(20, recentCriticalSecurityEvents * 5);
    score = Math.max(0, score);

    return {
      score,
      envVars,
      platformStats,
      pendingFlagsCount: pendingFlags.length,
      pendingApprovalsCount: pendingApprovals.length,
      pendingCreatorPayoutCents: pendingCreatorCommissions.reduce((s, c) => s + c.commissionCents, 0),
      pendingPayoutRequestsCount: pendingPayoutRequests.length,
      embassyMonitor: {
        stale: embassyMonitorStale,
        lastCheckedAt: lastEmbassyCheck,
        monitoredCount: embassySnapshots.length,
        targetCount: Object.keys(EMBASSY_MONITOR_URLS).length,
      },
      trustAndSafety: {
        suspendedUsersCount,
        leadAccessRevokedCount,
        recentCriticalSecurityEvents,
        activeLockouts,
      },
      aiQuality: {
        recentFeedbackTotal: recentFeedback.length,
        recentFeedbackDown,
      },
      checkedAt: new Date().toISOString(),
    };
  },
});
