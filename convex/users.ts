import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { bumpStat, bumpPlanCounters } from "./platformStats.ts";
import { getCurrentUser as getCurrentUserDoc, getCurrentUserOrThrow } from "./authHelpers.ts";

// Exported so the real Stripe checkout action (convex/stripe.ts) prices
// sessions from the exact same numbers as the simulated fallback path —
// one source of truth, no risk of the two ever drifting apart.
export const PLAN_PRICES_CENTS = {
  pro: { monthly: 900, yearly: 7900 },
  expert: { monthly: 1900, yearly: 14900 },
} as const;

export const AGENT_PLAN_PRICES_CENTS = {
  agent_listing: { monthly: 2900, yearly: 29000 },
  agent_featured: { monthly: 7900, yearly: 79000 },
  agency_white_label: { monthly: 14900, yearly: 149000 },
} as const;

const BUILT_IN_REFERRALS: Record<string, number> = {
  VERICORE20: 20,
  VISACLEAR20: 20,
};

function makeReferralCode(name: string | undefined, userId: string) {
  const prefix = (name ?? "VISA")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  return `${prefix}${userId.slice(-6).toUpperCase()}`;
}

function normalizeReferralCode(code: string) {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

async function getReferralDiscount(
  ctx: QueryCtx | MutationCtx,
  code: string | undefined,
  currentUser?: Doc<"users">,
) {
  if (!code) return { discountPercent: 0, normalizedCode: undefined };

  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode) return { discountPercent: 0, normalizedCode: undefined };

  const builtInDiscount = BUILT_IN_REFERRALS[normalizedCode];
  if (builtInDiscount)
    return { discountPercent: builtInDiscount, normalizedCode };

  const owner = await ctx.db
    .query("users")
    .withIndex("by_referral_code", (q) => q.eq("referralCode", normalizedCode))
    .unique();

  if (!owner || owner._id === currentUser?._id) {
    return { discountPercent: 0, normalizedCode: undefined };
  }

  return { discountPercent: 15, normalizedCode };
}

// Lets the Stripe checkout action (which has no direct db access) price a
// session with the exact same referral logic as the simulated checkout path.
export const getReferralDiscountForCheckout = internalQuery({
  args: { code: v.optional(v.string()), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUser = args.userId ? await ctx.db.get(args.userId) : undefined;
    return getReferralDiscount(ctx, args.code, currentUser ?? undefined);
  },
});

function detectCardBrand(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(digits))
    return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  return "Card";
}

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Convex Auth already creates the users row itself on sign-up/sign-in
    // (via the provider's profile() callback) — this mutation only ever
    // needs to apply VisaClear's own first-time defaults on top of it.
    const user = await getCurrentUserOrThrow(ctx);

    if (user.referralCode && user.role) {
      return user._id;
    }

    const isFirstTime = !user.role;
    await ctx.db.patch(user._id, {
      referralCode: user.referralCode ?? makeReferralCode(user.name, user._id),
      plan: user.plan ?? "free",
      role: user.role ?? "user",
    });

    if (isFirstTime) {
      await bumpStat(ctx, "totalUsers", 1);
      if (user.email) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.welcome.sendWelcomeEmail,
          {
            to: user.email,
            name: user.name,
          },
        );
      }
    }

    return user._id;
  },
});

// email is deliberately NOT an arg here — it can only change via the
// verified emailChange.ts flow (request + confirm-by-link), since
// employerInvites.ts and licenseCodes.ts both trust user.email as a proven
// identity. Letting this mutation overwrite it directly would let anyone
// impersonate an invited/licensed email with no verification.
export const updateProfile = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await ctx.db.patch(user._id, {
      name: args.name.trim(),
      phone: args.phone?.trim() || undefined,
      country: args.country?.trim() || undefined,
    });
    return user._id;
  },
});

export const updatePayoutSetup = mutation({
  args: {
    method: v.union(
      v.literal("bank"),
      v.literal("mobile_money"),
      v.literal("paypal"),
    ),
    accountName: v.string(),
    country: v.string(),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    mobileMoneyProvider: v.optional(v.string()),
    mobileMoneyNumber: v.optional(v.string()),
    paypalEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const accountNumberDigits = args.accountNumber?.replace(/\D/g, "") ?? "";
    const mobileDigits = args.mobileMoneyNumber?.replace(/\D/g, "") ?? "";
    const existingPayout = user.payoutSetup;
    const accountNumberLast4 = accountNumberDigits
      ? accountNumberDigits.slice(-4)
      : existingPayout?.method === "bank"
        ? existingPayout.accountNumberLast4
        : undefined;
    const mobileMoneyLast4 = mobileDigits
      ? mobileDigits.slice(-4)
      : existingPayout?.method === "mobile_money"
        ? existingPayout.mobileMoneyLast4
        : undefined;

    if (args.method === "bank" && (!args.bankName || !accountNumberLast4)) {
      throw new ConvexError({
        code: "INVALID_PAYOUT",
        message: "Enter a bank name and account number.",
      });
    }
    if (
      args.method === "mobile_money" &&
      (!args.mobileMoneyProvider || !mobileMoneyLast4)
    ) {
      throw new ConvexError({
        code: "INVALID_PAYOUT",
        message: "Enter a mobile money provider and number.",
      });
    }
    if (
      args.method === "paypal" &&
      (!args.paypalEmail || !args.paypalEmail.includes("@"))
    ) {
      throw new ConvexError({
        code: "INVALID_PAYOUT",
        message: "Enter a valid PayPal email.",
      });
    }

    await ctx.db.patch(user._id, {
      payoutSetup: {
        method: args.method,
        accountName: args.accountName.trim(),
        country: args.country.trim(),
        bankName: args.bankName?.trim() || undefined,
        accountNumberLast4,
        mobileMoneyProvider: args.mobileMoneyProvider?.trim() || undefined,
        mobileMoneyLast4,
        paypalEmail: args.paypalEmail?.trim() || undefined,
        updatedAt: new Date().toISOString(),
      },
    });
    return user._id;
  },
});

// Real referral signups — counts users whose referredByCode matches this
// user's own code, via a real index (never an unindexed scan of the users
// table). Commission payout itself still depends on real billing being
// connected, which is why this returns a signup count, not a dollar figure.
export const getMyReferralStats = query({
  args: {},
  handler: async (ctx): Promise<{ referralCode: string | null; signupCount: number }> => {
    const user = await getCurrentUserDoc(ctx);
    if (!user || !user.referralCode) return { referralCode: null, signupCount: 0 };
    const referred = await ctx.db
      .query("users")
      .withIndex("by_referred_by_code", (q) => q.eq("referredByCode", user.referralCode))
      .collect();
    return { referralCode: user.referralCode, signupCount: referred.length };
  },
});

export const validateReferralCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const normalizedCode = normalizeReferralCode(args.code);
    if (!normalizedCode) {
      return {
        valid: false,
        discountPercent: 0,
        message: "Enter a referral code.",
      };
    }

    const builtInDiscount = BUILT_IN_REFERRALS[normalizedCode];
    if (builtInDiscount) {
      return {
        valid: true,
        discountPercent: builtInDiscount,
        code: normalizedCode,
        message: `${builtInDiscount}% discount applied.`,
      };
    }

    const currentUser = await getCurrentUserDoc(ctx);
    const owner = await ctx.db
      .query("users")
      .withIndex("by_referral_code", (q) =>
        q.eq("referralCode", normalizedCode),
      )
      .unique();

    if (!owner) {
      return {
        valid: false,
        discountPercent: 0,
        message: "Referral code not found.",
      };
    }
    if (owner._id === currentUser?._id) {
      return {
        valid: false,
        discountPercent: 0,
        message: "You cannot use your own referral code.",
      };
    }

    return {
      valid: true,
      discountPercent: 15,
      code: normalizedCode,
      message: `15% referral discount applied${owner.name ? ` from ${owner.name}` : ""}.`,
    };
  },
});

export const completeCheckout = mutation({
  args: {
    plan: v.union(v.literal("pro"), v.literal("expert")),
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    referralCode: v.optional(v.string()),
    expectedAmountCents: v.number(),
    paymentMethod: v.object({
      cardNumber: v.string(),
      nameOnCard: v.string(),
      expiryMonth: v.string(),
      expiryYear: v.string(),
      billingEmail: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const baseAmountCents = PLAN_PRICES_CENTS[args.plan][args.billingCycle];
    const { discountPercent, normalizedCode } = await getReferralDiscount(
      ctx,
      args.referralCode,
      user,
    );
    const finalAmountCents = Math.round(
      baseAmountCents * (1 - discountPercent / 100),
    );

    if (args.expectedAmountCents !== finalAmountCents) {
      throw new ConvexError({
        code: "PRICE_MISMATCH",
        message: "The checkout total changed. Please refresh and try again.",
      });
    }

    const cardDigits = args.paymentMethod.cardNumber.replace(/\D/g, "");
    if (cardDigits.length < 12 || cardDigits.length > 19) {
      throw new ConvexError({
        code: "INVALID_PAYMENT_METHOD",
        message: "Enter a valid card number.",
      });
    }
    if (!args.paymentMethod.nameOnCard.trim()) {
      throw new ConvexError({
        code: "INVALID_PAYMENT_METHOD",
        message: "Enter the name on the card.",
      });
    }
    if (!args.paymentMethod.billingEmail.includes("@")) {
      throw new ConvexError({
        code: "INVALID_PAYMENT_METHOD",
        message: "Enter a valid billing email.",
      });
    }

    const now = new Date().toISOString();
    await bumpPlanCounters(ctx, user.plan, args.plan);
    await ctx.db.patch(user._id, {
      plan: args.plan,
      billingCycle: args.billingCycle,
      subscriptionAmountCents: finalAmountCents,
      subscriptionStartedAt: user.subscriptionStartedAt ?? now,
      lastPaymentAt: now,
      referredByCode: normalizedCode ?? user.referredByCode,
      paymentMethod: {
        type: "card",
        brand: detectCardBrand(cardDigits),
        last4: cardDigits.slice(-4),
        nameOnMethod: args.paymentMethod.nameOnCard.trim(),
        expiresAt: `${args.paymentMethod.expiryMonth.padStart(2, "0")}/${args.paymentMethod.expiryYear}`,
        billingEmail: args.paymentMethod.billingEmail.trim(),
        updatedAt: now,
      },
    });

    return {
      plan: args.plan,
      billingCycle: args.billingCycle,
      discountPercent,
      amountCents: finalAmountCents,
    };
  },
});

export const completeAgentCheckout = mutation({
  args: {
    plan: v.union(
      v.literal("agent_listing"),
      v.literal("agent_featured"),
      v.literal("agency_white_label"),
    ),
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    referralCode: v.optional(v.string()),
    expectedAmountCents: v.number(),
    paymentMethod: v.object({
      cardNumber: v.string(),
      nameOnCard: v.string(),
      expiryMonth: v.string(),
      expiryYear: v.string(),
      billingEmail: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const baseAmountCents =
      AGENT_PLAN_PRICES_CENTS[args.plan][args.billingCycle];
    const { discountPercent, normalizedCode } = await getReferralDiscount(
      ctx,
      args.referralCode,
      user,
    );
    const finalAmountCents = Math.round(
      baseAmountCents * (1 - discountPercent / 100),
    );

    if (args.expectedAmountCents !== finalAmountCents) {
      throw new ConvexError({
        code: "PRICE_MISMATCH",
        message: "The checkout total changed. Please refresh and try again.",
      });
    }

    const cardDigits = args.paymentMethod.cardNumber.replace(/\D/g, "");
    if (cardDigits.length < 12 || cardDigits.length > 19) {
      throw new ConvexError({
        code: "INVALID_PAYMENT_METHOD",
        message: "Enter a valid card number.",
      });
    }
    if (!args.paymentMethod.nameOnCard.trim()) {
      throw new ConvexError({
        code: "INVALID_PAYMENT_METHOD",
        message: "Enter the name on the card.",
      });
    }
    if (!args.paymentMethod.billingEmail.includes("@")) {
      throw new ConvexError({
        code: "INVALID_PAYMENT_METHOD",
        message: "Enter a valid billing email.",
      });
    }

    const now = new Date().toISOString();
    await ctx.db.patch(user._id, {
      agentPlan: args.plan,
      agentBillingCycle: args.billingCycle,
      agentSubscriptionAmountCents: finalAmountCents,
      agentSubscriptionStartedAt: user.agentSubscriptionStartedAt ?? now,
      lastAgentPaymentAt: now,
      referredByCode: normalizedCode ?? user.referredByCode,
      paymentMethod: {
        type: "card",
        brand: detectCardBrand(cardDigits),
        last4: cardDigits.slice(-4),
        nameOnMethod: args.paymentMethod.nameOnCard.trim(),
        expiresAt: `${args.paymentMethod.expiryMonth.padStart(2, "0")}/${args.paymentMethod.expiryYear}`,
        billingEmail: args.paymentMethod.billingEmail.trim(),
        updatedAt: now,
      },
    });

    // Keep the agent's marketplace tier in sync — this is what actually
    // makes Featured Placement / White-Label surface in getFeaturedAgents,
    // instead of the plan only existing on the billing record.
    const agentProfile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (agentProfile) {
      await ctx.db.patch(agentProfile._id, { tier: args.plan });
    }

    return {
      plan: args.plan,
      billingCycle: args.billingCycle,
      discountPercent,
      amountCents: finalAmountCents,
    };
  },
});

export const deleteCurrentAccount = mutation({
  args: { confirmEmail: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (
      (user.email ?? "").toLowerCase() !==
      args.confirmEmail.trim().toLowerCase()
    ) {
      throw new ConvexError({
        code: "EMAIL_MISMATCH",
        message: "The email confirmation does not match your account.",
      });
    }

    const checklists = await ctx.db
      .query("saved_checklists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const analyses = await ctx.db
      .query("rejection_analyses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const agentProfiles = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const vaultDocs = await ctx.db
      .query("vault_documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const countryWatches = await ctx.db
      .query("country_watches")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const aiUsageRows = await ctx.db
      .query("ai_assistant_usage")
      .withIndex("by_user_month", (q) => q.eq("userId", user._id))
      .collect();

    // Vault documents also own a real uploaded file in Convex storage —
    // deleting the row without deleting the file would leave it behind
    // forever, which is a real privacy problem for a product that promises
    // GDPR compliance in its own emails.
    for (const doc of vaultDocs) {
      await ctx.storage.delete(doc.storageId);
    }

    for (const doc of [
      ...checklists,
      ...reminders,
      ...analyses,
      ...agentProfiles,
      ...vaultDocs,
      ...countryWatches,
      ...aiUsageRows,
    ]) {
      await ctx.db.delete(doc._id);
    }
    await ctx.db.delete(user._id);

    // Keep the admin dashboard's denormalized counters accurate — this bulk
    // delete bypasses the per-row mutations that normally call bumpStat.
    await bumpStat(ctx, "totalChecklists", -checklists.length);
    await bumpStat(ctx, "totalRejectionAnalyses", -analyses.length);
    await bumpStat(ctx, "totalAgents", -agentProfiles.length);
    await bumpStat(ctx, "totalUsers", -1);
    await bumpPlanCounters(ctx, user.plan, undefined);

    return { deleted: true };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserDoc(ctx);
  },
});

export const startTrial = mutation({
  args: { plan: v.union(v.literal("pro"), v.literal("expert")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await bumpPlanCounters(ctx, user.plan, args.plan);
    await ctx.db.patch(user._id, {
      plan: args.plan,
      trialStartedAt: new Date().toISOString(),
    });
    return user._id;
  },
});
