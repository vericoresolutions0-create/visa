import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser, getCurrentUserOrThrow, assertNotSuspended } from "./authHelpers.ts";
import { logSecurityEvent } from "./securityAudit.ts";
import type { Doc } from "./_generated/dataModel";

const MAX_MATCHED_AGENTS = 5;

// ─── Shared: find verified agents matching a lead ─────────────────────────────
// Specialisation match first (substring either direction, e.g. "Skilled
// Worker" lead matches an agent specialising in "UK Skilled Worker Visas");
// falls back to destination-served agents if nothing specialises. Used by
// the immediate new-lead alert (leadDispatch.ts), fired once per lead right
// at creation. leadSentinel.ts's 48h stale-lead nudge deliberately keeps its
// own copy of this same matching logic rather than calling this — it
// batch-loads all verified profiles ONCE and reuses that list across up to
// 10 leads per cron run; routing it through this per-lead query instead
// would mean re-fetching all 200 profiles for every lead, a real
// performance regression for no benefit at that call site.
export const findMatchingVerifiedAgents = internalQuery({
  args: { leadId: v.id("marketplace_leads"), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Doc<"agent_profiles">[]> => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return [];
    const limit = args.limit ?? MAX_MATCHED_AGENTS;

    const verifiedProfiles = await ctx.db
      .query("agent_profiles")
      .withIndex("by_verified", (q) => q.eq("verified", true))
      .take(200);

    const matching = verifiedProfiles
      .filter(
        (p) =>
          p.userId !== lead.userId &&
          p.specialisations.some(
            (s) =>
              s.toLowerCase().includes(lead.visaType.toLowerCase()) ||
              lead.visaType.toLowerCase().includes(s.toLowerCase()),
          ),
      )
      .slice(0, limit);

    if (matching.length > 0) return matching;

    return verifiedProfiles
      .filter(
        (p) =>
          p.userId !== lead.userId &&
          (!p.destinations ||
            p.destinations.length === 0 ||
            p.destinations.some(
              (d) => d.toLowerCase() === lead.destinationCountry.toLowerCase(),
            )),
      )
      .slice(0, limit);
  },
});

// Credit cost per lead urgency tier — server-only, never accepted from client.
const UNLOCK_COSTS: Record<string, number> = {
  urgent: 5,
  standard: 3,
  exploring: 2,
};

async function getAgentProfileOrThrow(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  assertNotSuspended(user);
  const profile = await ctx.db
    .query("agent_profiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  if (!profile)
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No agent profile found. Complete your agent setup first.",
    });
  return { user, profile };
}

// ─── Submit a lead (applicant side) ──────────────────────────────────────────
export const submitLead = mutation({
  args: {
    visaType: v.string(),
    destinationCountry: v.string(),
    urgencyLevel: v.union(
      v.literal("urgent"),
      v.literal("standard"),
      v.literal("exploring"),
    ),
    additionalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);

    if (!args.visaType.trim() || args.visaType.length > 100)
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Visa type is required and must be under 100 characters.",
      });
    if (!args.destinationCountry.trim() || args.destinationCountry.length > 100)
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Destination country is required.",
      });
    if (args.additionalNotes && args.additionalNotes.length > 1000)
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Notes must be under 1000 characters.",
      });

    // One active lead per user to prevent flooding the marketplace
    const existingOpen = await ctx.db
      .query("marketplace_leads")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "open"),
      )
      .first();
    if (existingOpen)
      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          "You already have an open lead request. Close it before submitting another.",
      });

    const leadId = await ctx.db.insert("marketplace_leads", {
      userId: user._id,
      visaType: args.visaType.trim(),
      destinationCountry: args.destinationCountry.trim(),
      urgencyLevel: args.urgencyLevel,
      additionalNotes: args.additionalNotes?.trim(),
      status: "open",
      unlockCost: UNLOCK_COSTS[args.urgencyLevel] ?? 3,
      createdAt: new Date().toISOString(),
    });

    await ctx.scheduler.runAfter(0, internal.leadDispatch.dispatchImmediateLeadAlert, { leadId });
  },
});

// ─── Auto-submit lead from Rejection Analyser (internal only) ────────────────
// Called from convex/ai/rejectionAnalyser.ts when the user explicitly ticked the
// GDPR consent checkbox before running their analysis. Never exposed publicly.
// Silently skips if the user already has an open lead to avoid duplicates.
export const submitLeadFromRejectionAnalysis = internalMutation({
  args: {
    userId: v.id("users"),
    visaType: v.string(),
    destinationCountry: v.string(),
    applicantNationality: v.string(),
    refusalCodes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existingOpen = await ctx.db
      .query("marketplace_leads")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "open"),
      )
      .first();
    if (existingOpen) return;

    const codes = args.refusalCodes.filter(Boolean).slice(0, 5).join(", ");
    const notes = [
      `Nationality: ${args.applicantNationality}`,
      codes ? `Refusal codes: ${codes}` : null,
    ]
      .filter(Boolean)
      .join(". ")
      .slice(0, 1000);

    const leadId = await ctx.db.insert("marketplace_leads", {
      userId: args.userId,
      visaType: args.visaType.trim(),
      destinationCountry: args.destinationCountry.trim(),
      urgencyLevel: "urgent",
      additionalNotes: notes || undefined,
      status: "open",
      unlockCost: UNLOCK_COSTS["urgent"] ?? 5,
      createdAt: new Date().toISOString(),
      leadSource: "rejection_analyser",
      applicantNationality: args.applicantNationality,
    });

    await ctx.scheduler.runAfter(0, internal.leadDispatch.dispatchImmediateLeadAlert, { leadId });
  },
});

// ─── Internal: fetch a lead by id (for the immediate-alert dispatcher) ────────
export const getLeadForAlert = internalQuery({
  args: { leadId: v.id("marketplace_leads") },
  handler: async (ctx, args) => await ctx.db.get(args.leadId),
});

// ─── Browse marketplace leads (agent side — contact details masked) ───────────
// Returns leads for ALL signed-in users, not just those with profiles. Agents
// without a profile or pending verification see the lead list but with a
// lockReason that drives the right CTA in the UI.
export const getMarketplaceLeads = query({
  args: {
    paginationOpts: paginationOptsValidator,
    destinationFilter: v.optional(v.string()),
    urgencyFilter: v.optional(
      v.union(
        v.literal("urgent"),
        v.literal("standard"),
        v.literal("exploring"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], isDone: true, continueCursor: "" };

    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    // Determine the global gate reason — applies to every lead in the result
    // when the agent can't unlock anything at all.
    const gateReason: "no_profile" | "unverified" | null = !profile
      ? "no_profile"
      : !profile.verified
        ? "unverified"
        : null;

    // Was previously .take(50) with no pagination — once open leads exceed
    // 50, anything older silently fell off Browse with no way to reach it.
    // Filtering (self-exclusion, destination, urgency) after .paginate()
    // means a returned page can have fewer items than requested — the same
    // accepted tradeoff community.ts's listApprovedPosts already makes.
    const result = await ctx.db
      .query("marketplace_leads")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .paginate(args.paginationOpts);

    const filtered = result.page.filter((lead) => {
      if (lead.userId === user._id) return false;
      if (args.destinationFilter && lead.destinationCountry !== args.destinationFilter)
        return false;
      if (args.urgencyFilter && lead.urgencyLevel !== args.urgencyFilter)
        return false;
      return true;
    });

    // Agents who can't unlock anything yet — return a locked preview so the
    // UI can show them the leads exist and drive them toward completing setup.
    if (gateReason !== null) {
      return {
        ...result,
        page: filtered.map((lead) => ({
          _id: lead._id,
          _creationTime: lead._creationTime,
          visaType: lead.visaType,
          destinationCountry: lead.destinationCountry,
          urgencyLevel: lead.urgencyLevel,
          additionalNotes: null,
          status: lead.status,
          unlockCost: lead.unlockCost,
          createdAt: lead.createdAt,
          isUnlocked: false as const,
          lockReason: gateReason as "no_profile" | "unverified",
          unlockedAt: null,
          creditsSpent: null,
          applicantName: "Verified Applicant",
          applicantEmail: null,
          applicantPhone: null,
        })),
      };
    }

    // Verified agent — batch resolve unlock status and submitter data
    const balance = profile!.creditBalance ?? 0;

    const [unlockStatuses, submitters] = await Promise.all([
      Promise.all(
        filtered.map((lead) =>
          ctx.db
            .query("marketplace_lead_unlocks")
            .withIndex("by_lead_and_agent", (q) =>
              q.eq("leadId", lead._id).eq("agentUserId", user._id),
            )
            .unique(),
        ),
      ),
      Promise.all(filtered.map((lead) => ctx.db.get(lead.userId))),
    ]);

    return {
      ...result,
      page: filtered.map((lead, i) => {
        const unlock = unlockStatuses[i];
        const submitter = submitters[i];

        if (unlock !== null) {
          return {
            _id: lead._id,
            _creationTime: lead._creationTime,
            visaType: lead.visaType,
            destinationCountry: lead.destinationCountry,
            urgencyLevel: lead.urgencyLevel,
            additionalNotes: lead.additionalNotes ?? null,
            status: lead.status,
            unlockCost: lead.unlockCost,
            createdAt: lead.createdAt,
            isUnlocked: true as const,
            lockReason: null,
            unlockedAt: unlock.unlockedAt,
            creditsSpent: unlock.creditsSpent,
            applicantName: submitter?.name ?? "Applicant",
            applicantEmail: submitter?.email ?? null,
            applicantPhone: submitter?.phone ?? null,
          };
        }

        // Per-lead lock reason: agent verified but can't afford this one
        const lockReason: "insufficient_credits" | null =
          balance < lead.unlockCost ? "insufficient_credits" : null;

        return {
          _id: lead._id,
          _creationTime: lead._creationTime,
          visaType: lead.visaType,
          destinationCountry: lead.destinationCountry,
          urgencyLevel: lead.urgencyLevel,
          additionalNotes: null,
          status: lead.status,
          unlockCost: lead.unlockCost,
          createdAt: lead.createdAt,
          isUnlocked: false as const,
          lockReason,
          unlockedAt: null,
          creditsSpent: null,
          applicantName: "Verified Applicant",
          applicantEmail: null,
          applicantPhone: null,
        };
      }),
    };
  },
});

// ─── Unlock a lead (agent side) ───────────────────────────────────────────────
// Cost is read server-side from the lead record — never accepted as a client arg.
export const unlockLead = mutation({
  args: {
    leadId: v.id("marketplace_leads"),
  },
  handler: async (ctx, args) => {
    const { user, profile } = await getAgentProfileOrThrow(ctx);

    if (!profile.verified) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Your agent profile needs to be verified before you can unlock leads.",
      });
    }

    if (profile.leadAccessRevoked) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Your access to the lead marketplace has been revoked. Contact support@visaclear.app if you believe this is a mistake.",
      });
    }

    const lead = await ctx.db.get(args.leadId);
    if (!lead)
      throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found." });
    if (lead.status !== "open")
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "This lead is no longer available.",
      });
    if (lead.userId === user._id)
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "You cannot unlock your own lead request.",
      });

    const existing = await ctx.db
      .query("marketplace_lead_unlocks")
      .withIndex("by_lead_and_agent", (q) =>
        q.eq("leadId", args.leadId).eq("agentUserId", user._id),
      )
      .unique();
    if (existing)
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "You have already unlocked this lead.",
      });

    // Server-determined cost — read from the lead's stored value, not the client
    const cost = lead.unlockCost;
    const balance = profile.creditBalance ?? 0;

    if (balance < cost)
      throw new ConvexError({
        code: "PAYMENT_REQUIRED",
        message: `Insufficient credits. This lead costs ${cost} credits and you have ${balance}. Please top up your balance.`,
      });

    const now = new Date().toISOString();

    // Atomic: deduct balance, record unlock, and write audit event
    await Promise.all([
      ctx.db.patch(profile._id, { creditBalance: balance - cost }),
      ctx.db.insert("marketplace_lead_unlocks", {
        leadId: args.leadId,
        agentUserId: user._id,
        creditsSpent: cost,
        unlockedAt: now,
      }),
      logSecurityEvent(ctx, {
        actorUserId: user._id,
        action: "lead_unlock",
        severity: "info",
        resourceType: "marketplace_lead",
        resourceId: args.leadId,
        metadata: { creditsSpent: cost, remainingBalance: balance - cost },
      }),
    ]);

    return { creditsSpent: cost, remainingBalance: balance - cost };
  },
});

// ─── Get my unlocked leads with full contact details (agent side) ─────────────
export const getMyUnlockedLeads = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const unlocks = await ctx.db
      .query("marketplace_lead_unlocks")
      .withIndex("by_agent", (q) => q.eq("agentUserId", user._id))
      .order("desc")
      .take(100);

    const [leads, submitters] = await Promise.all([
      Promise.all(unlocks.map((u) => ctx.db.get(u.leadId))),
      Promise.all(
        unlocks.map((u) =>
          ctx.db.get(u.leadId).then((lead) =>
            lead ? ctx.db.get(lead.userId) : null,
          ),
        ),
      ),
    ]);

    return unlocks
      .map((unlock, i) => {
        const lead = leads[i];
        const submitter = submitters[i];
        if (!lead) return null;
        return {
          _id: lead._id,
          _creationTime: lead._creationTime,
          visaType: lead.visaType,
          destinationCountry: lead.destinationCountry,
          urgencyLevel: lead.urgencyLevel,
          additionalNotes: lead.additionalNotes ?? null,
          status: lead.status,
          unlockCost: lead.unlockCost,
          createdAt: lead.createdAt,
          unlockedAt: unlock.unlockedAt,
          creditsSpent: unlock.creditsSpent,
          applicantName: submitter?.name ?? "Applicant",
          applicantEmail: submitter?.email ?? null,
          applicantPhone: submitter?.phone ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  },
});

// ─── Get my own submitted leads (applicant side) ─────────────────────────────
export const getMySubmittedLeads = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await getCurrentUser(ctx);
      if (!user) return [];
      return await ctx.db
        .query("marketplace_leads")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(20);
    } catch {
      return [];
    }
  },
});

// ─── Close a lead (applicant marks it resolved / no longer needed) ────────────
export const closeLead = mutation({
  args: { leadId: v.id("marketplace_leads") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead)
      throw new ConvexError({ code: "NOT_FOUND", message: "Lead not found." });
    if (lead.userId !== user._id)
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You can only close your own leads.",
      });
    await ctx.db.patch(args.leadId, { status: "closed" });
  },
});

// ─── Get my credit balance (agent side) ──────────────────────────────────────
export const getMyCreditBalance = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return profile?.creditBalance ?? 0;
  },
});

// ─── Credit purchase history (agent side) ─────────────────────────────────────
export const getMyCreditHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("agent_credit_purchases")
      .withIndex("by_agent", (q) => q.eq("agentUserId", user._id))
      .order("desc")
      .take(50);
  },
});

// ─── Admin: grant credits to an agent ────────────────────────────────────────
export const adminGrantCredits = mutation({
  args: {
    agentUserId: v.id("users"),
    credits: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUserOrThrow(ctx);
    if (admin.role !== "admin")
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Admin access required.",
      });

    if (args.credits <= 0 || args.credits > 10000)
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Credit amount must be between 1 and 10,000.",
      });

    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.agentUserId))
      .unique();
    if (!profile)
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Agent profile not found.",
      });

    const now = new Date().toISOString();
    const newBalance = (profile.creditBalance ?? 0) + args.credits;

    await Promise.all([
      ctx.db.patch(profile._id, { creditBalance: newBalance }),
      ctx.db.insert("agent_credit_purchases", {
        agentUserId: args.agentUserId,
        creditsAdded: args.credits,
        amountPaidCents: 0,
        currency: "USD",
        source: "admin_grant",
        grantedByUserId: admin._id,
        notes: args.notes,
        createdAt: now,
      }),
      logSecurityEvent(ctx, {
        actorUserId: admin._id,
        action: "credits_granted",
        severity: "info",
        resourceType: "agent_profile",
        resourceId: profile._id,
        metadata: { creditsGranted: args.credits, newBalance, targetAgentId: args.agentUserId },
      }),
    ]);

    return { newBalance };
  },
});

// ─── Called from the Stripe/Paystack webhook on a real credit purchase ──────
// Same idempotency pattern as every other webhook-triggered mutation in this
// app (processed_webhook_events, keyed by provider + the payment's own event
// reference) — a retried webhook delivery can never grant credits twice.
export const applyCreditPurchase = internalMutation({
  args: {
    agentUserId: v.id("users"),
    credits: v.number(),
    amountPaidCents: v.number(),
    source: v.union(v.literal("stripe"), v.literal("paystack")),
    providerReference: v.string(),
  },
  handler: async (ctx, args) => {
    const alreadyProcessed = await ctx.db
      .query("processed_webhook_events")
      .withIndex("by_provider_reference", (q) =>
        q.eq("provider", args.source).eq("reference", args.providerReference),
      )
      .unique();
    if (alreadyProcessed) return;
    await ctx.db.insert("processed_webhook_events", {
      provider: args.source,
      reference: args.providerReference,
      processedAt: new Date().toISOString(),
    });

    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.agentUserId))
      .unique();
    if (!profile) {
      console.error(`applyCreditPurchase: no agent_profiles row for user ${args.agentUserId} (${args.source} ref ${args.providerReference})`);
      return;
    }

    const newBalance = (profile.creditBalance ?? 0) + args.credits;
    await Promise.all([
      ctx.db.patch(profile._id, { creditBalance: newBalance }),
      ctx.db.insert("agent_credit_purchases", {
        agentUserId: args.agentUserId,
        creditsAdded: args.credits,
        amountPaidCents: args.amountPaidCents,
        currency: "USD",
        source: args.source,
        providerReference: args.providerReference,
        createdAt: new Date().toISOString(),
      }),
    ]);
  },
});

// ─── Count open leads (for agent dashboard badge) ─────────────────────────────
export const getOpenLeadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) return 0;
    const leads = await ctx.db
      .query("marketplace_leads")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .take(100);
    // Exclude agent's own leads if they're also an applicant
    return leads.filter((l) => l.userId !== user._id).length;
  },
});

// ─── Admin: full lead overview ────────────────────────────────────────────────
export const adminGetAllLeads = query({
  args: {
    statusFilter: v.optional(v.union(v.literal("open"), v.literal("closed"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUserOrThrow(ctx);
    if (admin.role !== "admin")
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required." });

    const limit = args.limit ?? 100;

    const leads = args.statusFilter
      ? await ctx.db
          .query("marketplace_leads")
          .withIndex("by_status", (q) => q.eq("status", args.statusFilter!))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("marketplace_leads")
          .withIndex("by_created")
          .order("desc")
          .take(limit);

    const [submitters, unlockCounts] = await Promise.all([
      Promise.all(leads.map((l) => ctx.db.get(l.userId))),
      Promise.all(
        leads.map((l) =>
          ctx.db
            .query("marketplace_lead_unlocks")
            .withIndex("by_lead", (q) => q.eq("leadId", l._id))
            .take(50)
            .then((rows) => rows.length),
        ),
      ),
    ]);

    return leads.map((lead, i) => ({
      _id: lead._id,
      _creationTime: lead._creationTime,
      visaType: lead.visaType,
      destinationCountry: lead.destinationCountry,
      urgencyLevel: lead.urgencyLevel,
      status: lead.status,
      unlockCost: lead.unlockCost,
      createdAt: lead.createdAt,
      sentinelNotifiedAt: lead.sentinelNotifiedAt ?? null,
      leadSource: lead.leadSource ?? null,
      applicantNationality: lead.applicantNationality ?? null,
      additionalNotes: lead.additionalNotes ?? null,
      submitterName: submitters[i]?.name ?? null,
      submitterEmail: submitters[i]?.email ?? null,
      unlockCount: unlockCounts[i],
    }));
  },
});

// ─── Admin: get all agent credit balances ─────────────────────────────────────
export const adminGetAgentCredits = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUserOrThrow(ctx);
    if (admin.role !== "admin")
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required." });

    const profiles = await ctx.db
      .query("agent_profiles")
      .withIndex("by_verified", (q) => q.eq("verified", true))
      .take(200);

    const users = await Promise.all(profiles.map((p) => ctx.db.get(p.userId)));

    return profiles.map((p, i) => ({
      profileId: p._id,
      userId: p.userId,
      fullName: p.fullName,
      email: p.email,
      creditBalance: p.creditBalance ?? 0,
      tier: p.tier ?? null,
      region: p.region ?? null,
      userEmail: users[i]?.email ?? null,
    }));
  },
});
