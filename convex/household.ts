import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.js";
import { internal } from "./_generated/api";
import { getMyOrgAdminMembershipOrThrow, createOrganizationImpl } from "./organizations.ts";

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function getOwnedHouseholdLinkOrThrow(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  linkId: Id<"org_employee_links">,
) {
  const link = await ctx.db.get(linkId);
  if (!link) throw new ConvexError({ code: "NOT_FOUND", message: "Invite not found" });
  if (link.organizationId !== organizationId) {
    throw new ConvexError({ code: "FORBIDDEN", message: "This invite doesn't belong to your household" });
  }
  return link;
}

export const createHousehold = mutation({
  args: { name: v.string() },
  handler: async (ctx, args): Promise<Id<"organizations">> => {
    return await createOrganizationImpl(ctx, { name: args.name, type: "household" });
  },
});

export const inviteHouseholdMember = mutation({
  args: { email: v.string(), relationship: v.string() },
  handler: async (ctx, args): Promise<{ token: string }> => {
    const { organizationId, user } = await getMyOrgAdminMembershipOrThrow(ctx);
    const org = await ctx.db.get(organizationId);
    if (org?.type !== "household") {
      throw new ConvexError({ code: "FORBIDDEN", message: "This action is only available for households." });
    }

    const email = args.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter a valid email address." });
    }
    if (!args.relationship.trim() || args.relationship.length > 100) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please describe their relationship to you (e.g. Spouse) — max 100 characters." });
    }

    const existingLinks = await ctx.db
      .query("org_employee_links")
      .withIndex("by_org_email", (q) => q.eq("organizationId", organizationId).eq("invitedEmail", email))
      .collect();
    if (existingLinks.some((l) => l.status === "pending" || l.status === "accepted")) {
      throw new ConvexError({ code: "ALREADY_INVITED", message: "This person already has an active invite or is already linked." });
    }

    const token = generateToken();
    await ctx.db.insert("org_employee_links", {
      organizationId,
      invitedEmail: email,
      token,
      status: "pending",
      invitedByUserId: user._id,
      relationship: args.relationship.trim(),
      pipelineStage: "invited",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await ctx.scheduler.runAfter(0, internal.emails.householdInvite.sendHouseholdInviteEmail, {
      to: email,
      householdName: org?.name ?? "your family",
      token,
    });
    return { token };
  },
});

export const resendHouseholdInvite = mutation({
  args: { linkId: v.id("org_employee_links") },
  handler: async (ctx, args) => {
    const { organizationId } = await getMyOrgAdminMembershipOrThrow(ctx);
    const link = await getOwnedHouseholdLinkOrThrow(ctx, organizationId, args.linkId);
    if (link.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invite is no longer pending." });
    }
    const org = await ctx.db.get(organizationId);
    await ctx.scheduler.runAfter(0, internal.emails.householdInvite.sendHouseholdInviteEmail, {
      to: link.invitedEmail,
      householdName: org?.name ?? "your family",
      token: link.token,
    });
  },
});

export const revokeHouseholdInvite = mutation({
  args: { linkId: v.id("org_employee_links") },
  handler: async (ctx, args) => {
    const { organizationId } = await getMyOrgAdminMembershipOrThrow(ctx);
    const link = await getOwnedHouseholdLinkOrThrow(ctx, organizationId, args.linkId);
    if (link.status !== "pending" && link.status !== "accepted") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invite can't be revoked from its current state." });
    }
    await ctx.db.patch(link._id, { status: "revoked", revokedAt: new Date().toISOString() });
  },
});

export const listMyHousehold = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getMyOrgAdminMembershipOrThrow(ctx);
    const links = await ctx.db
      .query("org_employee_links")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .collect();

    return await Promise.all(
      links.map(async (link) => {
        const base = {
          linkId: link._id,
          invitedEmail: link.invitedEmail,
          status: link.status,
          relationship: link.relationship,
          createdAt: link.createdAt,
          memberName: null as string | null,
          readinessPercent: null as number | null,
        };

        if (link.status !== "accepted" || !link.employeeUserId || !link.linkedChecklistId) {
          return base;
        }

        const [member, checklist] = await Promise.all([
          ctx.db.get(link.employeeUserId),
          ctx.db.get(link.linkedChecklistId),
        ]);
        if (!checklist) return base;

        return { ...base, memberName: member?.name ?? null, readinessPercent: checklist.progress };
      }),
    );
  },
});
