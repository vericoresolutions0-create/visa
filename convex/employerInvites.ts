import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";
import { internal } from "./_generated/api";
import { memberNoun, ORG_READY_THRESHOLD } from "./orgHelpers.ts";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const visible = local.length > 2 ? local[0] + "*".repeat(Math.min(local.length - 1, 5)) : local[0] + "*";
  return `${visible}@${domain}`;
}

// Public, no-auth — returns only enough to show the invitee what they're
// responding to. The full invited email is NEVER returned; instead we return
// a masked address and, for authenticated callers, a server-side flag that
// says whether their signed-in account is the correct one. The real ownership
// check happens in acceptInvite/declineInvite — this is purely UX.
export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db.query("org_employee_links").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!link) return null;
    const org = await ctx.db.get(link.organizationId);
    const caller = await getCurrentUser(ctx);
    const isCorrectAccount = caller?.email
      ? caller.email.toLowerCase() === link.invitedEmail
      : null;
    // acceptInvite/declineInvite already reject an expired link — this
    // surfaces that up front instead of only after sign-in + checklist
    // selection, matching how invalid/revoked/declined links are already
    // shown immediately rather than discovered deep in the flow.
    const isExpired = link.status === "pending" && !!link.expiresAt && link.expiresAt <= new Date().toISOString();
    return {
      organizationName: org?.name ?? "an employer",
      organizationType: org?.type ?? "employer",
      maskedEmail: maskEmail(link.invitedEmail),
      isCorrectAccount,
      status: isExpired ? ("expired" as const) : link.status,
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

    let linkedChecklist: Doc<"saved_checklists"> | null = null;
    if (args.linkedChecklistId) {
      linkedChecklist = await ctx.db.get(args.linkedChecklistId);
      if (!linkedChecklist || linkedChecklist.userId !== user._id) {
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

    const org = await ctx.db.get(link.organizationId);
    const noun = memberNoun(org?.type);
    const singular = noun === "students" ? "student" : noun === "clients" ? "client" : "employee";
    await ctx.scheduler.runAfter(0, internal.notifications.createOrgAdminNotification, {
      organizationId: link.organizationId,
      type: "org_member_invite_accepted",
      title: "Invite accepted",
      body: `${user.name ?? link.invitedEmail} accepted your invite and joined as a ${singular}.`,
      linkTo: "/business/dashboard",
    });

    // Real gap this covers: checklists.ts's saveChecklist only notifies on
    // a *crossing* from below the Ready threshold to at/above it — but a
    // member who already finished their checklist before accepting the
    // invite (completed it first, then linked it here) never produces a
    // crossing for that mutation to see, since the org relationship didn't
    // exist yet when they crossed 90%. Caught via a real end-to-end run,
    // not reasoned about: an employee who saved a 100%-complete checklist
    // and then accepted the invite got the "invite accepted" notification
    // but never the "member ready" one. Firing it here too, gated on
    // linkedChecklist actually being ready right now, closes that gap.
    if (linkedChecklist && linkedChecklist.progress >= ORG_READY_THRESHOLD) {
      await ctx.scheduler.runAfter(0, internal.notifications.createOrgAdminNotification, {
        organizationId: link.organizationId,
        type: "org_member_ready",
        title: "A member is ready",
        body: `${user.name ?? link.invitedEmail} has completed their ${linkedChecklist.destination} ${linkedChecklist.visaType} checklist and is ready to relocate.`,
        linkTo: "/business/dashboard",
      });
    }
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

    const byEmployeeId = await ctx.db.query("org_employee_links").withIndex("by_employee_user", (q) => q.eq("employeeUserId", user._id)).take(50);
    const byEmail = await ctx.db.query("org_employee_links").withIndex("by_invited_email", (q) => q.eq("invitedEmail", user.email!.toLowerCase())).take(50);
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
