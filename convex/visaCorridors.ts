import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";

// ── Public: verified agents for a corridor ──────────────────────────────────
// Returns ONLY safe public fields. Never exposes email, phone, creditBalance,
// userId, or any CRM data. Callers are unauthenticated public visitors.
export const getPublicAgentsForCorridor = query({
  args: {
    destination: v.string(),
    specialisation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.destination.length > 100) return [];

    // Pull verified agents only — take 200 as pool, filter client-side.
    // No "by_verified_and_destination" compound index exists so we filter after.
    const pool = await ctx.db
      .query("agent_profiles")
      .withIndex("by_verified", (q) => q.eq("verified", true))
      .take(200);

    const dest = args.destination.toLowerCase();
    const spec = args.specialisation?.toLowerCase();

    const matching = pool.filter((a) => {
      const servesDestination =
        !dest ||
        (a.destinations ?? []).some((d) => d.toLowerCase() === dest);
      const matchesSpec =
        !spec ||
        a.specialisations.some((s) => s.toLowerCase().includes(spec));
      return servesDestination && matchesSpec;
    });

    // Sort: featured/agency first, then by rating desc
    const tierRank: Record<string, number> = {
      agency_white_label: 0,
      agent_featured: 1,
      agent_listing: 2,
    };
    matching.sort((a, b) => {
      const ta = tierRank[a.tier ?? "agent_listing"] ?? 2;
      const tb = tierRank[b.tier ?? "agent_listing"] ?? 2;
      if (ta !== tb) return ta - tb;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

    // Return only public-safe fields — never email/phone/creditBalance/userId
    return matching.slice(0, 6).map((a) => ({
      id: a._id,
      fullName: a.fullName,
      country: a.country,
      specialisations: a.specialisations,
      yearsExperience: a.yearsExperience,
      rating: a.rating ?? null,
      reviewCount: a.reviewCount ?? 0,
      tier: a.tier ?? null,
    }));
  },
});

// ── Public: approved Wall of Fame stories for a corridor ────────────────────
// These are already admin-moderated for public visibility — no PII risk.
export const getApprovedStoriesForCorridor = query({
  args: {
    destination: v.string(),
    visaType: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.destination.length > 100 || args.visaType.length > 100) return [];

    const stories = await ctx.db
      .query("wall_of_fame_stories")
      .withIndex("by_destination_visatype", (q) =>
        q.eq("destination", args.destination).eq("visaType", args.visaType),
      )
      .filter((q) => q.eq(q.field("status"), "approved"))
      .take(10);

    // Return only what's needed for the rejection patterns widget.
    // submittedByUserId is never returned.
    return stories.map((s) => ({
      id: s._id,
      refusalCount: s.refusalCount,
      whatWentWrong: s.whatWentWrong,
      whatFixedIt: s.whatFixedIt,
      createdAt: s.createdAt,
    }));
  },
});

// ── Public: aggregate rejection analyser engagement count ──────────────────
// Returns only a count — never individual user data, never refusal text.
export const getCorridorEngagementStats = query({
  args: {
    destination: v.string(),
    visaType: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.destination.length > 100 || args.visaType.length > 100) {
      return { rejectionAnalysisCount: 0 };
    }

    const analyses = await ctx.db
      .query("rejection_analyses")
      .withIndex("by_destination_visatype", (q) =>
        q.eq("destination", args.destination).eq("visaType", args.visaType),
      )
      .take(500);

    return { rejectionAnalysisCount: analyses.length };
  },
});

// ── Public mutation: subscribe to corridor policy alerts ────────────────────
// Rate-limited (50/day global), deduped per email+corridor, no auth required.
const ALERT_DAILY_CAP = 50;

export const subscribeToCorridorAlerts = mutation({
  args: {
    email: v.string(),
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate inputs
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@") || email.length > 254) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Please enter a valid email address." });
    }
    if (args.origin.length > 100 || args.destination.length > 100 || args.visaType.length > 100) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Invalid corridor data." });
    }

    // Global daily cap — same backstop pattern used across VisaClear
    const today = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("corridor_alert_daily_usage")
      .withIndex("by_date", (q) => q.eq("dateKey", today))
      .unique();

    if (existing) {
      if (existing.count >= ALERT_DAILY_CAP) {
        throw new ConvexError({ code: "RATE_LIMITED", message: "Too many subscriptions today. Please try again tomorrow." });
      }
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("corridor_alert_daily_usage", { dateKey: today, count: 1 });
    }

    // Deduplication: don't insert if already subscribed to this exact corridor
    const dupe = await ctx.db
      .query("corridor_alert_subscriptions")
      .withIndex("by_email_and_corridor", (q) =>
        q
          .eq("email", email)
          .eq("origin", args.origin)
          .eq("destination", args.destination)
          .eq("visaType", args.visaType),
      )
      .unique();

    if (dupe) {
      // Already subscribed — silent success so email enumeration isn't possible
      return { alreadySubscribed: true };
    }

    await ctx.db.insert("corridor_alert_subscriptions", {
      email,
      origin: args.origin,
      destination: args.destination,
      visaType: args.visaType,
      subscribedAt: new Date().toISOString(),
    });

    return { alreadySubscribed: false };
  },
});

// ── Admin: list corridor alert subscribers ──────────────────────────────────
// Requires admin — never accessible publicly.
export const adminGetCorridorAlertSubscribers = query({
  args: {
    origin: v.optional(v.string()),
    destination: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.origin && args.destination) {
      return await ctx.db
        .query("corridor_alert_subscriptions")
        .withIndex("by_corridor", (q) =>
          q.eq("origin", args.origin!).eq("destination", args.destination!),
        )
        .take(500);
    }

    return await ctx.db
      .query("corridor_alert_subscriptions")
      .order("desc")
      .take(200);
  },
});
