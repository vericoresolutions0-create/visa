import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { bumpPlanCounters } from "./platformStats.ts";
import { creditAgentReferralCommission } from "./agentReferralCommissions.ts";

function currentBillingMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthsFromSignup(subscriptionStartedAt: string): number {
  const elapsed = Date.now() - new Date(subscriptionStartedAt).getTime();
  return Math.max(1, Math.round(elapsed / (30 * 24 * 60 * 60 * 1000)));
}

// Lets the frontend know whether to redirect to real Stripe Checkout or
// fall back to the existing simulated flow — same "not configured yet"
// pattern used for Google sign-in and the AI features.
export const isStripeConfigured = query({
  args: {},
  handler: async () => Boolean(process.env.STRIPE_SECRET_KEY),
});

const APPLICANT_PLAN = v.union(v.literal("pro"), v.literal("expert"));
const AGENT_PLAN = v.union(
  v.literal("agent_listing"),
  v.literal("agent_featured"),
  v.literal("agency_white_label"),
);
const BILLING_CYCLE = v.union(v.literal("monthly"), v.literal("yearly"));

// Saves the Stripe customer ID immediately after customer creation in the
// checkout action, before the session exists. Prevents duplicate customers
// on retry and ensures the billing portal link is always available.
export const persistStripeCustomerId = internalMutation({
  args: { userId: v.id("users"), stripeCustomerId: v.string() },
  handler: async (ctx, { userId, stripeCustomerId }) => {
    await ctx.db.patch(userId, { stripeCustomerId });
  },
});

// Called only from the Stripe webhook handler in http.ts, once a Checkout
// Session actually completes — this is the single place a subscription
// becomes "active" for real money, as opposed to completeCheckout's
// simulated path which is now a fallback when Stripe isn't configured.
export const applyCheckoutCompleted = internalMutation({
  args: {
    userId: v.id("users"),
    product: v.union(v.literal("applicant"), v.literal("agent")),
    plan: v.union(APPLICANT_PLAN, AGENT_PLAN),
    billingCycle: BILLING_CYCLE,
    amountCents: v.number(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripeEventId: v.optional(v.string()),
    referralCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Idempotency: Stripe retries webhooks on timeout — process each event exactly once.
    if (args.stripeEventId) {
      const alreadyProcessed = await ctx.db
        .query("processed_webhook_events")
        .withIndex("by_provider_reference", (q) =>
          q.eq("provider", "stripe").eq("reference", args.stripeEventId!),
        )
        .unique();
      if (alreadyProcessed) return;
      await ctx.db.insert("processed_webhook_events", {
        provider: "stripe",
        reference: args.stripeEventId,
        processedAt: new Date().toISOString(),
      });
    }

    const user = await ctx.db.get(args.userId);
    if (!user) return;
    const now = new Date().toISOString();

    // If a referral code was captured at checkout and the user doesn't yet
    // have one stored, apply it now so the agent commission fires correctly.
    if (args.referralCode && !user.referredByCode) {
      await ctx.db.patch(user._id, { referredByCode: args.referralCode });
      user.referredByCode = args.referralCode;
    }

    if (args.product === "applicant") {
      await bumpPlanCounters(ctx, user.plan, args.plan as "pro" | "expert");
      await ctx.db.patch(user._id, {
        plan: args.plan as "pro" | "expert",
        billingCycle: args.billingCycle,
        subscriptionAmountCents: args.amountCents,
        subscriptionStartedAt: user.subscriptionStartedAt ?? now,
        lastPaymentAt: now,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
      });

      // Now on a real auto-renewing subscription — clear any leftover
      // one-time-payment expiry tracking so the cron never downgrades them.
      const staleExpiration = await ctx.db
        .query("one_time_plan_expirations")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (staleExpiration) {
        await ctx.db.delete(staleExpiration._id);
      }

      // Only pay agent commission on a first subscription — resubscribing
      // after cancellation should not trigger a second referral payout.
      if (!user.subscriptionStartedAt) {
        await creditAgentReferralCommission(
          ctx,
          user,
          args.plan as "pro" | "expert",
          args.billingCycle,
          args.amountCents,
        );
      }

      // Log month-1 creator commission for the initial Stripe checkout.
      // Renewal months (invoice.payment_succeeded) are handled separately in
      // applySubscriptionRenewal below, which guards against double-counting
      // by filtering billing_reason === "subscription_create" at the webhook.
      if (user.creatorCode && (args.plan === "pro" || args.plan === "expert")) {
        await ctx.scheduler.runAfter(0, internal.creators.logMonthlyCommission, {
          creatorSlug: user.creatorCode,
          referredUserId: user._id,
          plan: args.plan as "pro" | "expert",
          billingMonth: currentBillingMonth(),
          subscriptionAmountCents: args.amountCents,
          monthsFromSignup: 1,
        });
      }
    } else {
      await ctx.db.patch(user._id, {
        agentPlan: args.plan as
          | "agent_listing"
          | "agent_featured"
          | "agency_white_label",
        agentBillingCycle: args.billingCycle,
        agentSubscriptionAmountCents: args.amountCents,
        agentSubscriptionStartedAt: user.agentSubscriptionStartedAt ?? now,
        lastAgentPaymentAt: now,
        stripeCustomerId: args.stripeCustomerId,
        agentStripeSubscriptionId: args.stripeSubscriptionId,
      });

      const agentProfile = await ctx.db
        .query("agent_profiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (agentProfile) {
        await ctx.db.patch(agentProfile._id, {
          tier: args.plan as
            | "agent_listing"
            | "agent_featured"
            | "agency_white_label",
        });
      }
    }
  },
});

const REMINDER_DAYS_BEFORE_EXPIRY = 3;
const CYCLE_DAYS = { monthly: 30, yearly: 365 } as const;

// Shared completion path for any payment method with no stored instrument
// to auto-renew — Stripe Pix/boleto/OXXO and Paystack mobile money/bank
// transfer/USSD all land here, since none of them can be auto-charged next
// cycle the way a real card subscription can. Activates the plan exactly
// like a Stripe subscription would, but also schedules a real renewal
// reminder (reusing the existing reminders/email pipeline) and records an
// expiry date the daily cron checks, so an unrenewed plan actually lapses
// back to free instead of staying active forever after one payment.
export const applyOneTimePlanPayment = internalMutation({
  args: {
    userId: v.id("users"),
    plan: APPLICANT_PLAN,
    billingCycle: BILLING_CYCLE,
    amountCents: v.number(),
    paystackReference: v.optional(v.string()),
    stripeEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.email) return;

    // Deduplicate by reference/event-id so webhook retries never activate
    // a plan twice. Runs in the same Convex transaction so concurrent
    // deliveries of the same event get an OCC conflict, retry, find the row.
    const idempotencyProvider = args.paystackReference ? "paystack" : args.stripeEventId ? "stripe" : null;
    const idempotencyRef = args.paystackReference ?? args.stripeEventId;
    if (idempotencyProvider && idempotencyRef) {
      const alreadyProcessed = await ctx.db
        .query("processed_webhook_events")
        .withIndex("by_provider_reference", (q) =>
          q.eq("provider", idempotencyProvider).eq("reference", idempotencyRef),
        )
        .unique();
      if (alreadyProcessed) return;
      await ctx.db.insert("processed_webhook_events", {
        provider: idempotencyProvider,
        reference: idempotencyRef,
        processedAt: new Date().toISOString(),
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + CYCLE_DAYS[args.billingCycle] * 24 * 60 * 60 * 1000);
    const reminderDue = new Date(expiresAt.getTime() - REMINDER_DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000);

    await bumpPlanCounters(ctx, user.plan, args.plan);
    await ctx.db.patch(user._id, {
      plan: args.plan,
      billingCycle: args.billingCycle,
      subscriptionAmountCents: args.amountCents,
      subscriptionStartedAt: user.subscriptionStartedAt ?? nowIso,
      lastPaymentAt: nowIso,
      ...(args.paystackReference ? { paystackReference: args.paystackReference } : {}),
    });

    // Replace any existing expiration row for this user (e.g. renewing
    // before the previous cycle lapsed) rather than leaving a stale one.
    const existingExpiration = await ctx.db
      .query("one_time_plan_expirations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (existingExpiration) {
      await ctx.db.patch(existingExpiration._id, { expiresAt: expiresAt.toISOString() });
    } else {
      await ctx.db.insert("one_time_plan_expirations", {
        userId: user._id,
        expiresAt: expiresAt.toISOString(),
      });
    }

    await ctx.db.insert("reminders", {
      userId: user._id,
      title: `Renew your VisaClear ${args.plan === "expert" ? "Expert" : "Pro"} plan`,
      note: "Your plan was paid for with a one-time payment method, so it won't renew automatically — pay again to keep your benefits active.",
      dueDate: reminderDue.toISOString().split("T")[0],
      email: user.email,
      sent: false,
      createdAt: nowIso,
    });

    // This path re-fires on every renewal (one-time payment methods can't
    // auto-charge), so a referring agent earns commission again each time
    // their referred client actually pays again — not just on day one.
    await creditAgentReferralCommission(ctx, user, args.plan, args.billingCycle, args.amountCents);

    // Same logic applies for creator commissions — log one row per payment,
    // capped by commissionMonths. logMonthlyCommission's idempotency guard
    // (by_referred_user + billingMonth) prevents double-counting on retries.
    if (user.creatorCode) {
      const effectiveStart = user.subscriptionStartedAt ?? nowIso;
      await ctx.scheduler.runAfter(0, internal.creators.logMonthlyCommission, {
        creatorSlug: user.creatorCode,
        referredUserId: user._id,
        plan: args.plan,
        billingMonth: currentBillingMonth(),
        subscriptionAmountCents: args.amountCents,
        monthsFromSignup: monthsFromSignup(effectiveStart),
      });
    }
  },
});

// Called from the Stripe webhook on invoice.payment_succeeded for renewal
// billing cycles (billing_reason !== "subscription_create"). Handles creator
// commission for months 2+ of a recurring subscription and keeps
// lastPaymentAt accurate so the admin panel's "last payment" column stays fresh.
export const applySubscriptionRenewal = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    amountCents: v.number(),
    stripeEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const alreadyProcessed = await ctx.db
      .query("processed_webhook_events")
      .withIndex("by_provider_reference", (q) =>
        q.eq("provider", "stripe").eq("reference", args.stripeEventId),
      )
      .unique();
    if (alreadyProcessed) return;
    await ctx.db.insert("processed_webhook_events", {
      provider: "stripe",
      reference: args.stripeEventId,
      processedAt: new Date().toISOString(),
    });

    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .unique();
    if (!user) return;

    await ctx.db.patch(user._id, { lastPaymentAt: new Date().toISOString() });

    if (user.plan === "pro" || user.plan === "expert") {
      // Agent earns commission on every renewal, same as the Paystack path —
      // the idempotency key (stripeEventId) prevents double-counting on retries.
      if (user.billingCycle) {
        await creditAgentReferralCommission(
          ctx,
          user,
          user.plan,
          user.billingCycle as "monthly" | "yearly",
          args.amountCents,
        );
      }
      if (user.creatorCode && user.subscriptionStartedAt) {
        await ctx.scheduler.runAfter(0, internal.creators.logMonthlyCommission, {
          creatorSlug: user.creatorCode,
          referredUserId: user._id,
          plan: user.plan,
          billingMonth: currentBillingMonth(),
          subscriptionAmountCents: args.amountCents,
          monthsFromSignup: monthsFromSignup(user.subscriptionStartedAt),
        });
      }
    }
  },
});

// Subscription cancelled or lapsed (customer.subscription.deleted, or a
// final failed-payment retry) — downgrades back to free/no agent plan
// rather than leaving a paid plan active with no money behind it.
export const applySubscriptionEnded = internalMutation({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const byApplicant = await ctx.db
      .query("users")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .unique();
    if (byApplicant) {
      await bumpPlanCounters(ctx, byApplicant.plan, "free");
      await ctx.db.patch(byApplicant._id, {
        plan: "free",
        stripeSubscriptionId: undefined,
      });
      return;
    }

    const byAgent = await ctx.db
      .query("users")
      .withIndex("by_agent_stripe_subscription", (q) =>
        q.eq("agentStripeSubscriptionId", args.stripeSubscriptionId),
      )
      .unique();
    if (byAgent) {
      await ctx.db.patch(byAgent._id, {
        agentPlan: undefined,
        agentStripeSubscriptionId: undefined,
      });
      const agentProfile = await ctx.db
        .query("agent_profiles")
        .withIndex("by_user", (q) => q.eq("userId", byAgent._id))
        .unique();
      if (agentProfile) {
        await ctx.db.patch(agentProfile._id, { tier: undefined });
      }
    }
  },
});

// Called from the Stripe webhook on charge.refunded / charge.dispute.created
// — a paid-for plan shouldn't stay active once the money behind it has been
// taken back. Identifies the user via the charge's metadata.userId when
// present (always true for one-time payments and a subscription's first
// charge, since both inherit the originating Checkout Session's metadata)
// and falls back to a stripeCustomerId lookup for later renewal charges,
// which Stripe does not carry checkout metadata onto. If the fallback can't
// tell applicant and agent subscriptions apart (both present, ambiguous) it
// deliberately does nothing but log, rather than guess and downgrade the
// wrong product.
export const applyPaymentReversed = internalMutation({
  args: {
    stripeEventId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    product: v.optional(v.union(v.literal("applicant"), v.literal("agent"))),
    reason: v.union(v.literal("refunded"), v.literal("disputed")),
  },
  handler: async (ctx, args) => {
    const alreadyProcessed = await ctx.db
      .query("processed_webhook_events")
      .withIndex("by_provider_reference", (q) =>
        q.eq("provider", "stripe").eq("reference", args.stripeEventId),
      )
      .unique();
    if (alreadyProcessed) return;
    await ctx.db.insert("processed_webhook_events", {
      provider: "stripe",
      reference: args.stripeEventId,
      processedAt: new Date().toISOString(),
    });

    let user = args.userId ? await ctx.db.get(args.userId) : null;
    if (!user && args.stripeCustomerId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
        .unique();
    }
    if (!user) {
      console.error(
        `applyPaymentReversed: could not identify a user for stripeEventId=${args.stripeEventId} (${args.reason}) — no metadata.userId and no stripeCustomerId match. Needs manual review in Stripe dashboard.`,
      );
      return;
    }

    const hasApplicantSub = !!user.stripeSubscriptionId;
    const hasAgentSub = !!user.agentStripeSubscriptionId;
    const product =
      args.product ??
      (hasApplicantSub && !hasAgentSub ? "applicant" : !hasApplicantSub && hasAgentSub ? "agent" : undefined);

    if (product === "applicant") {
      await bumpPlanCounters(ctx, user.plan, "free");
      await ctx.db.patch(user._id, { plan: "free", stripeSubscriptionId: undefined });
      const expiration = await ctx.db
        .query("one_time_plan_expirations")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (expiration) await ctx.db.delete(expiration._id);
      return;
    }

    if (product === "agent") {
      await ctx.db.patch(user._id, { agentPlan: undefined, agentStripeSubscriptionId: undefined });
      const agentProfile = await ctx.db
        .query("agent_profiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (agentProfile) await ctx.db.patch(agentProfile._id, { tier: undefined });
      return;
    }

    // Ambiguous (both or neither subscription field set) and no metadata
    // hint — downgrading the wrong product is worse than doing nothing and
    // flagging it for a human to check.
    console.error(
      `applyPaymentReversed: user ${user._id} has ambiguous subscription state (applicantSub=${hasApplicantSub}, agentSub=${hasAgentSub}) for stripeEventId=${args.stripeEventId} (${args.reason}) — needs manual review.`,
    );
  },
});

const EXPIRY_PAGE_SIZE = 50;

export const getExpiredOneTimePlansPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const today = new Date().toISOString();
    return await ctx.db
      .query("one_time_plan_expirations")
      .withIndex("by_expires", (q) => q.lte("expiresAt", today))
      .paginate(args.paginationOpts);
  },
});

export const downgradeOneTimePlan = internalMutation({
  args: { expirationId: v.id("one_time_plan_expirations"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user) {
      await bumpPlanCounters(ctx, user.plan, "free");
      await ctx.db.patch(user._id, { plan: "free" });
    }
    await ctx.db.delete(args.expirationId);
  },
});

// Called by cron once a day. One-time payment methods (Pix, boleto, OXXO,
// Paystack) have no stored instrument to auto-charge, so without this an
// unrenewed plan would just stay "pro"/"expert" forever after a single
// payment — this is what actually makes the renewal reminder mean
// something. Paginated + self-chaining for the same reason the reminder
// dispatcher is: never let one invocation risk timing out partway through.
export const dispatchExpiredPlanDowngrades = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const { page, isDone, continueCursor } = await ctx.runQuery(
      internal.billing.getExpiredOneTimePlansPage,
      { paginationOpts: { cursor: args.cursor ?? null, numItems: EXPIRY_PAGE_SIZE } },
    );

    await Promise.allSettled(
      page.map((row) =>
        ctx.runMutation(internal.billing.downgradeOneTimePlan, {
          expirationId: row._id,
          userId: row.userId,
        }),
      ),
    );

    if (!isDone) {
      await ctx.scheduler.runAfter(0, internal.billing.dispatchExpiredPlanDowngrades, {
        cursor: continueCursor,
      });
    }
  },
});
