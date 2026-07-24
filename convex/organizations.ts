import { ConvexError, v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrThrow, assertNotSuspended } from "./authHelpers.ts";
import { ORG_MEMBER_CAP, daysSince } from "./orgHelpers.ts";

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
  // Households skip review entirely. A missing approvalStatus on an older
  // business org means "created before this gate existed" — grandfathered
  // in as approved, never retroactively locked out.
  const organization = await ctx.db.get(membership.organizationId);
  if (organization && organization.type !== "household") {
    if (organization.approvalStatus === "pending") {
      throw new ConvexError({ code: "ORG_PENDING", message: "Your organisation is still awaiting review. You'll get an email as soon as it's approved." });
    }
    if (organization.approvalStatus === "rejected") {
      throw new ConvexError({ code: "ORG_REJECTED", message: "This organisation's application wasn't approved. Reply to your confirmation email if you think this is a mistake." });
    }
  }
  return { organizationId: membership.organizationId, user, membership };
}

// Shared by createOrganization (employer, the v1 default) and
// household.ts's createHousehold (type: "household") — the body is
// otherwise identical, so this is a plain helper rather than two
// near-duplicate mutations.
export async function createOrganizationImpl(
  ctx: MutationCtx,
  args: { name: string; type: "employer" | "household" | "university" | "law_firm" },
) {
  const user = await getCurrentUserOrThrow(ctx);
  assertNotSuspended(user);
  if (!args.name.trim() || args.name.length > 200) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: args.type === "household"
        ? "Household name is required and must be under 200 characters."
        : "Organisation name is required and must be under 200 characters.",
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
        : "Your account is already linked to an organisation. Multi-membership isn't supported yet.",
    });
  }

  const organizationId = await ctx.db.insert("organizations", {
    name: args.name.trim(),
    type: args.type,
    createdByUserId: user._id,
    createdAt: new Date().toISOString(),
    // Real B2B orgs start pending and go through a human review before
    // they can do anything (see getMyOrgAdminMembershipOrThrow). Households
    // are a personal-use feature riding the same table/invite machinery,
    // not a business account, so they skip review entirely.
    ...(args.type !== "household" ? { approvalStatus: "pending" as const } : {}),
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
  args: {
    name: v.string(),
    orgType: v.optional(v.union(v.literal("employer"), v.literal("university"), v.literal("law_firm"))),
  },
  handler: async (ctx, args) => createOrganizationImpl(ctx, { name: args.name, type: args.orgType ?? "employer" }),
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
    return {
      _id: org._id,
      name: org.name,
      type: org.type,
      orgRole: membership.orgRole,
      createdAt: org.createdAt,
      // Households and pre-review orgs both normalize to "approved" here —
      // see the schema comment on approvalStatus for why a missing value
      // means grandfathered-in rather than pending.
      approvalStatus: org.type === "household" ? "approved" : (org.approvalStatus ?? "approved"),
    };
  },
});

export const renameOrganization = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { organizationId, user } = await getMyOrgAdminMembershipOrThrow(ctx);
    assertNotSuspended(user);
    if (!args.name.trim() || args.name.length > 200) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Organisation name is required and must be under 200 characters.",
      });
    }
    await ctx.db.patch(organizationId, { name: args.name.trim() });
  },
});

// ─── Invite-your-next-hire nudge (orgNudgeDispatch.ts, weekly cron) ─────────
// One row per admin of an org that's gone quiet on inviting: no invite sent
// (of any status — even a declined one still counts as recent admin
// activity) in 30+ days, re-armed 30 days after the last nudge so this never
// fires weekly forever on an org that's simply done growing. Never household
// orgs — "invite your next hire" makes no sense for a family tracking their
// own relocation. Never a full cohort — no point nudging someone to invite
// when they're already at the cap.
export const internalListOrgsNeedingInviteNudge = internalQuery({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").take(2000);
    const targets: {
      organizationId: Id<"organizations">;
      orgName: string;
      orgType: string | undefined;
      adminUserId: Id<"users">;
      adminEmail: string;
      adminName: string | undefined;
    }[] = [];

    for (const org of orgs) {
      if (org.type === "household") continue;
      if (org.approvalStatus && org.approvalStatus !== "approved") continue;

      const links = await ctx.db
        .query("org_employee_links")
        .withIndex("by_org", (q) => q.eq("organizationId", org._id))
        .take(ORG_MEMBER_CAP + 1);
      const activeCount = links.filter((l) => l.status === "pending" || l.status === "accepted").length;
      if (activeCount >= ORG_MEMBER_CAP) continue;

      const mostRecentInviteAt = links.reduce<string | null>(
        (latest, l) => (!latest || l.createdAt > latest ? l.createdAt : latest),
        null,
      );
      const baseline = mostRecentInviteAt ?? org.createdAt;
      if (daysSince(baseline) < 30) continue;
      if (org.lastInviteNudgeSentAt && daysSince(org.lastInviteNudgeSentAt) < 30) continue;

      const admins = await ctx.db
        .query("org_members")
        .withIndex("by_org", (q) => q.eq("organizationId", org._id))
        .take(50);
      for (const admin of admins.filter((m) => m.orgRole === "org_admin")) {
        const adminUser = await ctx.db.get(admin.userId);
        if (!adminUser?.email) continue;
        targets.push({
          organizationId: org._id,
          orgName: org.name,
          orgType: org.type,
          adminUserId: admin.userId,
          adminEmail: adminUser.email,
          adminName: adminUser.name,
        });
      }
    }
    return targets;
  },
});

export const internalMarkInviteNudgeSent = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, { lastInviteNudgeSentAt: new Date().toISOString() });
  },
});
