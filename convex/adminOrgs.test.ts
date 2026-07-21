/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedPendingOrg(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "founder@acme.com" }));
  const organizationId = await t.run(async (ctx) => ctx.db.insert("organizations", {
    name: "Acme Logistics Ltd",
    type: "employer",
    createdByUserId: userId,
    createdAt: new Date().toISOString(),
    approvalStatus: "pending" as const,
  }));
  await t.run(async (ctx) => ctx.db.insert("org_members", {
    organizationId, userId, orgRole: "org_admin", joinedAt: new Date().toISOString(),
  }));
  return { userId, organizationId };
}

describe("adminOrgs — approve/reject requires real admin access", () => {
  test("a non-admin cannot approve an organisation", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedPendingOrg(t);
    const otherUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "not-admin@example.com" }));

    await expect(
      t.withIdentity({ subject: otherUserId }).mutation(api.adminOrgs.approveOrganization, { organizationId }),
    ).rejects.toThrow(/Admin access required/);
  });

  test("a non-admin cannot reject an organisation", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedPendingOrg(t);
    const otherUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "not-admin@example.com" }));

    await expect(
      t.withIdentity({ subject: otherUserId }).mutation(api.adminOrgs.rejectOrganization, { organizationId }),
    ).rejects.toThrow(/Admin access required/);
  });

  test("an admin approving an organisation flips its status and is reflected in listOrganizations", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedPendingOrg(t);
    const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "admin@visaclear.app", role: "admin" }));
    const asAdmin = t.withIdentity({ subject: adminUserId });

    await asAdmin.mutation(api.adminOrgs.approveOrganization, { organizationId });
    const orgs = await asAdmin.query(api.adminOrgs.listOrganizations, {});
    const row = orgs.find((o) => o._id === organizationId);

    expect(row?.approvalStatus).toBe("approved");
    expect(row?.creatorEmail).toBe("founder@acme.com");
  });

  test("listOrganizations reports a pending org's status and creator up front", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedPendingOrg(t);
    const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "admin@visaclear.app", role: "admin" }));
    const asAdmin = t.withIdentity({ subject: adminUserId });

    const orgs = await asAdmin.query(api.adminOrgs.listOrganizations, {});
    const row = orgs.find((o) => o._id === organizationId);

    expect(row?.approvalStatus).toBe("pending");
    expect(row?.creatorEmail).toBe("founder@acme.com");
  });

  test("a household always reports approved, regardless of approvalStatus field", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "family@example.com" }));
    const organizationId = await t.run(async (ctx) => ctx.db.insert("organizations", {
      name: "The Owusu Household", type: "household", createdByUserId: userId, createdAt: new Date().toISOString(),
    }));
    const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "admin@visaclear.app", role: "admin" }));

    const orgs = await t.withIdentity({ subject: adminUserId }).query(api.adminOrgs.listOrganizations, {});
    const row = orgs.find((o) => o._id === organizationId);
    expect(row?.approvalStatus).toBe("approved");
  });
});
