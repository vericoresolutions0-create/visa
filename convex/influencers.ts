import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./authHelpers.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

async function requireAdmin(ctx: Parameters<typeof getCurrentUserOrThrow>[0]) {
  const user = await getCurrentUserOrThrow(ctx);
  if (user.role !== "admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return user;
}

// ─── Admin: create a new influencer code ─────────────────────────────────────

export const createCode = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    email: v.string(),
    commissionRate: v.optional(v.number()),
    attributionWindowDays: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const normalised = args.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (normalised.length < 3 || normalised.length > 20) {
      throw new ConvexError({ code: "INVALID", message: "Code must be 3–20 alphanumeric characters." });
    }

    const existing = await ctx.db
      .query("influencer_codes")
      .withIndex("by_code", (q) => q.eq("code", normalised))
      .unique();
    if (existing) {
      throw new ConvexError({ code: "DUPLICATE", message: `Code "${normalised}" already exists.` });
    }

    await ctx.db.insert("influencer_codes", {
      code: normalised,
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      commissionRate: args.commissionRate ?? 20,
      attributionWindowDays: args.attributionWindowDays ?? 90,
      portalToken: generateToken(),
      active: true,
      notes: args.notes,
      createdAt: new Date().toISOString(),
      createdByUserId: admin._id,
    });

    return { code: normalised };
  },
});

// ─── Admin: list all influencers with summary stats ──────────────────────────

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const codes = await ctx.db.query("influencer_codes").take(500);

    return await Promise.all(
      codes.map(async (inf) => {
        const commissions = await ctx.db
          .query("influencer_commissions")
          .withIndex("by_code", (q) => q.eq("influencerCode", inf.code))
          .take(5000);

        const signupCount = await ctx.db
          .query("users")
          .withIndex("by_influencer_code", (q) => q.eq("influencerCode", inf.code))
          .take(5000)
          .then((rows) => rows.length);

        const totalCommissionCents = commissions.reduce((s, c) => s + c.commissionCents, 0);
        const paidCents = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.commissionCents, 0);
        const pendingCents = totalCommissionCents - paidCents;

        return {
          _id: inf._id,
          code: inf.code,
          name: inf.name,
          email: inf.email,
          commissionRate: inf.commissionRate,
          attributionWindowDays: inf.attributionWindowDays,
          portalToken: inf.portalToken,
          active: inf.active,
          notes: inf.notes,
          createdAt: inf.createdAt,
          signupCount,
          totalCommissionCents,
          paidCents,
          pendingCents,
          commissionCount: commissions.length,
        };
      })
    );
  },
});

// ─── Admin: toggle active status ─────────────────────────────────────────────

export const toggleActive = mutation({
  args: { id: v.id("influencer_codes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const inf = await ctx.db.get(args.id);
    if (!inf) throw new ConvexError({ code: "NOT_FOUND", message: "Influencer not found." });
    await ctx.db.patch(args.id, { active: !inf.active });
  },
});

// ─── Admin: mark pending commissions as paid ─────────────────────────────────

export const markCommissionsPaid = mutation({
  args: {
    influencerCode: v.string(),
    paymentNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const pending = await ctx.db
      .query("influencer_commissions")
      .withIndex("by_code", (q) => q.eq("influencerCode", args.influencerCode))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .take(200);

    const paidAt = new Date().toISOString();
    await Promise.all(
      pending.map((c) =>
        ctx.db.patch(c._id, {
          status: "paid",
          paidAt,
          paidByAdminId: admin._id,
          paymentNotes: args.paymentNotes,
        })
      )
    );

    return { markedPaid: pending.length };
  },
});

// ─── Public: record an influencer code on a signed-in user ───────────────────
// Called once after sign-in if localStorage has a ?af= code that arrived
// within the attribution window. Silent no-op if the code is invalid/inactive
// or the user already has one.

export const trackSignup = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Already attributed — don't overwrite.
    if (user.influencerCode) return;

    const normalised = args.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const inf = await ctx.db
      .query("influencer_codes")
      .withIndex("by_code", (q) => q.eq("code", normalised))
      .unique();

    // Silently ignore unknown or deactivated codes.
    if (!inf || !inf.active) return;

    await ctx.db.patch(user._id, {
      influencerCode: normalised,
      influencerTrackedAt: new Date().toISOString(),
    });
  },
});

// ─── Public portal: stats by portal token (no PII exposed) ──────────────────

export const getPortalStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const inf = await ctx.db
      .query("influencer_codes")
      .withIndex("by_portal_token", (q) => q.eq("portalToken", args.token))
      .unique();

    if (!inf) return null;

    const commissions = await ctx.db
      .query("influencer_commissions")
      .withIndex("by_code", (q) => q.eq("influencerCode", inf.code))
      .take(5000);

    const signupCount = await ctx.db
      .query("users")
      .withIndex("by_influencer_code", (q) => q.eq("influencerCode", inf.code))
      .take(5000)
      .then((rows) => rows.length);

    const totalCommissionCents = commissions.reduce((s, c) => s + c.commissionCents, 0);
    const paidCents = commissions
      .filter((c) => c.status === "paid")
      .reduce((s, c) => s + c.commissionCents, 0);
    const pendingCents = totalCommissionCents - paidCents;

    // Recent commissions list — anonymised, no PII
    const recent = [...commissions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
      .map((c) => ({
        plan: c.plan,
        commissionCents: c.commissionCents,
        commissionRatePercent: c.commissionRatePercent,
        status: c.status,
        createdAt: c.createdAt,
        paidAt: c.paidAt,
      }));

    return {
      name: inf.name,
      code: inf.code,
      commissionRate: inf.commissionRate,
      attributionWindowDays: inf.attributionWindowDays,
      active: inf.active,
      signupCount,
      paidSubscriberCount: commissions.length,
      totalCommissionCents,
      paidCents,
      pendingCents,
      minimumPayoutCents: 5000, // £50
      recentCommissions: recent,
    };
  },
});

// ─── Internal: log a commission when a referred user pays ────────────────────
// Called from payment webhook handlers (Stripe/Paystack) when a user whose
// influencerCode is set subscribes to a paid plan for the first time.

export const logCommission = internalMutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("pro"), v.literal("expert")),
    subscriptionAmountCents: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.influencerCode) return; // user wasn't referred by an influencer

    const inf = await ctx.db
      .query("influencer_codes")
      .withIndex("by_code", (q) => q.eq("code", user.influencerCode!))
      .unique();
    if (!inf || !inf.active) return;

    // Block self-referral: an influencer paying under their own code (e.g. a
    // second personal account) should never earn commission on their own money.
    if (user.email && user.email.toLowerCase() === inf.email.toLowerCase()) {
      return;
    }

    // Enforce the attribution window server-side. trackSignup is the only
    // writer of influencerCode/influencerTrackedAt, always setting both
    // together, so influencerTrackedAt is always present whenever
    // influencerCode is — a user tracked outside this influencer's
    // configured window (checked at payment time, not signup time) never
    // gets attributed, no matter what the client believes.
    if (user.influencerTrackedAt) {
      const trackedAtMs = new Date(user.influencerTrackedAt).getTime();
      const windowMs = inf.attributionWindowDays * 24 * 60 * 60 * 1000;
      if (Date.now() - trackedAtMs > windowMs) return;
    }

    // Only commission the first paid month — if they already have a commission
    // row, this is a renewal, not a first payment.
    const existing = await ctx.db
      .query("influencer_commissions")
      .withIndex("by_referred_user", (q) => q.eq("referredUserId", args.userId))
      .unique();
    if (existing) return; // already commissioned

    const commissionCents = Math.round(args.subscriptionAmountCents * (inf.commissionRate / 100));

    await ctx.db.insert("influencer_commissions", {
      influencerCode: inf.code,
      referredUserId: args.userId,
      plan: args.plan,
      subscriptionAmountCents: args.subscriptionAmountCents,
      commissionRatePercent: inf.commissionRate,
      commissionCents,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  },
});
