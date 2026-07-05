import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";

// One user, one org membership for v1 — keeps isolation reasoning simple.
// Multi-org membership (an HR consultant managing several client companies)
// is a real future need but out of scope now.
export async function getMyOrgAdminMembershipOrThrow(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  const membership = await ctx.db
    .query("org_members")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  if (!membership || membership.orgRole !== "org_admin") {
    throw new ConvexError({ code: "FORBIDDEN", message: "You don't have an employer account for this action" });
  }
  return { organizationId: membership.organizationId, user, membership };
}

// Shared by createOrganization (employer, the v1 default) and
// household.ts's createHousehold (type: "household") — the body is
// otherwise identical, so this is a plain helper rather than two
// near-duplicate mutations.
export async function createOrganizationImpl(
  ctx: MutationCtx,
  args: { name: string; type: "employer" | "household" },
) {
  const user = await getCurrentUserOrThrow(ctx);
  if (!args.name.trim() || args.name.length > 200) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: args.type === "household"
        ? "Household name is required and must be under 200 characters."
        : "Company name is required and must be under 200 characters.",
    });
  }

  const existing = await ctx.db
    .query("org_members")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  if (existing) {
    const existingOrg = await ctx.db.get(existing.organizationId);
    const existingType = existingOrg?.type ?? "employer";
    throw new ConvexError({
      code: "ALREADY_MEMBER",
      message: existingType === "household"
        ? "Your account is already linked to a household. Multi-membership isn't supported yet."
        : "Your account is already linked to an employer organisation. Multi-membership isn't supported yet.",
    });
  }

  const organizationId = await ctx.db.insert("organizations", {
    name: args.name.trim(),
    type: args.type,
    createdByUserId: user._id,
    createdAt: new Date().toISOString(),
  });
  await ctx.db.insert("org_members", {
    organizationId,
    userId: user._id,
    orgRole: "org_admin",
    joinedAt: new Date().toISOString(),
  });
  return organizationId;
}

export const createOrganization = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => createOrganizationImpl(ctx, { name: args.name, type: "employer" }),
});

export const getMyOrganization = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const membership = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!membership) return null;
    const org = await ctx.db.get(membership.organizationId);
    if (!org) return null;
    return { _id: org._id, name: org.name, type: org.type, orgRole: membership.orgRole };
  },
});
