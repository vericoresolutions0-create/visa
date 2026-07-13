import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";

// 15% of a Pro payment, 20% of an Expert payment — the founder's referral
// promise to agents: refer a real client who upgrades, earn a cut of what
// they actually paid. Personal-user-to-personal-user referrals are a
// completely separate system (convex/referralRewards.ts's free-month-of-Pro
// reward) and are never touched by this.
const COMMISSION_RATE_PERCENT: Record<"pro" | "expert", number> = {
  pro: 15,
  expert: 20,
};

// Called from every place a real Pro/Expert payment is recorded
// (convex/users.ts:completeCheckout, convex/billing.ts:applyCheckoutCompleted,
// convex/billing.ts:applyOneTimePlanPayment) — never from the frontend
// directly, and never invented amounts: paymentAmountCents must be the exact
// amount the paying client was actually charged for this transaction.
// Plain async helper (not a Convex mutation) so it runs inside the same
// transaction as the plan upgrade itself, atomically — either both happen or
// neither does.
export async function creditAgentReferralCommission(
  ctx: MutationCtx,
  payingUser: Doc<"users">,
  plan: "pro" | "expert",
  billingCycle: "monthly" | "yearly",
  paymentAmountCents: number,
): Promise<void> {
  if (!payingUser.referredByCode) return;

  const agent = await ctx.db
    .query("users")
    .withIndex("by_referral_code", (q) => q.eq("referralCode", payingUser.referredByCode))
    .unique();
  if (!agent || agent._id === payingUser._id) return;

  // Only agents earn this commission. A personal user who refers another
  // personal user keeps the existing free-month-of-Pro reward untouched —
  // this never fires for them, since they have no agent_profiles row.
  const agentProfile = await ctx.db
    .query("agent_profiles")
    .withIndex("by_user", (q) => q.eq("userId", agent._id))
    .unique();
  if (!agentProfile) return;

  const commissionRatePercent = COMMISSION_RATE_PERCENT[plan];
  const commissionCents = Math.round(paymentAmountCents * (commissionRatePercent / 100));
  if (commissionCents <= 0) return;

  await ctx.db.insert("agent_referral_commissions", {
    agentUserId: agent._id,
    payingUserId: payingUser._id,
    plan,
    billingCycle,
    paymentAmountCents,
    commissionRatePercent,
    commissionCents,
    createdAt: new Date().toISOString(),
  });
}

// ─── Agent-facing dashboard summary ───────────────────────────────────────────
export const getMyReferralCommissionStatus = query({
  args: {},
  handler: async (ctx): Promise<{
    referralCode: string | null;
    totalCommissionCents: number;
    payingClientCount: number;
    referredSignupCount: number;
  }> => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.referralCode) {
      return { referralCode: null, totalCommissionCents: 0, payingClientCount: 0, referredSignupCount: 0 };
    }

    const commissions = await ctx.db
      .query("agent_referral_commissions")
      .withIndex("by_agent", (q) => q.eq("agentUserId", user._id))
      .take(10_000);

    const totalCommissionCents = commissions.reduce((sum, c) => sum + c.commissionCents, 0);
    const payingClientCount = new Set(commissions.map((c) => c.payingUserId)).size;

    const referredSignups = await ctx.db
      .query("users")
      .withIndex("by_referred_by_code", (q) => q.eq("referredByCode", user.referralCode))
      .take(10_000);

    return {
      referralCode: user.referralCode,
      totalCommissionCents,
      payingClientCount,
      referredSignupCount: referredSignups.length,
    };
  },
});

// ─── Payout requests ──────────────────────────────────────────────────────────

export const requestPayout = mutation({
  args: {
    amountCents: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) throw new ConvexError({ code: "NOT_FOUND", message: "No agent profile found." });

    if (args.amountCents < 100)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Minimum payout is $1.00." });
    if (args.amountCents > 10_000_00)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Maximum single request is $10,000." });
    if (args.notes && args.notes.length > 500)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Notes must be under 500 characters." });

    // Block if a pending request already exists
    const existing = await ctx.db
      .query("payout_requests")
      .withIndex("by_agent_status", (q) => q.eq("agentUserId", user._id).eq("status", "pending"))
      .first();
    if (existing) {
      throw new ConvexError({ code: "CONFLICT", message: "You already have a pending payout request. Wait for it to be processed before requesting another." });
    }

    // Compute available balance: total earned minus already-paid amounts
    const [commissions, paidRequests] = await Promise.all([
      ctx.db
        .query("agent_referral_commissions")
        .withIndex("by_agent", (q) => q.eq("agentUserId", user._id))
        .take(10_000),
      ctx.db
        .query("payout_requests")
        .withIndex("by_agent_status", (q) => q.eq("agentUserId", user._id).eq("status", "paid"))
        .take(10_000),
    ]);

    const totalEarned = commissions.reduce((sum, c) => sum + c.commissionCents, 0);
    const totalPaid   = paidRequests.reduce((sum, r) => sum + r.amountCents, 0);
    const available   = totalEarned - totalPaid;

    if (args.amountCents > available) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Amount exceeds your available balance of $${(available / 100).toFixed(2)}.`,
      });
    }

    await ctx.db.insert("payout_requests", {
      agentUserId: user._id,
      amountCents: args.amountCents,
      status: "pending",
      requestedAt: new Date().toISOString(),
      notes: args.notes,
    });
  },
});

export const getMyPayoutRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("payout_requests")
      .withIndex("by_agent", (q) => q.eq("agentUserId", user._id))
      .order("desc")
      .take(20);
  },
});

// ─── Detailed ledger, for transparency on the agent dashboard ────────────────
export const getMyReferralCommissionLedger = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: Id<"agent_referral_commissions">;
    plan: "pro" | "expert";
    billingCycle: "monthly" | "yearly";
    commissionCents: number;
    commissionRatePercent: number;
    createdAt: string;
  }>> => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const commissions = await ctx.db
      .query("agent_referral_commissions")
      .withIndex("by_agent", (q) => q.eq("agentUserId", user._id))
      .order("desc")
      .take(50);
    return commissions.map((c) => ({
      _id: c._id,
      plan: c.plan,
      billingCycle: c.billingCycle,
      commissionCents: c.commissionCents,
      commissionRatePercent: c.commissionRatePercent,
      createdAt: c.createdAt,
    }));
  },
});
