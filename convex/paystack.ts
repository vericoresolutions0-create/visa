import { ConvexError, v } from "convex/values";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";
import { assertNotSuspended } from "./authHelpers.ts";

// Lets the frontend know whether to offer the Mobile Money / Bank Transfer /
// USSD option — same "not configured yet" pattern used for Stripe, Google,
// and the AI features.
export const isPaystackConfigured = query({
  args: {},
  handler: async () => Boolean(process.env.PAYSTACK_SECRET_KEY),
});

// Paystack settles in NGN — there's no stored card/instrument for the
// mobile-money, bank-transfer, or USSD channels this integration exists
// to unlock, so (like Stripe's Pix/boleto/OXXO) this is a one-time charge
// per cycle, not a recurring subscription. Prices are manually set in NGN
// (not live FX-converted), reviewed periodically — same discipline as the
// visa checklist's "lastVerified" dates. Set 2026-06-25 from then-current
// USD/NGN ≈ 1,375 (official) / ≈ 1,400 (parallel market).
// Amounts are in kobo (100 kobo = ₦1).
const NGN_PLAN_PRICES_KOBO = {
  pro:    { monthly: 1_300_000, yearly: 11_000_000 },  // ₦13,000 / ₦110,000
  expert: { monthly: 2_700_000, yearly: 21_000_000 },  // ₦27,000 / ₦210,000
} as const;

const PLAN_LABELS: Record<string, string> = {
  pro: "VisaClear Pro",
  expert: "VisaClear Expert",
};

export const initializeTransaction = action({
  args: {
    plan: v.union(v.literal("pro"), v.literal("expert")),
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new ConvexError({
        code: "PAYSTACK_NOT_CONFIGURED",
        message: "Mobile money / bank transfer billing isn't connected yet.",
      });
    }

    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user || !user.email) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    }
    assertNotSuspended(user);

    const amountKobo = NGN_PLAN_PRICES_KOBO[args.plan][args.billingCycle];
    const siteUrl = process.env.SITE_URL || "https://visaclear.app";

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountKobo,
        currency: "NGN",
        channels: ["card", "bank", "bank_transfer", "ussd", "mobile_money"],
        callback_url: `${siteUrl}/dashboard?checkout=success`,
        metadata: {
          userId: user._id,
          product: "applicant",
          plan: args.plan,
          billingCycle: args.billingCycle,
          amountCents: String(amountKobo),
          planLabel: PLAN_LABELS[args.plan],
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data?.status || !data?.data?.authorization_url) {
      throw new ConvexError({
        code: "PAYSTACK_INIT_ERROR",
        message: "Could not start checkout. Please try again.",
      });
    }

    return { url: data.data.authorization_url as string };
  },
});
