import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { getCurrentUser as getCurrentUserDoc, getCurrentUserOrThrow } from "./authHelpers.ts";
import { bumpPlanCounters } from "./platformStats.ts";

const SIGNUPS_PER_REWARD_MONTH = 3;
const MAX_LIFETIME_REWARD_MONTHS = 12;
const REWARD_MONTH_DAYS = 30;

async function countRealSignups(ctx: QueryCtx | MutationCtx, referralCode: string): Promise<number> {
  const referred = await ctx.db
    .query("users")
    .withIndex("by_referred_by_code", (q) => q.eq("referredByCode", referralCode))
    .take(1000);
  return referred.filter((u) => u.lastPaymentAt !== undefined).length;
}

export const getMyReferralRewardStatus = query({
  args: {},
  handler: async (ctx): Promise<{
    referralCode: string | null;
    signupCount: number;
    monthsEarned: number;
    monthsGranted: number;
    monthsRedeemable: number;
    nextRewardAtSignups: number | null;
    capReached: boolean;
  }> => {
    const user = await getCurrentUserDoc(ctx);
    if (!user || !user.referralCode) {
      return { referralCode: null, signupCount: 0, monthsEarned: 0, monthsGranted: 0, monthsRedeemable: 0, nextRewardAtSignups: SIGNUPS_PER_REWARD_MONTH, capReached: false };
    }
    const signupCount = await countRealSignups(ctx, user.referralCode);
    const monthsEarned = Math.min(Math.floor(signupCount / SIGNUPS_PER_REWARD_MONTH), MAX_LIFETIME_REWARD_MONTHS);
    const monthsGranted = user.referralRewardMonthsGranted ?? 0;
    const monthsRedeemable = Math.max(0, monthsEarned - monthsGranted);
    const capReached = monthsGranted >= MAX_LIFETIME_REWARD_MONTHS;
    const nextRewardAtSignups = capReached
      ? null
      : (Math.floor(signupCount / SIGNUPS_PER_REWARD_MONTH) + 1) * SIGNUPS_PER_REWARD_MONTH;
    return { referralCode: user.referralCode, signupCount, monthsEarned, monthsGranted, monthsRedeemable, nextRewardAtSignups, capReached };
  },
});

// Reward months are real, hard-capped, and auto-expiring — never a
// permanent freebie. This reuses the exact same `one_time_plan_expirations`
// table and pre-existing daily cron (billing.dispatchExpiredPlanDowngrades)
// that already reverts a real one-time Paystack/Pix/boleto payment back to
// "free" once its cycle ends, so a redeemed month lapses automatically with
// zero new cron code. If the user already has a real auto-renewing Stripe
// subscription (stripeSubscriptionId set), we never touch the expiration
// table at all — that would risk a real paying customer's plan being
// "downgraded" by a stale comped-month expiry once their actual
// subscription is what's keeping them on Pro.
export const redeemReferralReward = mutation({
  args: {},
  handler: async (ctx): Promise<{ monthsGranted: number; newExpiresAt: string | null; plan: "pro" }> => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!user.referralCode) {
      throw new ConvexError({ code: "NOT_ELIGIBLE", message: "You don't have a referral code yet." });
    }

    const signupCount = await countRealSignups(ctx, user.referralCode);
    const monthsEarned = Math.min(Math.floor(signupCount / SIGNUPS_PER_REWARD_MONTH), MAX_LIFETIME_REWARD_MONTHS);
    const alreadyGranted = user.referralRewardMonthsGranted ?? 0;
    const redeemable = monthsEarned - alreadyGranted;

    if (redeemable <= 0) {
      const remaining = SIGNUPS_PER_REWARD_MONTH - (signupCount % SIGNUPS_PER_REWARD_MONTH);
      throw new ConvexError({
        code: "NOT_ELIGIBLE",
        message: alreadyGranted >= MAX_LIFETIME_REWARD_MONTHS
          ? "You've reached the maximum lifetime referral reward (12 months)."
          : `Refer ${remaining} more people to unlock your next free month.`,
      });
    }

    await ctx.db.patch(user._id, { referralRewardMonthsGranted: alreadyGranted + redeemable });

    if (user.plan !== "pro" && user.plan !== "expert") {
      await bumpPlanCounters(ctx, user.plan, "pro");
      await ctx.db.patch(user._id, {
        plan: "pro",
        subscriptionStartedAt: user.subscriptionStartedAt ?? new Date().toISOString(),
      });
    }

    let newExpiresAt: string | null = null;
    if (!user.stripeSubscriptionId) {
      const now = new Date();
      const addedMs = redeemable * REWARD_MONTH_DAYS * 24 * 60 * 60 * 1000;
      const existingExpiration = await ctx.db
        .query("one_time_plan_expirations")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (existingExpiration) {
        const base = new Date(existingExpiration.expiresAt).getTime() > now.getTime()
          ? new Date(existingExpiration.expiresAt).getTime()
          : now.getTime();
        newExpiresAt = new Date(base + addedMs).toISOString();
        await ctx.db.patch(existingExpiration._id, { expiresAt: newExpiresAt });
      } else {
        newExpiresAt = new Date(now.getTime() + addedMs).toISOString();
        await ctx.db.insert("one_time_plan_expirations", { userId: user._id, expiresAt: newExpiresAt });
      }
    }

    return { monthsGranted: redeemable, newExpiresAt, plan: "pro" };
  },
});
