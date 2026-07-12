import { query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";
import { readStats } from "./platformStats.ts";

export const getSystemHealth = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [platformStats, pendingFlags, pendingApprovals, pendingCreatorCommissions, pendingPayoutRequests] =
      await Promise.all([
        readStats(ctx),
        ctx.db.query("checklist_flags").withIndex("by_status", (q) => q.eq("status", "pending")).take(500),
        ctx.db.query("approval_stories").withIndex("by_status", (q) => q.eq("status", "pending")).take(500),
        ctx.db.query("creator_commissions").withIndex("by_status", (q) => q.eq("status", "pending")).take(2000),
        ctx.db.query("payout_requests").withIndex("by_status", (q) => q.eq("status", "pending")).take(200),
      ]);

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

    // Score: start at 100, deduct for unset env vars.
    // PAYSTACK is known-pending (-5), everything else unset is -10.
    const OPTIONAL_KEYS = new Set(["PAYSTACK_SECRET_KEY"]);
    let score = 100;
    for (const [key, isSet] of Object.entries(envVars)) {
      if (!isSet) score -= OPTIONAL_KEYS.has(key) ? 5 : 10;
    }
    score = Math.max(0, score);

    return {
      score,
      envVars,
      platformStats,
      pendingFlagsCount: pendingFlags.length,
      pendingApprovalsCount: pendingApprovals.length,
      pendingCreatorPayoutCents: pendingCreatorCommissions.reduce((s, c) => s + c.commissionCents, 0),
      pendingPayoutRequestsCount: pendingPayoutRequests.length,
      checkedAt: new Date().toISOString(),
    };
  },
});
