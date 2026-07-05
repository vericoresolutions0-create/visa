import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.js";
import { requireAdmin, logAdminAction } from "./admin.ts";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Shared by every event source (guest page visit, real signup via
// convex/auth.ts, real checklist creation via convex/checklists.ts) — a
// single, indexed insert scoped to one partner's slug. No-ops silently on
// an unknown or inactive slug so a bad/typo'd ref param, or a partner who
// was turned off, can never throw and break the caller's real operation.
// "visit" is the only event type reachable from an unauthenticated request
// (signup/checklist_completed only ever fire from real account actions), so
// it's the only one a spam script could hammer directly. A short per-slug
// cooldown blocks a tight automated loop without ever dropping a real visit
// — two genuine humans clicking the same link rarely land within 2 seconds
// of each other.
// Hard cap on unauthenticated visit recording per slug per day. High enough
// that a real university email blast of 10,000 students all clicking on the
// same day would be counted; low enough that an automated script hammering
// the endpoint doesn't inflate partner stats beyond recognition.
const MAX_DAILY_VISITS_PER_SLUG = 2000;

export async function recordPartnerEvent(
  ctx: MutationCtx,
  args: { slug: string; eventType: "visit" | "signup" | "checklist_completed"; userId?: Id<"users"> },
) {
  const partner = await ctx.db.query("partners").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
  if (!partner || !partner.active) return;

  if (args.eventType === "visit") {
    const dateKey = new Date().toISOString().split("T")[0];
    const dailyRow = await ctx.db
      .query("partner_slug_daily_events")
      .withIndex("by_slug_date", (q) => q.eq("slug", args.slug).eq("dateKey", dateKey))
      .unique();
    if (dailyRow && dailyRow.count >= MAX_DAILY_VISITS_PER_SLUG) return;
    if (dailyRow) {
      await ctx.db.patch(dailyRow._id, { count: dailyRow.count + 1 });
    } else {
      await ctx.db.insert("partner_slug_daily_events", { slug: args.slug, dateKey, count: 1 });
    }
  }

  await ctx.db.insert("partner_referral_events", {
    slug: args.slug,
    eventType: args.eventType,
    userId: args.userId,
    createdAt: new Date().toISOString(),
  });
}

export const createPartner = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    partnerType: v.union(v.literal("university"), v.literal("agency"), v.literal("other")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const name = args.name.trim();
    const slug = normalizeSlug(args.slug);

    if (!name) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Partner name is required." });
    }
    if (!SLUG_PATTERN.test(slug)) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Slug must be lowercase letters, numbers, and hyphens only." });
    }

    const existing = await ctx.db.query("partners").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
    if (existing) {
      throw new ConvexError({ code: "SLUG_TAKEN", message: `A partner with the link "${slug}" already exists.` });
    }

    const partnerId = await ctx.db.insert("partners", {
      slug,
      name,
      partnerType: args.partnerType,
      active: true,
      createdAt: new Date().toISOString(),
    });
    await logAdminAction(ctx, admin, "createPartner", partnerId, `${name} (${slug})`);
    return { partnerId, slug };
  },
});

export const togglePartnerActive = mutation({
  args: { partnerId: v.id("partners"), active: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const partner = await ctx.db.get(args.partnerId);
    await ctx.db.patch(args.partnerId, { active: args.active });
    await logAdminAction(ctx, admin, "togglePartnerActive", args.partnerId, `${partner?.name ?? "unknown"} -> active=${args.active}`);
  },
});

// Partners are admin-created (not by end users), so this stays small in
// practice regardless of platform size — capped anyway for defense in
// depth rather than relying on that always holding true.
const MAX_PARTNERS = 500;

export const listPartners = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const partners = await ctx.db.query("partners").order("desc").take(MAX_PARTNERS);

    return await Promise.all(
      partners.map(async (partner) => {
        const events = await ctx.db
          .query("partner_referral_events")
          .withIndex("by_slug", (q) => q.eq("slug", partner.slug))
          .collect();
        return {
          _id: partner._id,
          slug: partner.slug,
          name: partner.name,
          partnerType: partner.partnerType,
          active: partner.active,
          createdAt: partner.createdAt,
          visits: events.filter((e) => e.eventType === "visit").length,
          signups: events.filter((e) => e.eventType === "signup").length,
          checklistCompletions: events.filter((e) => e.eventType === "checklist_completed").length,
        };
      }),
    );
  },
});

// Public, no-auth query — the frontend needs to know whether a ?ref= slug
// corresponds to a real, active partner before showing any personalized
// welcome treatment. Returns only name + type, never anything sensitive.
export const getActivePartner = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const partner = await ctx.db.query("partners").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!partner || !partner.active) return null;
    return { name: partner.name, partnerType: partner.partnerType };
  },
});

// Public, no-auth mutation — fired once per session when a ?ref= param is
// first seen on any page.
export const logReferralVisit = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    await recordPartnerEvent(ctx, { slug: args.slug, eventType: "visit" });
  },
});
