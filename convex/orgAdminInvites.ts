import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow, assertNotSuspended } from "./authHelpers.ts";
import { internal } from "./_generated/api";
import { getMyOrgAdminMembershipOrThrow } from "./organizations.ts";

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const visible = local.length > 2 ? local[0] + "*".repeat(Math.min(local.length - 1, 5)) : local[0] + "*";
  return `${visible}@${domain}`;
}

// ─── Invite a colleague as a co-admin ────────────────────────────────────────
export const inviteCoAdmin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const { organizationId, user } = await getMyOrgAdminMembershipOrThrow(ctx);
    assertNotSuspended(user);
    const email = args.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter a valid email address." });
    }
    if (user.email && email === user.email.toLowerCase()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "You're already an admin of this organisation." });
    }

    const existingInvites = await ctx.db
      .query("org_admin_invites")
      .withIndex("by_org_email", (q) => q.eq("organizationId", organizationId).eq("invitedEmail", email))
      .take(10);
    if (existingInvites.some((i) => i.status === "pending")) {
      throw new ConvexError({ code: "ALREADY_INVITED", message: "This person already has a pending admin invite." });
    }

    const org = await ctx.db.get(organizationId);
    const token = generateToken();
    await ctx.db.insert("org_admin_invites", {
      organizationId,
      invitedEmail: email,
      token,
      status: "pending",
      invitedByUserId: user._id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await ctx.scheduler.runAfter(0, internal.emails.orgAdminInvite.sendOrgAdminInviteEmail, {
      to: email,
      inviterName: user.name ?? user.email ?? "A colleague",
      orgName: org?.name ?? "an organisation",
      token,
    });
    return { token };
  },
});

// ─── Revoke a still-pending admin invite ─────────────────────────────────────
export const revokeAdminInvite = mutation({
  args: { inviteId: v.id("org_admin_invites") },
  handler: async (ctx, args) => {
    const { organizationId, user } = await getMyOrgAdminMembershipOrThrow(ctx);
    assertNotSuspended(user);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.organizationId !== organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Invite not found." });
    }
    if (invite.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invite is no longer pending." });
    }
    await ctx.db.patch(args.inviteId, { status: "revoked", respondedAt: new Date().toISOString() });
  },
});

// ─── List current admins + pending invites for the caller's org ─────────────
export const listMyOrgAdmins = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId, user: caller } = await getMyOrgAdminMembershipOrThrow(ctx);
    const members = await ctx.db
      .query("org_members")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .take(200);
    const admins = members.filter((m) => m.orgRole === "org_admin");
    const admined = await Promise.all(
      admins.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return {
          userId: m.userId,
          name: u?.name ?? null,
          email: u?.email ?? null,
          joinedAt: m.joinedAt,
          isYou: m.userId === caller._id,
        };
      }),
    );

    const invites = await ctx.db
      .query("org_admin_invites")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(50);

    return {
      admins: admined,
      pendingInvites: invites
        .filter((i) => i.status === "pending")
        .map((i) => ({ _id: i._id, invitedEmail: i.invitedEmail, createdAt: i.createdAt })),
    };
  },
});

// ─── Remove an existing co-admin ─────────────────────────────────────────────
// Never allowed to drop an org to zero admins — that would permanently lock
// everyone out (no path back in without direct DB/support intervention),
// the exact failure mode a real "invite a colleague" feature exists to
// prevent, not create.
export const removeCoAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { organizationId, user } = await getMyOrgAdminMembershipOrThrow(ctx);
    assertNotSuspended(user);

    const members = await ctx.db
      .query("org_members")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .take(200);
    const admins = members.filter((m) => m.orgRole === "org_admin");
    const target = admins.find((m) => m.userId === args.userId);
    if (!target) {
      throw new ConvexError({ code: "NOT_FOUND", message: "This person isn't an admin of your organisation." });
    }
    if (admins.length <= 1) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "An organisation must always have at least one admin. Invite a replacement before removing the last one." });
    }
    await ctx.db.delete(target._id);
  },
});

// ─── Public, no-auth lookup for the accept/decline page ─────────────────────
export const getAdminInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db.query("org_admin_invites").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!invite) return null;
    const org = await ctx.db.get(invite.organizationId);
    const caller = await getCurrentUser(ctx);
    const isCorrectAccount = caller?.email ? caller.email.toLowerCase() === invite.invitedEmail : null;
    const isExpired = invite.status === "pending" && !!invite.expiresAt && invite.expiresAt <= new Date().toISOString();
    return {
      organizationName: org?.name ?? "an organisation",
      maskedEmail: maskEmail(invite.invitedEmail),
      isCorrectAccount,
      status: isExpired ? ("expired" as const) : invite.status,
    };
  },
});

// ─── Accept a co-admin invite ────────────────────────────────────────────────
export const acceptAdminInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const invite = await ctx.db.query("org_admin_invites").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!invite) throw new ConvexError({ code: "NOT_FOUND", message: "This invite link is invalid." });
    if (invite.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invite is no longer pending." });
    }
    if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) {
      throw new ConvexError({ code: "EXPIRED", message: "This invite has expired. Ask the sender to resend it." });
    }
    if (!user.email || user.email.toLowerCase() !== invite.invitedEmail) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This invite was sent to a different email address — please sign in with that email to respond.",
      });
    }

    // One user, one org membership (see organizations.ts createOrganizationImpl)
    // — the same real invariant every other org path relies on. Accepting a
    // second org's admin invite while already linked elsewhere would silently
    // break that assumption everywhere else in the codebase, so it's blocked
    // here exactly like createOrganizationImpl blocks a second
    // createOrganization call. The one exception: if the invited email is
    // already a *plain member* of THIS SAME org (e.g. a former employee-side
    // invite), this is a real promotion, not a conflict — upgrade in place
    // instead of rejecting a legitimate case.
    const existingMembership = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existingMembership && existingMembership.organizationId !== invite.organizationId) {
      throw new ConvexError({
        code: "ALREADY_MEMBER",
        message: "Your account is already linked to a different organisation. Leave it before accepting this invite.",
      });
    }

    if (existingMembership) {
      await ctx.db.patch(existingMembership._id, { orgRole: "org_admin" });
    } else {
      await ctx.db.insert("org_members", {
        organizationId: invite.organizationId,
        userId: user._id,
        orgRole: "org_admin",
        joinedAt: new Date().toISOString(),
      });
    }

    await ctx.db.patch(invite._id, { status: "accepted", respondedAt: new Date().toISOString() });
  },
});

export const declineAdminInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const invite = await ctx.db.query("org_admin_invites").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!invite) throw new ConvexError({ code: "NOT_FOUND", message: "This invite link is invalid." });
    if (invite.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This invite is no longer pending." });
    }
    if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) {
      throw new ConvexError({ code: "EXPIRED", message: "This invite has expired. Ask the sender to resend it." });
    }
    if (!user.email || user.email.toLowerCase() !== invite.invitedEmail) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This invite was sent to a different email address — please sign in with that email to respond.",
      });
    }
    await ctx.db.patch(invite._id, { status: "declined", respondedAt: new Date().toISOString() });
  },
});

