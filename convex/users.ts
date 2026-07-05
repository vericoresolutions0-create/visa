import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { bumpStat, bumpPlanCounters } from "./platformStats.ts";
import { getCurrentUser as getCurrentUserDoc, getCurrentUserOrThrow } from "./authHelpers.ts";
import { creditAgentReferralCommission } from "./agentReferralCommissions.ts";

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
      .take(5000);
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
    if (!currentUser) {
      return { valid: false, discountPercent: 0, message: "Sign in first to apply a referral code." };
    }

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
      message: "15% referral discount applied.",
    };
  },
});

const PLAN_TIER: Record<string, number> = { free: 0, pro: 1, expert: 2 };
const CYCLE_DAYS_CHECKOUT = { monthly: 30, yearly: 365 } as const;

export const completeCheckout = mutation({
  args: {
    plan: v.union(v.literal("pro"), v.literal("expert")),
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    referralCode: v.optional(v.string()),
    expectedAmountCents: v.number(),
    // Raw card numbers (PANs) must never reach the server — PCI DSS scope.
    // The frontend extracts last4 and brand client-side and sends only those.
    paymentMethod: v.object({
      last4: v.string(),
      brand: v.string(),
      nameOnCard: v.string(),
      expiryMonth: v.string(),
      expiryYear: v.string(),
      billingEmail: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // This simulated path is only valid when Stripe is not configured.
    // When Stripe IS live every real payment flows through its webhook into
    // applyCheckoutCompleted — calling this mutation directly would bypass
    // that verification entirely.
    if (process.env.STRIPE_SECRET_KEY) {
      throw new ConvexError({
        code: "INVALID_OPERATION",
        message: "Checkout is handled via Stripe. Please use the Stripe checkout flow.",
      });
    }

    const user = await getCurrentUserOrThrow(ctx);

    // Prevent downgrade via checkout (e.g. Expert → Pro). Cancellation +
    // re-subscribe is the correct path for a real downgrade.
    if ((PLAN_TIER[user.plan ?? "free"] ?? 0) > (PLAN_TIER[args.plan] ?? 0)) {
      throw new ConvexError({
        code: "INVALID_PLAN",
        message: "To switch to a lower-tier plan, cancel your current subscription and resubscribe.",
      });
    }

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

    if (!/^\d{4}$/.test(args.paymentMethod.last4)) {
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

    // Lock in the referral code at first subscription only — never overwrite
    // an existing one (prevents commission-stealing by passing a different
    // code on a renewal or plan-change call).
    const effectiveReferredByCode = user.referredByCode ?? normalizedCode;
    const isFirstSubscription = !user.subscriptionStartedAt;

    const now = new Date().toISOString();
    await bumpPlanCounters(ctx, user.plan, args.plan);
    await ctx.db.patch(user._id, {
      plan: args.plan,
      billingCycle: args.billingCycle,
      subscriptionAmountCents: finalAmountCents,
      subscriptionStartedAt: user.subscriptionStartedAt ?? now,
      lastPaymentAt: now,
      referredByCode: effectiveReferredByCode,
      paymentMethod: {
        type: "card",
        brand: args.paymentMethod.brand,
        last4: args.paymentMethod.last4,
        nameOnMethod: args.paymentMethod.nameOnCard.trim(),
        expiresAt: `${args.paymentMethod.expiryMonth.padStart(2, "0")}/${args.paymentMethod.expiryYear}`,
        billingEmail: args.paymentMethod.billingEmail.trim(),
        updatedAt: now,
      },
    });

    // Upsert an expiry row so the daily cron actually lapses this plan when
    // the billing period ends — without this the simulated-payment path
    // grants the plan indefinitely.
    const expiresAt = new Date(Date.now() + CYCLE_DAYS_CHECKOUT[args.billingCycle] * 24 * 60 * 60 * 1000).toISOString();
    const existingExpiration = await ctx.db
      .query("one_time_plan_expirations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (existingExpiration) {
      await ctx.db.patch(existingExpiration._id, { expiresAt });
    } else {
      await ctx.db.insert("one_time_plan_expirations", { userId: user._id, expiresAt });
    }

    // Commission only on first-time subscriptions — re-calling this mutation
    // for renewals or upgrades must not inflate commission counts.
    if (isFirstSubscription) {
      await creditAgentReferralCommission(
        ctx,
        { ...user, referredByCode: effectiveReferredByCode },
        args.plan,
        args.billingCycle,
        finalAmountCents,
      );
    }

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
      last4: v.string(),
      brand: v.string(),
      nameOnCard: v.string(),
      expiryMonth: v.string(),
      expiryYear: v.string(),
      billingEmail: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    if (process.env.STRIPE_SECRET_KEY) {
      throw new ConvexError({
        code: "INVALID_OPERATION",
        message: "Checkout is handled via Stripe. Please use the Stripe checkout flow.",
      });
    }

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

    if (!/^\d{4}$/.test(args.paymentMethod.last4)) {
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
      referredByCode: user.referredByCode ?? normalizedCode,
      paymentMethod: {
        type: "card",
        brand: args.paymentMethod.brand,
        last4: args.paymentMethod.last4,
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

    // Collect every owned record in parallel — one await per table is safe
    // here because each query is bounded by the user's own data.
    const [
      checklists,
      reminders,
      analyses,
      agentProfiles,
      vaultDocs,
      countryWatches,
      aiUsageRows,
      communityPosts,
      wallOfFameStories,
      waitTimeReports,
      clientIntakes,
      planExpirations,
      pendingEmailChanges,
      rejectionAnalyserUsage,
      inAppNotifications,
      orgMembers,
      visaStatuses,
      travelTrips,
      managedDependents,
      checklistAudits,
      userDailyUsage,
      sentContactRequests,
      employeeLinks,
      riskScoreResults,
      pendingRejectionUploads,
    ] = await Promise.all([
      ctx.db.query("saved_checklists").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("reminders").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("rejection_analyses").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("vault_documents").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("country_watches").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("ai_assistant_usage").withIndex("by_user_month", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("community_posts").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("wall_of_fame_stories").withIndex("by_user", (q) => q.eq("submittedByUserId", user._id)).collect(),
      ctx.db.query("wait_time_reports").withIndex("by_user", (q) => q.eq("submittedByUserId", user._id)).collect(),
      ctx.db.query("client_intakes").withIndex("by_agent", (q) => q.eq("agentId", user._id)).collect(),
      ctx.db.query("one_time_plan_expirations").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("pending_email_changes").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("rejection_analyser_usage").withIndex("by_user_month", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("org_members").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("visa_status").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("travel_trips").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("managed_dependents").withIndex("by_parent", (q) => q.eq("parentUserId", user._id)).collect(),
      ctx.db.query("checklist_audits").withIndex("by_user_route", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("user_daily_usage").withIndex("by_user_resource_date", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("agent_contact_requests").withIndex("by_from_user", (q) => q.eq("fromUserId", user._id)).collect(),
      ctx.db.query("org_employee_links").withIndex("by_employee_user", (q) => q.eq("employeeUserId", user._id)).collect(),
      ctx.db.query("risk_score_results").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("pending_rejection_uploads").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ]);

    // Vault documents own real storage blobs — must be deleted first.
    for (const doc of vaultDocs) {
      await ctx.storage.delete(doc.storageId);
    }

    // Client intakes own client_documents which in turn own storage blobs.
    for (const intake of clientIntakes) {
      const documents = await ctx.db
        .query("client_documents")
        .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
        .collect();
      for (const doc of documents) {
        await ctx.storage.delete(doc.storageId);
        await ctx.db.delete(doc._id);
      }
    }

    // Delete pending rejection upload blobs and their storage files.
    for (const upload of pendingRejectionUploads) {
      try { await ctx.storage.delete(upload.storageId); } catch {}
    }

    // Delete employer notes about this user (as an employee) before
    // removing the link rows themselves.
    for (const link of employeeLinks) {
      const notes = await ctx.db
        .query("org_employee_notes")
        .withIndex("by_link", (q) => q.eq("linkId", link._id))
        .collect();
      for (const note of notes) {
        await ctx.db.delete(note._id);
      }
    }

    // Delete all owned rows in one sweep.
    for (const row of [
      ...checklists,
      ...reminders,
      ...analyses,
      ...agentProfiles,
      ...vaultDocs,
      ...countryWatches,
      ...aiUsageRows,
      ...communityPosts,
      ...wallOfFameStories,
      ...waitTimeReports,
      ...clientIntakes,
      ...planExpirations,
      ...pendingEmailChanges,
      ...rejectionAnalyserUsage,
      ...inAppNotifications,
      ...orgMembers,
      ...visaStatuses,
      ...travelTrips,
      ...managedDependents,
      ...checklistAudits,
      ...userDailyUsage,
      ...sentContactRequests,
      ...employeeLinks,
      ...riskScoreResults,
      ...pendingRejectionUploads,
    ]) {
      await ctx.db.delete(row._id);
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
    if (user.plan !== "free") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Trials are only available on the free plan." });
    }
    if (user.trialStartedAt !== undefined) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You have already used your free trial." });
    }
    const trialEndAt = new Date();
    trialEndAt.setDate(trialEndAt.getDate() + 7);
    const expiresAt = trialEndAt.toISOString();

    await bumpPlanCounters(ctx, user.plan, args.plan);
    await ctx.db.patch(user._id, {
      plan: args.plan,
      trialStartedAt: new Date().toISOString(),
    });

    // Insert an expiry row so the daily downgrade cron actually lapses the
    // trial after 7 days — without this the trial plan stays active forever.
    const existingExpiration = await ctx.db
      .query("one_time_plan_expirations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (existingExpiration) {
      await ctx.db.patch(existingExpiration._id, { expiresAt });
    } else {
      await ctx.db.insert("one_time_plan_expirations", { userId: user._id, expiresAt });
    }

    return user._id;
  },
});

// ─── GDPR Article 15 / 20 — data access and portability ─────────────────────
// Returns all personal data held for the signed-in user in a single structured
// object. The frontend renders a "Download my data" button that serialises this
// to JSON. Vault document binaries are excluded (they're the user's own files
// and the download link is provided separately), but all metadata is included.
export const exportMyData = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const [
      checklists,
      reminders,
      vaultDocs,
      analyses,
      communityPosts,
      wallOfFameStories,
      countryWatches,
      travelTrips,
      managedDependents,
      visaStatuses,
      riskScoreResults,
      inAppNotifications,
      agentProfile,
      sentContactRequests,
    ] = await Promise.all([
      ctx.db.query("saved_checklists").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("reminders").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("vault_documents").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("rejection_analyses").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("community_posts").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("wall_of_fame_stories").withIndex("by_user", (q) => q.eq("submittedByUserId", user._id)).collect(),
      ctx.db.query("country_watches").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("travel_trips").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("managed_dependents").withIndex("by_parent", (q) => q.eq("parentUserId", user._id)).collect(),
      ctx.db.query("visa_status").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("risk_score_results").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", user._id)).unique(),
      ctx.db.query("agent_contact_requests").withIndex("by_from_user", (q) => q.eq("fromUserId", user._id)).collect(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        email: user.email,
        name: user.name,
        country: user.country,
        plan: user.plan,
        referralCode: user.referralCode,
        trialStartedAt: user.trialStartedAt,
        emailVerificationTime: user.emailVerificationTime,
        createdAt: user._creationTime,
      },
      checklists: checklists.map((c) => ({
        origin: c.origin,
        destination: c.destination,
        visaType: c.visaType,
        title: c.title,
        tripName: c.tripName,
        travelDate: c.travelDate,
        status: c.status,
        progress: c.progress,
        notes: c.notes,
        savedAt: c.savedAt,
      })),
      reminders: reminders.map((r) => ({
        title: r.title,
        note: r.note,
        dueDate: r.dueDate,
        email: r.email,
        sent: r.sent,
        createdAt: r.createdAt,
      })),
      vaultDocuments: vaultDocs.map((d) => ({
        label: d.label,
        fileName: d.fileName,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        expiryDate: d.expiryDate,
        uploadedAt: d.uploadedAt,
      })),
      rejectionAnalyses: analyses.map((a) => ({
        destination: a.destination,
        visaType: a.visaType,
        createdAt: a.createdAt,
      })),
      communityPosts: communityPosts.map((p) => ({
        title: p.title,
        body: p.body,
        category: p.category,
        status: p.status,
        createdAt: p.createdAt,
      })),
      wallOfFameStories: wallOfFameStories.map((s) => ({
        destination: s.destination,
        visaType: s.visaType,
        refusalCount: s.refusalCount,
        whatWentWrong: s.whatWentWrong,
        whatFixedIt: s.whatFixedIt,
        status: s.status,
        createdAt: s.createdAt,
      })),
      watchedCountries: countryWatches.map((w) => w.countryName),
      travelLog: travelTrips.map((t) => ({
        destination: t.destination,
        departureDate: t.departureDate,
        returnDate: t.returnDate,
        purpose: t.purpose,
        notes: t.notes,
        daysAbsent: t.daysAbsent,
        createdAt: t.createdAt,
      })),
      dependents: managedDependents.map((d) => ({
        fullName: d.fullName,
        relationship: d.relationship,
        dateOfBirth: d.dateOfBirth,
        createdAt: d.createdAt,
      })),
      visaStatuses: visaStatuses.map((vs) => ({
        jurisdiction: vs.jurisdiction,
        visaType: vs.visaType,
        hostCountry: vs.hostCountry,
        grantDate: vs.grantDate,
        expiryDate: vs.expiryDate,
        sponsorEmployer: vs.sponsorEmployer,
        notes: vs.notes,
        active: vs.active,
        createdAt: vs.createdAt,
      })),
      riskScores: riskScoreResults.map((r) => ({
        destination: r.destination,
        visaType: r.visaType,
        rawScore: r.rawScore,
        displayScore: r.displayScore,
        createdAt: r.createdAt,
      })),
      notifications: inAppNotifications.map((n) => ({
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt,
      })),
      agentProfile: agentProfile
        ? {
            fullName: agentProfile.fullName,
            email: agentProfile.email,
            phone: agentProfile.phone,
            bio: agentProfile.bio,
            specialisations: agentProfile.specialisations,
            languages: agentProfile.languages,
            country: agentProfile.country,
            yearsExperience: agentProfile.yearsExperience,
            createdAt: agentProfile.createdAt,
          }
        : null,
      agentContactRequests: sentContactRequests.map((r) => ({
        message: r.message,
        createdAt: r._creationTime,
      })),
    };
  },
});
