import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";

// Public, no-auth — never returns organizationId or any employee data, only
// enough to show the employee what they're being asked to respond to.
export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db.query("org_employee_links").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!link) return null;
    const org = await ctx.db.get(link.organizationId);
    return {
      organizationName: org?.name ?? "an employer",
      organizationType: org?.type ?? "employer",
      invitedEmail: link.invitedEmail,
      status: link.status,
    };
  },
});

export const acceptInvite = mutation({
  args: { token: v.string(), linkedChecklistId: v.optional(v.id("saved_checklists")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const link = await ctx.db.query("org_employee_links").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!link) throw new ConvexError({ code: "NOT_FOUND", message: "This invite link is invalid." });
    if (link.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invite is no longer pending." });
    }
    if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
      throw new ConvexError({ code: "EXPIRED", message: "This invite has expired. Ask the sender to resend it." });
    }
    if (!user.email || user.email.toLowerCase() !== link.invitedEmail) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This invite was sent to a different email address — please sign in with that email to respond.",
      });
    }

    if (args.linkedChecklistId) {
      const checklist = await ctx.db.get(args.linkedChecklistId);
      if (!checklist || checklist.userId !== user._id) {
        throw new ConvexError({ code: "FORBIDDEN", message: "That checklist doesn't belong to your account." });
      }
    }

    await ctx.db.patch(link._id, {
      status: "accepted",
      employeeUserId: user._id,
      linkedChecklistId: args.linkedChecklistId,
      pipelineStage: "accepted",
      respondedAt: new Date().toISOString(),
    });
  },
});

export const declineInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const link = await ctx.db.query("org_employee_links").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!link) throw new ConvexError({ code: "NOT_FOUND", message: "This invite link is invalid." });
    if (link.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invite is no longer pending." });
    }
    if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
      throw new ConvexError({ code: "EXPIRED", message: "This invite has expired. Ask the sender to resend it." });
    }
    if (!user.email || user.email.toLowerCase() !== link.invitedEmail) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This invite was sent to a different email address — please sign in with that email to respond.",
      });
    }
    await ctx.db.patch(link._id, { status: "declined", respondedAt: new Date().toISOString() });
  },
});

// The employee's own "who's linked to me" view — scoped by their own
// identity, not by an org, so it's safe without an org-admin check.
export const listMyEmployerLinks = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.email) return [];

    const byEmployeeId = await ctx.db.query("org_employee_links").withIndex("by_employee_user", (q) => q.eq("employeeUserId", user._id)).collect();
    const byEmail = await ctx.db.query("org_employee_links").withIndex("by_invited_email", (q) => q.eq("invitedEmail", user.email!.toLowerCase())).collect();
    const pendingByEmail = byEmail.filter((l) => l.status === "pending");

    const links = [...byEmployeeId, ...pendingByEmail.filter((l) => !byEmployeeId.some((b) => b._id === l._id))];
    return await Promise.all(
      links.map(async (link) => {
        const org = await ctx.db.get(link.organizationId);
        return {
          linkId: link._id,
          organizationName: org?.name ?? "an employer",
          status: link.status,
          createdAt: link.createdAt,
        };
      }),
    );
  },
});

// Employee-initiated disconnect — basic data-subject-rights hygiene, not
// just an employer-side revoke. Works from "accepted" only.
export const leaveOrganization = mutation({
  args: { linkId: v.id("org_employee_links") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new ConvexError({ code: "NOT_FOUND", message: "Link not found." });
    if (link.employeeUserId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "This link doesn't belong to your account." });
    }
    if (link.status !== "accepted") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This link is not currently active." });
    }
    await ctx.db.patch(link._id, { status: "revoked", revokedAt: new Date().toISOString() });
  },
});
