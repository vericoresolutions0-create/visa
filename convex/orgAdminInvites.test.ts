/// <reference types="vite/client" />
// Build-queue item #24: multiple admins per organisation. org_members
// already supported many rows per org at the schema level (used by the
// notification fan-out in items #19-23) — the real gap was that there was
// no way to CREATE a second admin. This is the security-sensitive one the
// founder specifically flagged needing the same rigor as employee invites:
// unguessable token, real expiry, masked-email preview, email-match on
// accept, and — new to this feature — a hard floor of at least one admin
// per org at all times (an org with zero admins is permanently locked out,
// no self-service way back in).
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedOrg(t: ReturnType<typeof convexTest>, name = "Test Org") {
  const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: `admin-${Math.random()}@example.com`, name: "Admin" }));
  const organizationId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name, type: "employer", approvalStatus: "approved",
      createdByUserId: adminUserId, createdAt: new Date().toISOString(),
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.insert("org_members", { organizationId, userId: adminUserId, orgRole: "org_admin", joinedAt: new Date().toISOString() }),
  );
  return { adminUserId, organizationId };
}

const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

async function seedAdminInvite(
  t: ReturnType<typeof convexTest>,
  organizationId: Id<"organizations">,
  adminUserId: Id<"users">,
  invitedEmail: string,
  opts: { status?: "pending" | "accepted" | "declined" | "revoked"; expiresAt?: string } = {},
) {
  const token = "tok-" + Math.random();
  const id = await t.run(async (ctx) =>
    ctx.db.insert("org_admin_invites", {
      organizationId, invitedEmail, token,
      status: opts.status ?? "pending",
      invitedByUserId: adminUserId,
      createdAt: new Date().toISOString(),
      expiresAt: opts.expiresAt ?? FUTURE,
    }),
  );
  return { id, token };
}

describe("orgAdminInvites.inviteCoAdmin", () => {
  test("an org admin can invite a real colleague", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId } = await seedOrg(t);
    const asAdmin = t.withIdentity({ subject: adminUserId });

    const result = await asAdmin.mutation(api.orgAdminInvites.inviteCoAdmin, { email: "colleague@example.com" });
    expect(result.token).toBeTruthy();

    const invite = await asAdmin.query(api.orgAdminInvites.getAdminInviteByToken, { token: result.token });
    expect(invite?.status).toBe("pending");
  });

  test("someone with no org membership at all cannot invite a co-admin", async () => {
    const t = convexTest(schema, modules);
    const outsiderId = await t.run(async (ctx) => ctx.db.insert("users", { email: "outsider@example.com" }));
    await expect(
      t.withIdentity({ subject: outsiderId }).mutation(api.orgAdminInvites.inviteCoAdmin, { email: "colleague@example.com" }),
    ).rejects.toThrow();
  });

  test("a plain org_member (not org_admin) cannot invite a co-admin", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedOrg(t);
    const memberUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "member@example.com" }));
    await t.run(async (ctx) =>
      ctx.db.insert("org_members", { organizationId, userId: memberUserId, orgRole: "org_member", joinedAt: new Date().toISOString() }),
    );
    await expect(
      t.withIdentity({ subject: memberUserId }).mutation(api.orgAdminInvites.inviteCoAdmin, { email: "colleague@example.com" }),
    ).rejects.toThrow();
  });

  test("cannot invite yourself", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId } = await seedOrg(t);
    const asAdmin = t.withIdentity({ subject: adminUserId });
    const self = await t.run(async (ctx) => ctx.db.get(adminUserId));
    await expect(asAdmin.mutation(api.orgAdminInvites.inviteCoAdmin, { email: self!.email! })).rejects.toThrow();
  });

  test("cannot double-invite the same email while an invite is still pending", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId } = await seedOrg(t);
    const asAdmin = t.withIdentity({ subject: adminUserId });
    await asAdmin.mutation(api.orgAdminInvites.inviteCoAdmin, { email: "colleague@example.com" });
    await expect(asAdmin.mutation(api.orgAdminInvites.inviteCoAdmin, { email: "colleague@example.com" })).rejects.toThrow(/pending/i);
  });
});

describe("orgAdminInvites.acceptAdminInvite — real security checks", () => {
  test("happy path: a brand-new user accepting gains real admin access", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, "Acme Corp");
    const { token } = await seedAdminInvite(t, organizationId, adminUserId, "newadmin@example.com");
    const newAdminId = await t.run(async (ctx) => ctx.db.insert("users", { email: "newadmin@example.com" }));

    await t.withIdentity({ subject: newAdminId }).mutation(api.orgAdminInvites.acceptAdminInvite, { token });

    // Real proof of access, not just a status flag: this admin-only action
    // must now succeed for the newly-accepted user.
    await expect(
      t.withIdentity({ subject: newAdminId }).mutation(api.organizations.renameOrganization, { name: "Acme Corp Ltd" }),
    ).resolves.not.toThrow();
  });

  test("rejects a wrong-account accept even if the caller is authenticated", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const { token } = await seedAdminInvite(t, organizationId, adminUserId, "newadmin@example.com");
    const wrongUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "someone-else@example.com" }));

    await expect(
      t.withIdentity({ subject: wrongUserId }).mutation(api.orgAdminInvites.acceptAdminInvite, { token }),
    ).rejects.toThrow(/different email/i);
  });

  test("rejects an expired invite", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const { token } = await seedAdminInvite(t, organizationId, adminUserId, "newadmin@example.com", { expiresAt: PAST });
    const newAdminId = await t.run(async (ctx) => ctx.db.insert("users", { email: "newadmin@example.com" }));

    await expect(
      t.withIdentity({ subject: newAdminId }).mutation(api.orgAdminInvites.acceptAdminInvite, { token }),
    ).rejects.toThrow(/expired/i);
  });

  test("rejects an already-accepted invite from being accepted twice", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const { token } = await seedAdminInvite(t, organizationId, adminUserId, "newadmin@example.com", { status: "accepted" });
    const newAdminId = await t.run(async (ctx) => ctx.db.insert("users", { email: "newadmin@example.com" }));

    await expect(
      t.withIdentity({ subject: newAdminId }).mutation(api.orgAdminInvites.acceptAdminInvite, { token }),
    ).rejects.toThrow();
  });

  test("a user already admin of a DIFFERENT org cannot accept — the one-user-one-org invariant holds", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId: orgAAdmin, organizationId: orgA } = await seedOrg(t, "Org A");
    const { organizationId: orgB } = await seedOrg(t, "Org B");
    const { token } = await seedAdminInvite(t, orgB, orgAAdmin, "orgaadmin-doesnt-matter@example.com");

    // orgAAdmin already belongs to Org A — re-point the invite's email to
    // match their real account so the email-match check passes and we're
    // actually testing the membership-conflict check, not that one.
    const orgAAdminDoc = await t.run(async (ctx) => ctx.db.get(orgAAdmin));
    await t.run(async (ctx) => {
      const invite = await ctx.db.query("org_admin_invites").withIndex("by_token", (q) => q.eq("token", token)).unique();
      await ctx.db.patch(invite!._id, { invitedEmail: orgAAdminDoc!.email!.toLowerCase() });
    });

    await expect(
      t.withIdentity({ subject: orgAAdmin }).mutation(api.orgAdminInvites.acceptAdminInvite, { token }),
    ).rejects.toThrow(/already linked/i);
  });

  test("a plain org_member of the SAME org accepting is promoted in place, not duplicated", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const memberUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "member@example.com" }));
    const membershipId = await t.run(async (ctx) =>
      ctx.db.insert("org_members", { organizationId, userId: memberUserId, orgRole: "org_member", joinedAt: new Date().toISOString() }),
    );
    const { token } = await seedAdminInvite(t, organizationId, adminUserId, "member@example.com");

    await t.withIdentity({ subject: memberUserId }).mutation(api.orgAdminInvites.acceptAdminInvite, { token });

    const membership = await t.run(async (ctx) => ctx.db.get(membershipId));
    expect(membership?.orgRole).toBe("org_admin");
    const allMemberships = await t.run(async (ctx) =>
      ctx.db.query("org_members").withIndex("by_user", (q) => q.eq("userId", memberUserId)).collect(),
    );
    expect(allMemberships).toHaveLength(1); // promoted in place, not a duplicate row
  });
});

describe("orgAdminInvites.declineAdminInvite", () => {
  test("happy path marks the invite declined and grants no access", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const { token } = await seedAdminInvite(t, organizationId, adminUserId, "newadmin@example.com");
    const newAdminId = await t.run(async (ctx) => ctx.db.insert("users", { email: "newadmin@example.com" }));

    await t.withIdentity({ subject: newAdminId }).mutation(api.orgAdminInvites.declineAdminInvite, { token });

    await expect(
      t.withIdentity({ subject: newAdminId }).mutation(api.organizations.renameOrganization, { name: "x" }),
    ).rejects.toThrow();
  });
});

describe("orgAdminInvites.revokeAdminInvite — cross-org isolation", () => {
  test("an admin can revoke their own org's pending invite", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const { id } = await seedAdminInvite(t, organizationId, adminUserId, "colleague@example.com");

    await t.withIdentity({ subject: adminUserId }).mutation(api.orgAdminInvites.revokeAdminInvite, { inviteId: id });
    const invite = await t.run(async (ctx) => ctx.db.get(id));
    expect(invite?.status).toBe("revoked");
  });

  test("an admin of a DIFFERENT org cannot revoke someone else's invite", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId: ownerAdmin, organizationId: orgA } = await seedOrg(t, "Org A");
    const { adminUserId: otherAdmin } = await seedOrg(t, "Org B");
    const { id } = await seedAdminInvite(t, orgA, ownerAdmin, "colleague@example.com");

    await expect(
      t.withIdentity({ subject: otherAdmin }).mutation(api.orgAdminInvites.revokeAdminInvite, { inviteId: id }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("orgAdminInvites.removeCoAdmin — the last-admin floor", () => {
  test("an admin can remove another admin", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const secondAdminId = await t.run(async (ctx) => ctx.db.insert("users", { email: "second@example.com" }));
    await t.run(async (ctx) =>
      ctx.db.insert("org_members", { organizationId, userId: secondAdminId, orgRole: "org_admin", joinedAt: new Date().toISOString() }),
    );

    await t.withIdentity({ subject: adminUserId }).mutation(api.orgAdminInvites.removeCoAdmin, { userId: secondAdminId });

    await expect(
      t.withIdentity({ subject: secondAdminId }).mutation(api.organizations.renameOrganization, { name: "x" }),
    ).rejects.toThrow();
  });

  test("cannot remove the last remaining admin — even themselves", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId } = await seedOrg(t);

    await expect(
      t.withIdentity({ subject: adminUserId }).mutation(api.orgAdminInvites.removeCoAdmin, { userId: adminUserId }),
    ).rejects.toThrow(/at least one admin/i);
  });

  test("cannot remove someone who isn't an admin of your organisation", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId } = await seedOrg(t, "Org A");
    const { adminUserId: otherOrgAdmin } = await seedOrg(t, "Org B");

    await expect(
      t.withIdentity({ subject: adminUserId }).mutation(api.orgAdminInvites.removeCoAdmin, { userId: otherOrgAdmin }),
    ).rejects.toThrow(/not.*admin/i);
  });

  test("with 3 admins, removing one down to 2 succeeds and neither remaining admin lost access", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const second = await t.run(async (ctx) => ctx.db.insert("users", { email: "second@example.com" }));
    const third = await t.run(async (ctx) => ctx.db.insert("users", { email: "third@example.com" }));
    await t.run(async (ctx) => {
      await ctx.db.insert("org_members", { organizationId, userId: second, orgRole: "org_admin", joinedAt: new Date().toISOString() });
      await ctx.db.insert("org_members", { organizationId, userId: third, orgRole: "org_admin", joinedAt: new Date().toISOString() });
    });

    await t.withIdentity({ subject: adminUserId }).mutation(api.orgAdminInvites.removeCoAdmin, { userId: third });

    const list = await t.withIdentity({ subject: second }).query(api.orgAdminInvites.listMyOrgAdmins, {});
    expect(list.admins.map((a) => a.userId).sort()).toEqual([adminUserId, second].sort());
  });
});

describe("orgAdminInvites.listMyOrgAdmins", () => {
  test("reports the caller correctly via isYou, and lists pending invites separately from admins", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    await seedAdminInvite(t, organizationId, adminUserId, "pending-colleague@example.com");

    const list = await t.withIdentity({ subject: adminUserId }).query(api.orgAdminInvites.listMyOrgAdmins, {});
    expect(list.admins).toHaveLength(1);
    expect(list.admins[0].isYou).toBe(true);
    expect(list.pendingInvites).toHaveLength(1);
    expect(list.pendingInvites[0].invitedEmail).toBe("pending-colleague@example.com");
  });
});
