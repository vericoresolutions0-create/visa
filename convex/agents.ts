import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { bumpStat } from "./platformStats.ts";
import { getCurrentUser, getCurrentUserOrThrow, assertNotSuspended } from "./authHelpers.ts";
import { checkUserDailyLimit } from "./rateLimits.ts";
import { logSecurityEvent } from "./securityAudit.ts";

async function getMyAgentProfileOrThrow(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  const profile = await ctx.db
    .query("agent_profiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  if (!profile) throw new ConvexError({ code: "NOT_FOUND", message: "No agent profile found for this account" });
  return profile;
}

// ─── List agents — tier-sorted, free agents excluded ──────────────────────────
// Free (no tier) verified agents are NOT listed publicly. Only agents with a
// paid plan or an active admin-granted trial appear in the marketplace.
// Returns three buckets in priority order so the frontend can render distinct
// sections without any client-side sorting logic.
export const listTieredAgents = query({
  args: {},
  handler: async (ctx) => {
    const [elite, featured, listed] = await Promise.all([
      ctx.db.query("agent_profiles").withIndex("by_tier", (q) => q.eq("tier", "agency_white_label")).take(50),
      ctx.db.query("agent_profiles").withIndex("by_tier", (q) => q.eq("tier", "agent_featured")).take(50),
      ctx.db.query("agent_profiles").withIndex("by_tier", (q) => q.eq("tier", "agent_listing")).take(100),
    ]);
    return {
      elite:    elite.filter((a) => a.verified && !a.suspended),
      featured: featured.filter((a) => a.verified && !a.suspended),
      listed:   listed.filter((a) => a.verified && !a.suspended),
    };
  },
});

// ─── Legacy paginated query — kept only while agents/page.tsx still imports it ─

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
    region: v.optional(v.union(v.literal("global"), v.literal("europe"))),
    credentialType: v.optional(v.string()),
    credentialNumber: v.optional(v.string()),
    credentialVerifyUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);

    if (!args.fullName.trim() || args.fullName.length > 200)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Full name must be under 200 characters." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(args.email.trim()) || args.email.length > 254)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter a valid email address." });
    if (args.phone && args.phone.length > 30)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Phone number is too long." });
    if (args.credentialNumber && args.credentialNumber.length > 100)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Credential number is too long." });
    if (args.credentialType && args.credentialType.length > 100)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Credential type is too long." });
    if (args.credentialVerifyUrl && args.credentialVerifyUrl.length > 500)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Credential verify URL is too long." });
    if (args.credentialVerifyUrl) {
      const u = args.credentialVerifyUrl.trim();
      if (!u.startsWith("https://") && !u.startsWith("http://"))
        throw new ConvexError({ code: "BAD_REQUEST", message: "Credential verify URL must start with https:// or http://." });
    }
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
        region: args.region,
        credentialType: args.credentialType,
        credentialNumber: args.credentialNumber,
        credentialVerifyUrl: args.credentialVerifyUrl,
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
      region: args.region,
      credentialType: args.credentialType,
      credentialNumber: args.credentialNumber,
      credentialVerifyUrl: args.credentialVerifyUrl,
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

    // Write audit event and schedule the welcome + AI bio email atomically
    await Promise.all([
      logSecurityEvent(ctx, {
        actorUserId: user._id,
        action: "agent_profile_create",
        severity: "info",
        resourceType: "agent_profile",
        resourceId: id,
        metadata: { specialisations: args.specialisations, country: args.country },
      }),
      ctx.scheduler.runAfter(0, internal.emails.agentWelcome.sendAgentWelcomeEmail, {
        to: args.email,
        agentName: args.fullName,
        specialisations: args.specialisations,
        country: args.country,
        yearsExperience: args.yearsExperience,
        bio: args.bio,
        region: args.region,
      }),
    ]);

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
    assertNotSuspended(user);
    const agent = await ctx.db.get(args.agentProfileId);
    if (!agent) throw new ConvexError({ code: "NOT_FOUND", message: "Agent not found" });
    if (!agent.verified || agent.suspended) throw new ConvexError({ code: "FORBIDDEN", message: "You can only contact verified agents." });
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

// Public guest enquiry — no account required. Rate-limited to one enquiry per
// (email, agent) per day so the same address can't spam the same agent.
// fromUserId is intentionally absent on these rows; agents see them as leads
// with a name + email but no linked VisaClear account.
export const contactAgentAsGuest = mutation({
  args: {
    agentProfileId: v.id("agent_profiles"),
    guestName: v.string(),
    guestEmail: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.guestName.trim();
    const email = args.guestEmail.trim().toLowerCase();
    const message = args.message?.trim();

    if (!name || name.length > 200)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter your name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter a valid email address." });
    if (message && message.length > 2000)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Message must be under 2,000 characters." });

    const agent = await ctx.db.get(args.agentProfileId);
    if (!agent || !agent.verified || agent.suspended)
      throw new ConvexError({ code: "NOT_FOUND", message: "Agent not found." });

    const dateKey = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("guest_enquiry_daily")
      .withIndex("by_email_agent_date", (q) =>
        q.eq("emailKey", email).eq("agentProfileId", args.agentProfileId).eq("dateKey", dateKey),
      )
      .first();

    if (existing) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "You've already sent an enquiry to this agent today. Check your inbox for their reply.",
      });
    }

    // Platform-wide daily backstop — prevents a botnet with many distinct
    // email addresses from flooding all agents simultaneously.
    const globalRow = await ctx.db
      .query("guest_enquiry_global_daily")
      .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
      .unique();

    if (globalRow && globalRow.count >= 300) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "We've hit our enquiry limit for today. Please try again tomorrow.",
      });
    }

    if (globalRow) {
      await ctx.db.patch(globalRow._id, { count: globalRow.count + 1 });
    } else {
      await ctx.db.insert("guest_enquiry_global_daily", { dateKey, count: 1 });
    }

    await ctx.db.insert("agent_contact_requests", {
      agentProfileId: args.agentProfileId,
      fromName: name,
      fromEmail: email,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    });

    await ctx.db.insert("guest_enquiry_daily", {
      emailKey: email,
      agentProfileId: args.agentProfileId,
      dateKey,
      count: 1,
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
      .take(1000);

    const matches = allVerified.filter((a) => {
      if (a.suspended) return false;
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
      // Only £29+ Listing agents appear in the regular section — free (no tier)
      // verified agents are not listed publicly until they subscribe.
      listed: matches.filter((a) => a.tier === "agent_listing"),
    };
  },
});

// ─── Public: individual agent profile page ────────────────────────────────────
// Takes a raw string (same resilience pattern as getTrip) — a stale link,
// a bad bookmark, or an unverified agent ID all return null cleanly.
// Unverified profiles are never surfaced: they're pending admin review.
export const getAgentPublicProfile = query({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("agent_profiles", args.profileId);
    if (!id) return null;
    const profile = await ctx.db.get(id);
    if (!profile || !profile.verified || profile.suspended) return null;
    // Strip internal/sensitive fields before returning to any caller.
    // email, userId, lastDashboardViewAt, creditBalance, region are never
    // rendered on the public profile and shouldn't be exposed to scrapers.
    // Credential fields (credentialType, credentialNumber, credentialVerifyUrl)
    // are intentionally kept — they're public information users need to
    // independently verify the agent's professional registration.
    const {
      email: _e,
      userId: _u,
      lastDashboardViewAt: _l,
      creditBalance: _c,
      region: _r,
      ...publicProfile
    } = profile;
    return publicProfile;
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

// ─── Public: record one profile page view ─────────────────────────────────────
// Called from the profile page on mount. No auth required — it's a vanity
// counter, not a security gate. Rate-limited to 10k views/day per agent to
// prevent a competitor from hammering the endpoint.
export const recordProfileView = mutation({
  args: { agentProfileId: v.id("agent_profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.agentProfileId);
    if (!profile || !profile.verified) return;

    // Don't count the agent's own page visits — they'd skew their own stats.
    const viewer = await getCurrentUser(ctx);
    if (viewer && viewer._id === profile.userId) return;

    const dateKey = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("agent_profile_views")
      .withIndex("by_agent_and_date", (q) =>
        q.eq("agentProfileId", args.agentProfileId).eq("dateKey", dateKey),
      )
      .unique();

    if (existing) {
      if (existing.count >= 10000) return;
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("agent_profile_views", {
        agentProfileId: args.agentProfileId,
        dateKey,
        count: 1,
      });
    }
  },
});

// ─── Agent: profile view stats ────────────────────────────────────────────────
// Today / last 7 days / last 30 days. Reads via the compound index so it
// never scans the full table — always bounded to this agent's rows only.
export const getMyProfileViewStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) return null;

    const today   = new Date().toISOString().slice(0, 10);
    const d7ago   = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const d30ago  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const rows = await ctx.db
      .query("agent_profile_views")
      .withIndex("by_agent_and_date", (q) =>
        q.eq("agentProfileId", profile._id).gte("dateKey", d30ago),
      )
      .take(31);

    let viewsToday = 0;
    let views7d    = 0;
    let views30d   = 0;

    for (const row of rows) {
      views30d += row.count;
      if (row.dateKey >= d7ago)  views7d    += row.count;
      if (row.dateKey === today) viewsToday  = row.count;
    }

    return { viewsToday, views7d, views30d };
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

// ─── Public: flag an agent for admin review ───────────────────────────────────
// No auth required so unregistered users can still report a scam agent.
// Anonymous reports are allowed; authenticated user id stored when available.
// Rate-limited to one report per (ip-equivalent: same userId) per agent per day
// via the user_daily_usage table when authenticated.
export const reportAgent = mutation({
  args: {
    agentProfileId: v.id("agent_profiles"),
    reason: v.union(
      v.literal("fake_credentials"),
      v.literal("inappropriate_behavior"),
      v.literal("scam"),
      v.literal("misleading_information"),
      v.literal("other"),
    ),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.details && args.details.trim().length > 1000) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Details must be under 1,000 characters." });
    }

    const agent = await ctx.db.get(args.agentProfileId);
    if (!agent) throw new ConvexError({ code: "NOT_FOUND", message: "Agent not found." });

    const user = await getCurrentUser(ctx);

    if (user) {
      await checkUserDailyLimit(ctx, user._id, "reportAgent", 3, "You can submit up to 3 agent reports per day.");
    }

    await ctx.db.insert("agent_reports", {
      agentProfileId: args.agentProfileId,
      reportedByUserId: user?._id,
      reason: args.reason,
      details: args.details?.trim(),
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  },
});
