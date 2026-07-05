import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUserOrThrow } from "./authHelpers.ts";
import { requireAdmin } from "./admin.ts";

// ── Public — click tracking ───────────────────────────────────────────────────

// Called by the /ref/:slug page the moment someone visits. Deduped by sessionId
// (a random value stored in sessionStorage) so refreshing doesn't inflate counts.
export const logClick = mutation({
  args: {
    slug: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.slug.length > 100 || args.sessionId.length > 64) return;
    const normalSlug = args.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!normalSlug) return;

    const creator = await ctx.db
      .query("creator_codes")
      .withIndex("by_slug", (q) => q.eq("slug", normalSlug))
      .first();
    if (!creator || !creator.active) return;

    // Dedup: one click per sessionId per creator
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - 24);
    const recentClicks = await ctx.db
      .query("creator_click_events")
      .withIndex("by_slug_and_created", (q) =>
        q.eq("creatorSlug", normalSlug).gt("createdAt", windowStart.toISOString())
      )
      .take(100);

    const alreadyCounted = recentClicks.some((c) => c.sessionId === args.sessionId);
    if (alreadyCounted) return;

    await ctx.db.insert("creator_click_events", {
      creatorSlug: normalSlug,
      sessionId: args.sessionId,
      createdAt: new Date().toISOString(),
    });
    // Increment the denormalized counter so getPortalStats never has to count
    // event rows — which would silently truncate at scale (.take cap).
    await ctx.db.patch(creator._id, { clickCount: (creator.clickCount ?? 0) + 1 });
  },
});

// ── Public — signup attribution ───────────────────────────────────────────────

// Called once when a user signs in who has a stored creator code in localStorage.
// Silent no-op if the code doesn't exist, is inactive, or the user is already attributed.
export const trackSignup = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.creatorCode) return; // already attributed — never overwrite

    const normalSlug = args.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!normalSlug) return;

    const creator = await ctx.db
      .query("creator_codes")
      .withIndex("by_slug", (q) => q.eq("slug", normalSlug))
      .first();
    if (!creator || !creator.active) return;

    await ctx.db.patch(user._id, {
      creatorCode: normalSlug,
      creatorTrackedAt: new Date().toISOString(),
    });
    // Increment the denormalized signup counter on the creator document.
    await ctx.db.patch(creator._id, { signupCount: (creator.signupCount ?? 0) + 1 });
  },
});

// ── Public — creator portal ───────────────────────────────────────────────────

export const getPortalStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const creator = await ctx.db
      .query("creator_codes")
      .withIndex("by_portal_token", (q) => q.eq("portalToken", args.token))
      .first();
    if (!creator) return null;

    // Use the denormalized counter if available — avoids the .take(N) cap that
    // would silently lie once a popular creator exceeds the row limit. Legacy
    // creators without the counter fall back to the event query.
    const totalClicks = creator.clickCount !== undefined
      ? creator.clickCount
      : (await ctx.db
          .query("creator_click_events")
          .withIndex("by_slug", (q) => q.eq("creatorSlug", creator.slug))
          .take(5000)).length;

    // Still need to query users to compute paidSubscriberCount below.
    const signups = await ctx.db
      .query("users")
      .withIndex("by_creator_code", (q) => q.eq("creatorCode", creator.slug))
      .take(1000);
    const signupCount = creator.signupCount !== undefined ? creator.signupCount : signups.length;

    // Paying users (signups who are on pro or expert)
    const payingUserIds = new Set(
      signups
        .filter((u) => u.plan === "pro" || u.plan === "expert")
        .map((u) => u._id)
    );
    const paidSubscriberCount = payingUserIds.size;

    // Commission totals
    const commissions = await ctx.db
      .query("creator_commissions")
      .withIndex("by_slug", (q) => q.eq("creatorSlug", creator.slug))
      .take(2000);

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let totalCommissionCents = 0;
    let paidCents = 0;
    let pendingCents = 0;
    let earningsThisMonthCents = 0;

    for (const c of commissions) {
      totalCommissionCents += c.commissionCents;
      if (c.status === "paid") paidCents += c.commissionCents;
      else pendingCents += c.commissionCents;
      if (c.billingMonth === thisMonth) earningsThisMonthCents += c.commissionCents;
    }

    // Recent commissions — anonymised (no user PII, just plan/amount/month/status)
    const recentCommissions = commissions
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
      .map((c) => ({
        plan: c.plan,
        billingMonth: c.billingMonth,
        commissionCents: c.commissionCents,
        status: c.status,
        createdAt: c.createdAt,
        paidAt: c.paidAt,
      }));

    return {
      slug: creator.slug,
      name: creator.name,
      commissionRatePercent: creator.commissionRatePercent,
      commissionMonths: creator.commissionMonths,
      active: creator.active,
      minimumPayoutCents: 5000, // £50
      totalClicks,
      signupCount,
      paidSubscriberCount,
      totalCommissionCents,
      paidCents,
      pendingCents,
      earningsThisMonthCents,
      recentCommissions,
    };
  },
});

// ── Internal — called from billing webhooks ────────────────────────────────────

// Log one month's recurring commission for a referred user. Called on every
// successful subscription payment where the paying user has a creatorCode.
// monthsFromSignup is passed by the webhook to enforce the cap (1..commissionMonths).
export const logMonthlyCommission = internalMutation({
  args: {
    creatorSlug: v.string(),
    referredUserId: v.id("users"),
    plan: v.union(v.literal("pro"), v.literal("expert")),
    billingMonth: v.string(),
    subscriptionAmountCents: v.number(),
    monthsFromSignup: v.number(),
  },
  handler: async (ctx, args) => {
    const creator = await ctx.db
      .query("creator_codes")
      .withIndex("by_slug", (q) => q.eq("slug", args.creatorSlug))
      .first();
    if (!creator || !creator.active) return;

    // Enforce the cap
    if (creator.commissionMonths > 0 && args.monthsFromSignup > creator.commissionMonths) return;

    // Idempotency: never double-count the same user+month
    const existing = await ctx.db
      .query("creator_commissions")
      .withIndex("by_referred_user", (q) => q.eq("referredUserId", args.referredUserId))
      .filter((q) => q.eq(q.field("billingMonth"), args.billingMonth))
      .first();
    if (existing) return;

    const commissionCents = Math.floor(
      (args.subscriptionAmountCents * creator.commissionRatePercent) / 100
    );

    await ctx.db.insert("creator_commissions", {
      creatorSlug: args.creatorSlug,
      referredUserId: args.referredUserId,
      plan: args.plan,
      billingMonth: args.billingMonth,
      subscriptionAmountCents: args.subscriptionAmountCents,
      commissionRatePercent: creator.commissionRatePercent,
      commissionCents,
      monthsFromSignup: args.monthsFromSignup,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  },
});

// ── Admin ─────────────────────────────────────────────────────────────────────

export const createCode = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    email: v.string(),
    commissionRatePercent: v.number(),
    commissionMonths: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await getCurrentUserOrThrow(ctx);

    const normalSlug = args.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!normalSlug || normalSlug.length < 2) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Slug must be at least 2 alphanumeric characters." });
    }
    if (normalSlug.length > 60) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Slug too long (max 60 characters)." });
    }

    const existing = await ctx.db
      .query("creator_codes")
      .withIndex("by_slug", (q) => q.eq("slug", normalSlug))
      .first();
    if (existing) throw new ConvexError({ code: "CONFLICT", message: `Slug "${normalSlug}" is already taken.` });

    const portalToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    await ctx.db.insert("creator_codes", {
      slug: normalSlug,
      name: args.name.trim(),
      email: args.email.toLowerCase().trim(),
      commissionRatePercent: args.commissionRatePercent,
      commissionMonths: args.commissionMonths,
      portalToken,
      active: true,
      notes: args.notes?.trim(),
      createdAt: new Date().toISOString(),
      createdByUserId: user._id,
    });

    return normalSlug;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const codes = await ctx.db.query("creator_codes").order("desc").take(200);

    const results = [];
    for (const code of codes) {
      // Skip the click event query when the denormalized counter is available —
      // that query was .take(5000) and becomes a lie at scale.
      const totalClicks = code.clickCount !== undefined
        ? code.clickCount
        : (await ctx.db
            .query("creator_click_events")
            .withIndex("by_slug", (q) => q.eq("creatorSlug", code.slug))
            .take(5000)).length;

      // Still need to query users for paidSubscriberCount.
      const signups = await ctx.db
        .query("users")
        .withIndex("by_creator_code", (q) => q.eq("creatorCode", code.slug))
        .take(500);
      const signupCount = code.signupCount !== undefined ? code.signupCount : signups.length;

      const commissions = await ctx.db
        .query("creator_commissions")
        .withIndex("by_slug", (q) => q.eq("creatorSlug", code.slug))
        .take(2000);

      const totalCommissionCents = commissions.reduce((s, c) => s + c.commissionCents, 0);
      const pendingCents = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.commissionCents, 0);

      results.push({
        ...code,
        totalClicks,
        signupCount,
        paidSubscriberCount: signups.filter((u) => u.plan === "pro" || u.plan === "expert").length,
        totalCommissionCents,
        pendingCents,
      });
    }
    return results;
  },
});

export const toggleActive = mutation({
  args: { codeId: v.id("creator_codes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const code = await ctx.db.get(args.codeId);
    if (!code) throw new ConvexError({ code: "NOT_FOUND", message: "Creator code not found." });
    await ctx.db.patch(args.codeId, { active: !code.active });
  },
});

export const markCommissionsPaid = mutation({
  args: { creatorSlug: v.string(), paymentNotes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await getCurrentUserOrThrow(ctx);
    const pending = await ctx.db
      .query("creator_commissions")
      .withIndex("by_slug", (q) => q.eq("creatorSlug", args.creatorSlug))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .take(500);

    const now = new Date().toISOString();
    for (const row of pending) {
      await ctx.db.patch(row._id, {
        status: "paid",
        paidAt: now,
        paidByAdminId: user._id,
        paymentNotes: args.paymentNotes,
      });
    }
    return pending.length;
  },
});
