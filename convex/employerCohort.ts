import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.js";
import { internal } from "./_generated/api";
import { getMyOrgAdminMembershipOrThrow } from "./organizations.ts";
import { assertNotSuspended } from "./authHelpers.ts";

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function getOwnedLinkOrThrow(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  linkId: Id<"org_employee_links">,
) {
  const link = await ctx.db.get(linkId);
  if (!link) throw new ConvexError({ code: "NOT_FOUND", message: "Invite not found" });
  if (link.organizationId !== organizationId) {
    throw new ConvexError({ code: "FORBIDDEN", message: "This invite doesn't belong to your organisation" });
  }
  return link;
}

export const inviteEmployee = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const { organizationId, user } = await getMyOrgAdminMembershipOrThrow(ctx);
    assertNotSuspended(user);
    const email = args.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter a valid email address." });
    }

    const existingLinks = await ctx.db
      .query("org_employee_links")
      .withIndex("by_org_email", (q) => q.eq("organizationId", organizationId).eq("invitedEmail", email))
      .take(10);
    if (existingLinks.some((l) => l.status === "pending" || l.status === "accepted")) {
      throw new ConvexError({ code: "ALREADY_INVITED", message: "This person already has an active invite or is already linked." });
    }

    const allOrgLinks = await ctx.db
      .query("org_employee_links")
      .withIndex("by_org_email", (q) => q.eq("organizationId", organizationId))
      .take(501);
    if (allOrgLinks.filter((l) => l.status === "pending" || l.status === "accepted").length >= 500) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Organisation has reached the maximum of 500 members." });
    }

    const org = await ctx.db.get(organizationId);
    const token = generateToken();
    await ctx.db.insert("org_employee_links", {
      organizationId,
      invitedEmail: email,
      token,
      status: "pending",
      invitedByUserId: user._id,
      pipelineStage: "invited",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await ctx.scheduler.runAfter(0, internal.emails.employerInvite.sendEmployerInviteEmail, {
      to: email,
      orgName: org?.name ?? "an employer",
      orgType: org?.type,
      token,
    });
    return { token };
  },
});

export const resendInvite = mutation({
  args: { linkId: v.id("org_employee_links") },
  handler: async (ctx, args) => {
    const { organizationId, user } = await getMyOrgAdminMembershipOrThrow(ctx);
    assertNotSuspended(user);
    const link = await getOwnedLinkOrThrow(ctx, organizationId, args.linkId);
    if (link.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invite is no longer pending." });
    }
    const org = await ctx.db.get(organizationId);
    await ctx.scheduler.runAfter(0, internal.emails.employerInvite.sendEmployerInviteEmail, {
      to: link.invitedEmail,
      orgName: org?.name ?? "an employer",
      orgType: org?.type,
      token: link.token,
    });
  },
});

export const revokeInvite = mutation({
  args: { linkId: v.id("org_employee_links") },
  handler: async (ctx, args) => {
    const { organizationId } = await getMyOrgAdminMembershipOrThrow(ctx);
    const link = await getOwnedLinkOrThrow(ctx, organizationId, args.linkId);
    if (link.status !== "pending" && link.status !== "accepted") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invite can't be revoked from its current state." });
    }
    await ctx.db.patch(link._id, { status: "revoked", revokedAt: new Date().toISOString() });
  },
});

export const updateEmployeeDetails = mutation({
  args: {
    linkId: v.id("org_employee_links"),
    department: v.optional(v.string()),
    roleTitle: v.optional(v.string()),
    targetRelocationDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getMyOrgAdminMembershipOrThrow(ctx);
    await getOwnedLinkOrThrow(ctx, organizationId, args.linkId);
    if (args.department !== undefined && args.department.length > 200) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Field value too long (max 200 characters)." });
    }
    if (args.roleTitle !== undefined && args.roleTitle.length > 200) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Field value too long (max 200 characters)." });
    }
    if (args.targetRelocationDate !== undefined && args.targetRelocationDate.length > 20) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid date value." });
    }
    await ctx.db.patch(args.linkId, {
      department: args.department,
      roleTitle: args.roleTitle,
      targetRelocationDate: args.targetRelocationDate,
    });
  },
});

export const setPipelineStage = mutation({
  args: {
    linkId: v.id("org_employee_links"),
    pipelineStage: v.union(
      v.literal("invited"),
      v.literal("accepted"),
      v.literal("in_progress"),
      v.literal("ready"),
      v.literal("relocated"),
    ),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getMyOrgAdminMembershipOrThrow(ctx);
    await getOwnedLinkOrThrow(ctx, organizationId, args.linkId);
    await ctx.db.patch(args.linkId, { pipelineStage: args.pipelineStage });
  },
});

export const addEmployeeNote = mutation({
  args: { linkId: v.id("org_employee_links"), note: v.string() },
  handler: async (ctx, args) => {
    const { organizationId, user } = await getMyOrgAdminMembershipOrThrow(ctx);
    await getOwnedLinkOrThrow(ctx, organizationId, args.linkId);
    if (!args.note.trim() || args.note.length > 2000) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Note can't be empty and must be under 2000 characters." });
    }
    await ctx.db.insert("org_employee_notes", {
      linkId: args.linkId,
      organizationId,
      authorUserId: user._id,
      note: args.note.trim(),
      createdAt: new Date().toISOString(),
    });
  },
});

export const listEmployeeNotes = query({
  args: { linkId: v.id("org_employee_links") },
  handler: async (ctx, args) => {
    const { organizationId } = await getMyOrgAdminMembershipOrThrow(ctx);
    await getOwnedLinkOrThrow(ctx, organizationId, args.linkId);
    return await ctx.db
      .query("org_employee_notes")
      .withIndex("by_link", (q) => q.eq("linkId", args.linkId))
      .order("desc")
      .take(100);
  },
});

function bucketReadiness(progress: number): "Ready" | "Needs Attention" | "Not Started" {
  if (progress <= 0) return "Not Started";
  if (progress >= 90) return "Ready";
  return "Needs Attention";
}

export const listMyCohort = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getMyOrgAdminMembershipOrThrow(ctx);
    // Raised from 1000 as a safe near-term stopgap — a real university
    // pilot tracking its full international student body could plausibly
    // exceed 1000 over time, and this query silently drops anything past
    // its cap with no pagination, no error, no visible sign anything's
    // missing. 5000 removes any realistic near-term risk; if a real org
    // ever approaches that, this needs proper cursor-based pagination
    // (the same paginationOptsValidator pattern already used for the
    // marketplace leads list) plus denormalized stat counters instead of
    // computing Total/Active/Invited/Completed from the full fetched set —
    // not worth building against a scale nobody's hit yet.
    const links = await ctx.db
      .query("org_employee_links")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(5000);

    return await Promise.all(
      links.map(async (link) => {
        const noteCount = (
          await ctx.db.query("org_employee_notes").withIndex("by_link", (q) => q.eq("linkId", link._id)).take(100)
        ).length;

        const base = {
          linkId: link._id,
          invitedEmail: link.invitedEmail,
          status: link.status,
          department: link.department,
          roleTitle: link.roleTitle,
          targetRelocationDate: link.targetRelocationDate,
          pipelineStage: link.pipelineStage,
          createdAt: link.createdAt,
          noteCount,
          employeeName: null as string | null,
          readinessPercent: null as number | null,
          employerVisibleStatus: null as "Ready" | "Needs Attention" | "Not Started" | null,
        };

        // The real enforcement point: only an *accepted* link with a
        // linked checklist ever resolves employee data. A status that was
        // accepted in the past but is now declined/revoked must never keep
        // surfacing readiness — this branch checks current status, not
        // whether employeeUserId happens to be set.
        if (link.status !== "accepted" || !link.employeeUserId || !link.linkedChecklistId) {
          return base;
        }

        const [employee, checklist] = await Promise.all([
          ctx.db.get(link.employeeUserId),
          ctx.db.get(link.linkedChecklistId),
        ]);
        if (!checklist) return base;

        return {
          ...base,
          employeeName: employee?.name ?? null,
          readinessPercent: checklist.progress,
          employerVisibleStatus: bucketReadiness(checklist.progress),
        };
      }),
    );
  },
});
