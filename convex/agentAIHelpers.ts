// Non-node helpers for the AI assistant — queries, mutations, and rate limiting.
// Kept separate from agentAI.ts because "use node" files may only export actions.

import { v, ConvexError } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { bumpStat } from "./platformStats.ts";

const AGENT_DAILY_LIMIT = 50;
const BUSINESS_DAILY_LIMIT = 30;
const MAX_CONTEXT_CLIENTS = 50;
const MAX_NOTE_LENGTH = 200;

// ── Rate limit enforcement ────────────────────────────────────────────────────

export const _incrementAIUsage = internalMutation({
  args: {
    userId: v.id("users"),
    mode: v.union(v.literal("agent"), v.literal("business")),
  },
  handler: async (ctx, args) => {
    const dateKey = new Date().toISOString().split("T")[0];
    const resource = `agent_ai_${args.mode}`;
    const limit = args.mode === "agent" ? AGENT_DAILY_LIMIT : BUSINESS_DAILY_LIMIT;

    const existing = await ctx.db
      .query("user_daily_usage")
      .withIndex("by_user_resource_date", (q) =>
        q.eq("userId", args.userId).eq("resource", resource).eq("dateKey", dateKey),
      )
      .unique();

    const current = existing?.count ?? 0;
    if (current >= limit) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: `You've used all ${limit} AI messages for today. Your allowance resets at midnight UTC.`,
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("user_daily_usage", {
        userId: args.userId,
        resource,
        dateKey,
        count: 1,
      });
    }

    // Keeps platform_stats.total{Agent,Business}AIMessages accurate so
    // convex/admin.ts's getAIUsage never has to sum the full (unboundedly
    // growing) user_daily_usage table just to report an all-time total.
    await bumpStat(ctx, args.mode === "agent" ? "totalAgentAIMessages" : "totalBusinessAIMessages", 1);

    return { used: current + 1, limit };
  },
});

// ── Agent context — only this agent's own clients, PII minimised ──────────────

export const _getAgentContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const agentProfile = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!agentProfile) return null;

    const intakes = await ctx.db
      .query("client_intakes")
      .withIndex("by_agent", (q) => q.eq("agentId", args.userId))
      .take(MAX_CONTEXT_CLIENTS);

    const active = intakes.filter((i) => !i.archived);

    const clients = await Promise.all(
      active.map(async (intake) => {
        const docCount = (
          await ctx.db
            .query("client_documents")
            .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
            .take(100)
        ).length;
        return {
          clientName: intake.clientName,
          destination: intake.destination,
          visaType: intake.visaType,
          status: intake.status,
          documentsUploaded: docCount,
          notes: intake.notes ? intake.notes.slice(0, MAX_NOTE_LENGTH) : null,
          createdAt: intake.createdAt,
        };
      }),
    );

    return {
      agentName: agentProfile.fullName,
      specialisations: agentProfile.specialisations,
      clients,
    };
  },
});

// ── Business context — only the calling admin's own org ──────────────────────

export const _getBizContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("orgRole"), "org_admin"))
      .first();
    if (!membership) return null;

    const org = await ctx.db.get(membership.organizationId);
    if (!org) return null;

    const links = await ctx.db
      .query("org_employee_links")
      .withIndex("by_org", (q) => q.eq("organizationId", membership.organizationId))
      .take(MAX_CONTEXT_CLIENTS);

    const active = links.filter(
      (l) => l.status === "pending" || l.status === "accepted",
    );

    const employees = await Promise.all(
      active.map(async (link) => {
        let readinessPercent: number | null = null;
        if (link.status === "accepted" && link.linkedChecklistId) {
          const checklist = await ctx.db.get(link.linkedChecklistId);
          readinessPercent = checklist?.progress ?? null;
        }
        return {
          invitedEmail: link.invitedEmail,
          status: link.status,
          department: link.department ?? null,
          roleTitle: link.roleTitle ?? null,
          pipelineStage: link.pipelineStage ?? null,
          readinessPercent,
        };
      }),
    );

    return { orgName: org.name, orgType: org.type ?? "employer", employees };
  },
});

// ── Usage meter for the UI ────────────────────────────────────────────────────

export const getUsage = query({
  args: { mode: v.union(v.literal("agent"), v.literal("business")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { used: 0, limit: AGENT_DAILY_LIMIT };

    const dateKey = new Date().toISOString().split("T")[0];
    const resource = `agent_ai_${args.mode}`;
    const limit = args.mode === "agent" ? AGENT_DAILY_LIMIT : BUSINESS_DAILY_LIMIT;

    const existing = await ctx.db
      .query("user_daily_usage")
      .withIndex("by_user_resource_date", (q) =>
        q.eq("userId", userId).eq("resource", resource).eq("dateKey", dateKey),
      )
      .unique();

    return { used: existing?.count ?? 0, limit };
  },
});
