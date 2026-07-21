/// <reference types="vite/client" />
// New B2B orgs (employer/university/law_firm) now go through manual admin
// review before any org-admin action works — see the comment on
// getMyOrgAdminMembershipOrThrow. These tests prove the gate actually
// blocks real actions (not just a UI label), that households are exempt,
// and that pre-existing rows with no approvalStatus field are grandfathered
// in as approved rather than retroactively locked out.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createUser(t: ReturnType<typeof convexTest>, email: string) {
  return await t.run(async (ctx) => ctx.db.insert("users", { email }));
}

describe("organizations — new business orgs start pending review", () => {
  test("createOrganization sets a new employer org to approvalStatus \"pending\"", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "founder@acme.com");
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.organizations.createOrganization, { name: "Acme Logistics Ltd", orgType: "employer" });
    const myOrg = await asUser.query(api.organizations.getMyOrganization, {});

    expect(myOrg?.approvalStatus).toBe("pending");
  });

  test("a pending org's admin cannot rename it — the gate blocks a real action, not just a label", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "founder@acme.com");
    const asUser = t.withIdentity({ subject: userId });
    await asUser.mutation(api.organizations.createOrganization, { name: "Acme Logistics Ltd", orgType: "employer" });

    await expect(
      asUser.mutation(api.organizations.renameOrganization, { name: "Acme Logistics Global Ltd" }),
    ).rejects.toThrow(/awaiting review/);
  });

  test("after admin approval, the same org-admin action succeeds", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "founder@acme.com");
    const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "admin@visaclear.app", role: "admin" }));
    const asUser = t.withIdentity({ subject: userId });
    const asAdmin = t.withIdentity({ subject: adminUserId });

    await asUser.mutation(api.organizations.createOrganization, { name: "Acme Logistics Ltd", orgType: "employer" });
    const myOrg = await asUser.query(api.organizations.getMyOrganization, {});
    await asAdmin.mutation(api.adminOrgs.approveOrganization, { organizationId: myOrg!._id });

    await expect(
      asUser.mutation(api.organizations.renameOrganization, { name: "Acme Logistics Global Ltd" }),
    ).resolves.not.toThrow();
    const updated = await asUser.query(api.organizations.getMyOrganization, {});
    expect(updated?.approvalStatus).toBe("approved");
    expect(updated?.name).toBe("Acme Logistics Global Ltd");
  });

  test("after admin rejection, org-admin actions are blocked with a distinct reason", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "founder@acme.com");
    const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "admin@visaclear.app", role: "admin" }));
    const asUser = t.withIdentity({ subject: userId });
    const asAdmin = t.withIdentity({ subject: adminUserId });

    await asUser.mutation(api.organizations.createOrganization, { name: "Acme Logistics Ltd", orgType: "employer" });
    const myOrg = await asUser.query(api.organizations.getMyOrganization, {});
    await asAdmin.mutation(api.adminOrgs.rejectOrganization, { organizationId: myOrg!._id });

    await expect(
      asUser.mutation(api.organizations.renameOrganization, { name: "New Name" }),
    ).rejects.toThrow(/wasn't approved/);
  });

  test("households skip review entirely — the org-admin action works immediately", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "family@example.com");
    const asUser = t.withIdentity({ subject: userId });
    const organizationId = await t.run(async (ctx) => ctx.db.insert("organizations", {
      name: "The Owusu Household",
      type: "household",
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
    }));
    await t.run(async (ctx) => ctx.db.insert("org_members", {
      organizationId,
      userId,
      orgRole: "org_admin",
      joinedAt: new Date().toISOString(),
    }));

    await expect(
      asUser.mutation(api.organizations.renameOrganization, { name: "The Owusu Family" }),
    ).resolves.not.toThrow();
  });

  test("a legacy org row with no approvalStatus field is grandfathered in as approved, not locked out", async () => {
    const t = convexTest(schema, modules);
    const userId = await createUser(t, "old-customer@acme.com");
    const asUser = t.withIdentity({ subject: userId });
    // Deliberately omits approvalStatus — simulates a row created before
    // this field existed in the schema.
    const organizationId = await t.run(async (ctx) => ctx.db.insert("organizations", {
      name: "Old Customer Ltd",
      type: "employer",
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
    }));
    await t.run(async (ctx) => ctx.db.insert("org_members", {
      organizationId,
      userId,
      orgRole: "org_admin",
      joinedAt: new Date().toISOString(),
    }));

    const myOrg = await asUser.query(api.organizations.getMyOrganization, {});
    expect(myOrg?.approvalStatus).toBe("approved");
    await expect(
      asUser.mutation(api.organizations.renameOrganization, { name: "Old Customer Global Ltd" }),
    ).resolves.not.toThrow();
  });
});
