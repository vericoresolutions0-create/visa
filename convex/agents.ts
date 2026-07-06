import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { bumpStat } from "./platformStats.ts";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";
import { checkUserDailyLimit } from "./rateLimits.ts";

async function getMyAgentProfileOrThrow(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  const profile = await ctx.db
    .query("agent_profiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  if (!profile) throw new ConvexError({ code: "NOT_FOUND", message: "No agent profile found for this account" });
  return profile;
}

// ─── List agents (public, paginated) ──────────────────────────────────────────
// Only verified agents appear in the public marketplace — unverified profiles
// are pending admin review and must not be shown as bookable experts.
export const listAgents = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agent_profiles")
      .withIndex("by_verified", (q) => q.eq("verified", true))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// ─── Featured agents (real, paid-tier ranking) ────────────────────────────────
// Paying for Featured Placement or Agency White-Label actually does
// something now: those agents surface here, above the regular paginated
// list. Premium-tier counts are inherently small, so this is a real indexed
// lookup, not a scan — same shape as admin.ts's pro/expert user counts.
export const getFeaturedAgents = query({
  args: {},
  handler: async (ctx) => {
    const [whiteLabel, featured] = await Promise.all([
      ctx.db.query("agent_profiles").withIndex("by_tier", (q) => q.eq("tier", "agency_white_label")).collect(),
      ctx.db.query("agent_profiles").withIndex("by_tier", (q) => q.eq("tier", "agent_featured")).collect(),
    ]);
    return [...whiteLabel, ...featured].filter((a) => a.verified).slice(0, 10);
  },
});

// ─── Get my agent profile ─────────────────────────────────────────────────────
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

// ─── Create or update agent profile ──────────────────────────────────────────
export const upsertProfile = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    country: v.string(),
    specialisations: v.array(v.string()),
    bio: v.string(),
    yearsExperience: v.number(),
    languages: v.array(v.string()),
    destinations: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (!args.fullName.trim() || args.fullName.length > 200)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Full name must be under 200 characters." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(args.email.trim()) || args.email.length > 254)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter a valid email address." });
    if (args.phone && args.phone.length > 30)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Phone number is too long." });
    if (!args.bio.trim() || args.bio.length > 1000)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Bio is required and must be under 1000 characters." });
    if (args.country.length > 100)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Country is too long." });
    if (args.specialisations.length > 20 || args.specialisations.some((s) => s.length > 100))
      throw new ConvexError({ code: "BAD_REQUEST", message: "Too many specialisations or one is too long." });
    if (args.languages.length > 20 || args.languages.some((l) => l.length > 100))
      throw new ConvexError({ code: "BAD_REQUEST", message: "Too many languages or one is too long." });
    if (args.yearsExperience < 0 || args.yearsExperience > 60)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Years of experience must be between 0 and 60." });

    const existing = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fullName: args.fullName,
        email: args.email,
        phone: args.phone,
        country: args.country,
        specialisations: args.specialisations,
        bio: args.bio,
        yearsExperience: args.yearsExperience,
        languages: args.languages,
        destinations: args.destinations,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("agent_profiles", {
      userId: user._id,
      fullName: args.fullName,
      email: args.email,
      phone: args.phone,
      country: args.country,
      specialisations: args.specialisations,
      bio: args.bio,
      yearsExperience: args.yearsExperience,
      languages: args.languages,
      destinations: args.destinations,
      verified: false,
      createdAt: new Date().toISOString(),
      // Backfill from users.agentPlan in case this agent paid for Featured
      // Placement or White-Label before ever creating a public profile —
      // without this, completeAgentCheckout/redeemLicenseCode would have had
      // no profile row to denormalize the tier onto, and the agent would pay
      // but never actually surface as featured.
      tier: user.agentPlan,
    });
    if (user.agentPlan) await bumpStat(ctx, "totalAgents", 1);
    return id;
  },
});

// ─── Real "Contact Agent" — replaces the old client-side-only toast ──────────
export const contactAgent = mutation({
  args: {
    agentProfileId: v.id("agent_profiles"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const agent = await ctx.db.get(args.agentProfileId);
    if (!agent) throw new ConvexError({ code: "NOT_FOUND", message: "Agent not found" });
    if (!agent.verified) throw new ConvexError({ code: "FORBIDDEN", message: "You can only contact verified agents." });
    if (args.message && args.message.length > 2000) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Message must be under 2,000 characters." });
    }
    await checkUserDailyLimit(ctx, user._id, "contactAgent", 5, "You can send up to 5 contact requests per day.");

    await ctx.db.insert("agent_contact_requests", {
      agentProfileId: args.agentProfileId,
      fromUserId: user._id,
      fromName: user.name,
      fromEmail: user.email,
      message: args.message,
      createdAt: new Date().toISOString(),
      read: false,
    });
  },
});

// ─── Agent: real enquiries that reached them through the marketplace ────────
export const getMyContactRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) return [];
    return await ctx.db
      .query("agent_contact_requests")
      .withIndex("by_agent", (q) => q.eq("agentProfileId", profile._id))
      .order("desc")
      .take(50);
  },
});

export const markContactRequestRead = mutation({
  args: { id: v.id("agent_contact_requests") },
  handler: async (ctx, args) => {
    const profile = await getMyAgentProfileOrThrow(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Enquiry not found" });
    if (doc.agentProfileId !== profile._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this enquiry" });
    }
    await ctx.db.patch(args.id, { read: true });
  },
});

// ─── Real "you've been notified" signal for new client uploads ──────────────
// No email provider is configured yet, so this is the honest, real
// notification available right now: the dashboard records when the agent
// last looked, and computes "new since then" from real document timestamps.
export const markDashboardViewed = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await getMyAgentProfileOrThrow(ctx);
    await ctx.db.patch(profile._id, { lastDashboardViewAt: new Date().toISOString() });
  },
});

// ─── Public: search agents by visa type and destination ───────────────────────
// No auth required. Featured/White-Label agents surface first within results.
// Matching logic: visa type must match specialisations; if an agent has
// declared destinations, destination must match one of them — otherwise the
// agent is treated as serving all destinations.
export const searchAgents = query({
  args: {
    visaType: v.optional(v.string()),
    destination: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const visaType = args.visaType?.trim();
    const destination = args.destination?.trim();
    if (!visaType && !destination) return { featured: [], listed: [] };

    const FEATURED_TIERS = new Set(["agent_featured", "agency_white_label"]);

    const allVerified = await ctx.db
      .query("agent_profiles")
      .withIndex("by_verified", (q) => q.eq("verified", true))
      .collect();

    const matches = allVerified.filter((a) => {
      const matchesVisa =
        !visaType ||
        a.specialisations.some((s) => s.toLowerCase() === visaType.toLowerCase());
      const matchesDest =
        !destination ||
        !a.destinations ||
        a.destinations.length === 0 ||
        a.destinations.some((d) => d.toLowerCase() === destination.toLowerCase());
      return matchesVisa && matchesDest;
    });

    return {
      featured: matches.filter((a) => FEATURED_TIERS.has(a.tier ?? "")),
      listed:   matches.filter((a) => !FEATURED_TIERS.has(a.tier ?? "")),
    };
  },
});

// ─── Public: log a search event for demand signal tracking ───────────────────
// Silent, no auth required. Global daily cap (10k/day) prevents abuse.
export const logSearchEvent = mutation({
  args: {
    visaType: v.optional(v.string()),
    destination: v.optional(v.string()),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.visaType && !args.destination) return;
    if (args.sessionId.length > 100) return;

    const today = new Date().toISOString().slice(0, 10);
    const row = await ctx.db
      .query("agent_search_daily_usage")
      .withIndex("by_date", (q) => q.eq("dateKey", today))
      .unique();

    if (row) {
      if (row.count >= 10000) return;
      await ctx.db.patch(row._id, { count: row.count + 1 });
    } else {
      await ctx.db.insert("agent_search_daily_usage", { dateKey: today, count: 1 });
    }

    await ctx.db.insert("agent_search_events", {
      visaType: args.visaType,
      destination: args.destination,
      sessionId: args.sessionId,
      createdAt: new Date().toISOString(),
    });
  },
});

// ─── Agent: demand signals — searches for their declared visa types ───────────
// Returns how many applicants searched specialisations this agent covers
// in the last 30 days. Drives the "real demand is flowing past you" prompt
// that converts listing agents to featured.
export const getMyDemandSignals = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) return null;

    const FEATURED_TIERS = new Set(["agent_featured", "agency_white_label"]);

    // Last 30 days — capped to avoid full-table scans at early stage
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + "T00:00:00.000Z";
    const events = await ctx.db
      .query("agent_search_events")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .take(10000);

    const mySpecs = new Set(profile.specialisations.map((s) => s.toLowerCase()));

    const matching = events.filter(
      (e) => e.visaType && mySpecs.has(e.visaType.toLowerCase())
    );

    return {
      totalSearches: matching.length,
      isFeatured: FEATURED_TIERS.has(profile.tier ?? ""),
      specialisations: profile.specialisations,
    };
  },
});
