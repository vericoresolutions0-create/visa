import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";

// Credit cost per lead urgency tier — server-only, never accepted from client.
const UNLOCK_COSTS: Record<string, number> = {
  urgent: 5,
  standard: 3,
  exploring: 2,
};

async function getAgentProfileOrThrow(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrThrow(ctx);
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

    await ctx.db.insert("marketplace_leads", {
      userId: user._id,
      visaType: args.visaType.trim(),
      destinationCountry: args.destinationCountry.trim(),
      urgencyLevel: args.urgencyLevel,
      additionalNotes: args.additionalNotes?.trim(),
      status: "open",
      unlockCost: UNLOCK_COSTS[args.urgencyLevel] ?? 3,
      createdAt: new Date().toISOString(),
    });
  },
});

// ─── Browse marketplace leads (agent side — contact details masked) ───────────
export const getMarketplaceLeads = query({
  args: {
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
    if (!user) return [];

    // Agents only — must have a profile
    const profile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) return [];

    const rawLeads = await ctx.db
      .query("marketplace_leads")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(50);

    // JS-level filters (no extra DB round trips needed for these)
    const filtered = rawLeads.filter((lead) => {
      if (lead.userId === user._id) return false;
      if (args.destinationFilter && lead.destinationCountry !== args.destinationFilter)
        return false;
      if (args.urgencyFilter && lead.urgencyLevel !== args.urgencyFilter)
        return false;
      return true;
    });

    // Batch resolve unlock status — Promise.all, never sequential await
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

    return filtered.map((lead, i) => {
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
          unlockedAt: unlock.unlockedAt,
          creditsSpent: unlock.creditsSpent,
          applicantName: submitter?.name ?? "Applicant",
          applicantEmail: submitter?.email ?? null,
          applicantPhone: submitter?.phone ?? null,
        };
      }

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
        unlockedAt: null,
        creditsSpent: null,
        applicantName: "Verified Applicant",
        applicantEmail: null,
        applicantPhone: null,
      };
    });
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

    // Atomic: deduct balance and record unlock in the same transaction
    await Promise.all([
      ctx.db.patch(profile._id, { creditBalance: balance - cost }),
      ctx.db.insert("marketplace_lead_unlocks", {
        leadId: args.leadId,
        agentUserId: user._id,
        creditsSpent: cost,
        unlockedAt: now,
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
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("marketplace_leads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
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
    ]);

    return { newBalance };
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
