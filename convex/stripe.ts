"use node";

import Stripe from "stripe";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { PLAN_PRICES_CENTS, AGENT_PLAN_PRICES_CENTS } from "./users.ts";
import { assertNotSuspended } from "./authHelpers.ts";

const PLAN_LABELS: Record<string, string> = {
  pro: "VisaClear Pro",
  expert: "VisaClear Expert",
  agent_listing: "VisaClear Agent Listing",
  agent_featured: "VisaClear Agent Featured Placement",
  agency_white_label: "VisaClear Agency White-Label",
};

function stripeErrMsg(err: unknown): string {
  const msg = (err as { message?: string }).message ?? "";
  // Strip "[CONVEX ...]" prefixes that leak internal routing details to users.
  if (msg.startsWith("[CONVEX") || msg.includes("Server Error")) return "";
  return msg;
}

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new ConvexError({
      code: "STRIPE_NOT_CONFIGURED",
      message: "Billing isn't connected yet.",
    });
  }
  return new Stripe(key);
}

// Real, hosted Stripe Checkout — card details are entered on Stripe's own
// page and never touch our frontend or backend. That's what keeps this out
// of PCI scope and gets Stripe Radar's automatic fraud/stolen-card
// screening (and 3D Secure step-up when a card issuer requires it) applied
// to every single payment attempt, for free, with no extra code here.
export const createCheckoutSession = action({
  args: {
    product: v.union(v.literal("applicant"), v.literal("agent")),
    plan: v.union(
      v.literal("pro"),
      v.literal("expert"),
      v.literal("agent_listing"),
      v.literal("agent_featured"),
      v.literal("agency_white_label"),
    ),
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    referralCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const stripe = getStripeClient();
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    }
    assertNotSuspended(user);

    const baseAmountCents =
      args.product === "applicant"
        ? PLAN_PRICES_CENTS[args.plan as "pro" | "expert"][args.billingCycle]
        : AGENT_PLAN_PRICES_CENTS[
            args.plan as "agent_listing" | "agent_featured" | "agency_white_label"
          ][args.billingCycle];

    const { discountPercent, normalizedCode }: { discountPercent: number; normalizedCode?: string } =
      await ctx.runQuery(internal.users.getReferralDiscountForCheckout, {
        code: args.referralCode,
        userId: user._id,
      });
    const amountCents = Math.round(baseAmountCents * (1 - discountPercent / 100));

    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const successPath = args.product === "agent" ? "/agents/onboarding" : "/dashboard";

    const sessionParams = (customerId: string): Stripe.Checkout.SessionCreateParams => ({
      mode: "subscription",
      customer: customerId,
      // No payment_method_types here, deliberately — leaving it unset (not
      // hardcoding ["card"]) is what lets Stripe automatically offer SEPA
      // Direct Debit, iDEAL, and Bancontact to European customers once
      // they're turned on in the Stripe Dashboard. Those methods settle
      // into a recurring mandate Stripe manages itself, so they work in
      // subscription mode with zero extra code here. Card-less, one-time
      // -only local methods (Pix, boleto, OXXO) don't support recurring
      // billing at all, which is why Latin America gets its own one-time
      // checkout path below instead of being forced through this flow.
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: args.billingCycle === "yearly" ? "year" : "month" },
            unit_amount: amountCents,
            product_data: { name: PLAN_LABELS[args.plan] },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}${successPath}?checkout=success`,
      cancel_url: `${siteUrl}/payment?product=${args.product}&plan=${args.plan}&billing=${args.billingCycle}&checkout=cancelled`,
      metadata: {
        userId: user._id,
        product: args.product,
        plan: args.plan,
        billingCycle: args.billingCycle,
        amountCents: String(amountCents),
        ...(normalizedCode ? { referralCode: normalizedCode } : {}),
      },
    });

    const createCustomer = async () => {
      const c = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id },
      });
      await ctx.runMutation(internal.billing.persistStripeCustomerId, {
        userId: user._id,
        stripeCustomerId: c.id,
      });
      return c.id;
    };

    // Every Stripe API call from here down is wrapped so any failure — customer
    // creation, session creation, or the "no such customer" retry — surfaces as
    // a ConvexError with the real Stripe message instead of the generic fallback.
    let stripeCustomerId: string;
    try {
      stripeCustomerId = user.stripeCustomerId ?? (await createCustomer());
    } catch (err: unknown) {
      throw new ConvexError({
        code: "STRIPE_API_ERROR",
        message: stripeErrMsg(err) || "Could not create a billing account. Please try again.",
      });
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams(stripeCustomerId));
    } catch (err: unknown) {
      // Stale customer ID (e.g. test-mode cus_xxx in a live-mode account) —
      // create a fresh one and retry exactly once.
      const isNoSuchCustomer =
        (err as { code?: string }).code === "resource_missing" &&
        String((err as { message?: string }).message ?? "").toLowerCase().includes("customer");
      if (isNoSuchCustomer) {
        try {
          stripeCustomerId = await createCustomer();
          session = await stripe.checkout.sessions.create(sessionParams(stripeCustomerId));
        } catch (retryErr: unknown) {
          throw new ConvexError({
            code: "STRIPE_API_ERROR",
            message: stripeErrMsg(retryErr) || "Could not start Stripe checkout. Please try again.",
          });
        }
      } else {
        throw new ConvexError({
          code: "STRIPE_API_ERROR",
          message: stripeErrMsg(err) || "Could not start Stripe checkout. Please try again.",
        });
      }
    }

    if (!session.url) {
      throw new ConvexError({
        code: "STRIPE_SESSION_ERROR",
        message: "Could not start checkout. Please try again.",
      });
    }

    return { url: session.url };
  },
});

// Stripe Customer Portal — lets agents view invoices, update their payment
// method, or cancel their subscription without contacting support.
export const createAgentBillingPortalSession = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const stripe = getStripeClient();
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in." });
    }
    assertNotSuspended(user);
    if (!user.stripeCustomerId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No Stripe billing account found. Your subscription may have been set up via a different payment method.",
      });
    }

    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${siteUrl}/agents/dashboard`,
    });

    return { url: portalSession.url };
  },
});

// Pix, boleto, and OXXO are real Stripe-supported payment methods for
// Brazil and Mexico — but Stripe doesn't support them for *recurring*
// billing (there's no stored instrument to auto-charge next cycle), so
// they go through a one-time Checkout Session instead of the subscription
// flow above. Each method only works in its own settlement currency, which
// is why this is priced in BRL/MXN rather than USD.
// Local prices are manually set (not live FX-converted) so a customer's
// price never jitters between visits — same discipline as the visa
// checklist's "lastVerified" dates: set deliberately, reviewed periodically,
// not computed on the fly. Set 2026-06-25 from then-current USD/BRL ≈ 5.21,
// USD/MXN ≈ 17.59 — review every few months as rates drift.
const LOCAL_METHOD_CURRENCY = { pix: "brl", boleto: "brl", oxxo: "mxn" } as const;
type LocalMethod = keyof typeof LOCAL_METHOD_CURRENCY;

const LOCAL_PLAN_PRICES = {
  brl: {
    pro: { monthly: 4700, yearly: 41500 }, // R$47.00 / R$415.00
    expert: { monthly: 9900, yearly: 78000 }, // R$99.00 / R$780.00
  },
  mxn: {
    pro: { monthly: 16000, yearly: 140000 }, // MX$160.00 / MX$1,400.00
    expert: { monthly: 34000, yearly: 265000 }, // MX$340.00 / MX$2,650.00
  },
} as const;

export const createLocalMethodCheckoutSession = action({
  args: {
    plan: v.union(v.literal("pro"), v.literal("expert")),
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    method: v.union(v.literal("pix"), v.literal("boleto"), v.literal("oxxo")),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const stripe = getStripeClient();
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    }
    assertNotSuspended(user);

    const currency = LOCAL_METHOD_CURRENCY[args.method as LocalMethod];
    const amount = LOCAL_PLAN_PRICES[currency][args.plan][args.billingCycle];
    const siteUrl = process.env.SITE_URL || "https://visaclear.app";

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        payment_method_types: [args.method],
        line_items: [
          {
            price_data: {
              currency,
              unit_amount: amount,
              product_data: { name: `${PLAN_LABELS[args.plan]} — 1 ${args.billingCycle === "yearly" ? "year" : "month"}` },
            },
            quantity: 1,
          },
        ],
        success_url: `${siteUrl}/dashboard?checkout=success`,
        cancel_url: `${siteUrl}/payment?product=applicant&plan=${args.plan}&billing=${args.billingCycle}&checkout=cancelled`,
        metadata: {
          userId: user._id,
          product: "applicant",
          plan: args.plan,
          billingCycle: args.billingCycle,
          amountCents: String(amount),
          oneTime: "true",
          localMethod: args.method,
        },
      });
    } catch (err: unknown) {
      throw new ConvexError({
        code: "STRIPE_API_ERROR",
        message: stripeErrMsg(err) || "Could not start checkout. Please try again.",
      });
    }

    if (!session.url) {
      throw new ConvexError({
        code: "STRIPE_SESSION_ERROR",
        message: "Could not start checkout. Please try again.",
      });
    }

    return { url: session.url };
  },
});

// Lead-marketplace credit top-ups for agents — a real, hosted Stripe
// Checkout, one-time payment (no subscription — credits don't expire or
// renew). Only these three package sizes are accepted and priced here,
// server-side, exactly like every other checkout action in this file — the
// client can request a package, never a price. Kept in sync by hand with
// CREDIT_PACKAGES in src/pages/agents/marketplace-leads.tsx (that file owns
// the display copy — label/description/"Most Popular" flag — this one owns
// the money).
const CREDIT_PACKAGE_PRICES_CENTS: Record<number, number> = {
  10: 1500,  // Starter
  25: 3000,  // Professional
  60: 6000,  // Agency
};

export const purchaseCredits = action({
  args: {
    credits: v.union(v.literal(10), v.literal(25), v.literal(60)),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const stripe = getStripeClient();
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    }
    assertNotSuspended(user);

    const amountCents = CREDIT_PACKAGE_PRICES_CENTS[args.credits];
    const siteUrl = process.env.SITE_URL || "https://visaclear.app";

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: { name: `VisaClear Agent Credits — ${args.credits} credits` },
            },
            quantity: 1,
          },
        ],
        success_url: `${siteUrl}/agents/marketplace-leads?checkout=success`,
        cancel_url: `${siteUrl}/agents/marketplace-leads?checkout=cancelled`,
        metadata: {
          userId: user._id,
          product: "credits",
          credits: String(args.credits),
          amountCents: String(amountCents),
        },
      });
    } catch (err: unknown) {
      throw new ConvexError({
        code: "STRIPE_API_ERROR",
        message: stripeErrMsg(err) || "Could not start checkout. Please try again.",
      });
    }

    if (!session.url) {
      throw new ConvexError({
        code: "STRIPE_SESSION_ERROR",
        message: "Could not start checkout. Please try again.",
      });
    }

    return { url: session.url };
  },
});
