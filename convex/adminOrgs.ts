import { ConvexError, v } from "convex/values";
import { requireAdmin, logAdminAction } from "./admin.ts";
import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Capped rather than a full-table collect(): at large scale, organizations
// (employer accounts + households, both created by end users) can grow
// into the thousands, and this is an admin oversight list, not something
// that needs every row at once — most-recent-first with a real cap keeps
// this page fast regardless of how many users the platform has.
const MAX_ORGS = 200;

export const listOrganizations = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const orgs = await ctx.db.query("organizations").order("desc").take(MAX_ORGS);

    return await Promise.all(
      orgs.map(async (org) => {
        const [members, links, creator] = await Promise.all([
          ctx.db.query("org_members").withIndex("by_org", (q) => q.eq("organizationId", org._id)).take(500),
          ctx.db.query("org_employee_links").withIndex("by_org", (q) => q.eq("organizationId", org._id)).take(1000),
          ctx.db.get(org.createdByUserId),
        ]);
        return {
          _id: org._id,
          name: org.name,
          type: org.type ?? "employer",
          createdAt: org.createdAt,
          memberCount: members.length,
          pendingCount: links.filter((l) => l.status === "pending").length,
          acceptedCount: links.filter((l) => l.status === "accepted").length,
          declinedCount: links.filter((l) => l.status === "declined").length,
          revokedCount: links.filter((l) => l.status === "revoked").length,
          // Households never went through review — see schema comment on
          // organizations.approvalStatus for why a missing value on a real
          // business org means "created before this gate existed", not
          // pending.
          approvalStatus: org.type === "household" ? "approved" : (org.approvalStatus ?? "approved"),
          creatorEmail: creator?.email ?? null,
          creatorName: creator?.name ?? null,
        };
      }),
    );
  },
});

async function requireOrg(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const org = await ctx.db.get(organizationId);
  if (!org) throw new ConvexError({ code: "NOT_FOUND", message: "Organisation not found." });
  return org;
}

export const approveOrganization = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const org = await requireOrg(ctx, args.organizationId);
    await ctx.db.patch(args.organizationId, { approvalStatus: "approved" });
    await logAdminAction(ctx, admin, "org_approved", args.organizationId, org.name);

    const creator = await ctx.db.get(org.createdByUserId);
    if (creator?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.orgApprovalDecision.sendOrgApprovalDecisionEmail, {
        to: creator.email,
        orgName: org.name,
        decision: "approved",
      });
    }
  },
});

export const rejectOrganization = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const org = await requireOrg(ctx, args.organizationId);
    await ctx.db.patch(args.organizationId, { approvalStatus: "rejected" });
    await logAdminAction(ctx, admin, "org_rejected", args.organizationId, org.name);

    const creator = await ctx.db.get(org.createdByUserId);
    if (creator?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.orgApprovalDecision.sendOrgApprovalDecisionEmail, {
        to: creator.email,
        orgName: org.name,
        decision: "rejected",
      });
    }
  },
});
