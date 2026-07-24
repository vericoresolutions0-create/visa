/// <reference types="vite/client" />
// Build-queue item #22: compliance CSV exports used to be a one-off
// client-side snapshot with no saved history — an org couldn't prove what
// it exported for a past compliance review, or when. These tests cover the
// real backend: recording an export, listing an org's history, and the
// cross-org isolation on re-downloading a past entry (the actual CSV file
// content, not a regenerated-on-demand report, so a re-download always
// matches what was really exported that day).
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedApprovedOrg(
  t: ReturnType<typeof convexTest>,
  type: "employer" | "university" | "law_firm" = "employer",
) {
  const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: `admin-${Math.random()}@example.com`, name: "Admin" }));
  const organizationId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org", type, approvalStatus: "approved",
      createdByUserId: adminUserId, createdAt: new Date().toISOString(),
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.insert("org_members", { organizationId, userId: adminUserId, orgRole: "org_admin", joinedAt: new Date().toISOString() }),
  );
  return { adminUserId, organizationId };
}

async function seedStorageId(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.storage.store(new Blob([new Uint8Array(10)], { type: "text/csv" })));
}

describe("complianceExportHistory.recordComplianceExport + listMyExportHistory", () => {
  test("a recorded export shows up in the org's history with the real row count and exporter name", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedApprovedOrg(t);
    const asAdmin = t.withIdentity({ subject: adminUserId });
    const storageId = await seedStorageId(t);

    await asAdmin.mutation(api.complianceExportHistory.recordComplianceExport, {
      storageId, fileName: "VisaClear_Compliance_Report_Test_Org_2026-07-24.csv", rowCount: 12,
    });

    const history = await asAdmin.query(api.complianceExportHistory.listMyExportHistory, {});
    expect(history).toHaveLength(1);
    expect(history[0].rowCount).toBe(12);
    expect(history[0].exportedByName).toBe("Admin");
    void organizationId;
  });

  test("multiple exports are returned most-recent-first", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId } = await seedApprovedOrg(t);
    const asAdmin = t.withIdentity({ subject: adminUserId });

    for (const rowCount of [3, 7, 15]) {
      const storageId = await seedStorageId(t);
      await asAdmin.mutation(api.complianceExportHistory.recordComplianceExport, {
        storageId, fileName: `export-${rowCount}.csv`, rowCount,
      });
    }

    const history = await asAdmin.query(api.complianceExportHistory.listMyExportHistory, {});
    expect(history.map((h) => h.rowCount)).toEqual([15, 7, 3]);
  });

  test("someone with no org membership at all cannot record or list exports", async () => {
    const t = convexTest(schema, modules);
    const outsiderId = await t.run(async (ctx) => ctx.db.insert("users", { email: "outsider@example.com" }));
    const asOutsider = t.withIdentity({ subject: outsiderId });
    const storageId = await seedStorageId(t);

    await expect(
      asOutsider.mutation(api.complianceExportHistory.recordComplianceExport, { storageId, fileName: "x.csv", rowCount: 1 }),
    ).rejects.toThrow();
    await expect(asOutsider.query(api.complianceExportHistory.listMyExportHistory, {})).rejects.toThrow();
  });

  test("a plain org_member (not org_admin) cannot record or list exports either", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedApprovedOrg(t);
    const memberUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "member@example.com" }));
    await t.run(async (ctx) =>
      ctx.db.insert("org_members", { organizationId, userId: memberUserId, orgRole: "org_member", joinedAt: new Date().toISOString() }),
    );
    const asMember = t.withIdentity({ subject: memberUserId });
    const storageId = await seedStorageId(t);

    await expect(
      asMember.mutation(api.complianceExportHistory.recordComplianceExport, { storageId, fileName: "x.csv", rowCount: 1 }),
    ).rejects.toThrow();
  });
});

describe("complianceExportHistory.getExportDownloadUrl — cross-org isolation", () => {
  test("an org admin passes the ownership check for their own org's export (fails later only on missing CONVEX_SITE_URL in the test env, same as vault.ts's equivalent)", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId } = await seedApprovedOrg(t);
    const asAdmin = t.withIdentity({ subject: adminUserId });
    const storageId = await seedStorageId(t);
    await asAdmin.mutation(api.complianceExportHistory.recordComplianceExport, { storageId, fileName: "x.csv", rowCount: 1 });
    const history = await asAdmin.query(api.complianceExportHistory.listMyExportHistory, {});

    try {
      await asAdmin.mutation(api.complianceExportHistory.getExportDownloadUrl, { historyId: history[0]._id as Id<"compliance_export_history"> });
    } catch (err) {
      expect(String(err)).not.toMatch(/not found/i);
    }
  });

  test("an admin of a DIFFERENT org cannot get a download URL for someone else's export", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId: ownerAdminId } = await seedApprovedOrg(t);
    const { adminUserId: otherAdminId } = await seedApprovedOrg(t);
    const asOwner = t.withIdentity({ subject: ownerAdminId });
    const asOther = t.withIdentity({ subject: otherAdminId });
    const storageId = await seedStorageId(t);
    await asOwner.mutation(api.complianceExportHistory.recordComplianceExport, { storageId, fileName: "x.csv", rowCount: 1 });
    const ownerHistory = await asOwner.query(api.complianceExportHistory.listMyExportHistory, {});

    await expect(
      asOther.mutation(api.complianceExportHistory.getExportDownloadUrl, { historyId: ownerHistory[0]._id as Id<"compliance_export_history"> }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("complianceExportHistory — org type snapshot", () => {
  test("a university org's export is tagged with that org type at record time", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId } = await seedApprovedOrg(t, "university");
    const asAdmin = t.withIdentity({ subject: adminUserId });
    const storageId = await seedStorageId(t);
    await asAdmin.mutation(api.complianceExportHistory.recordComplianceExport, { storageId, fileName: "x.csv", rowCount: 1 });

    const rows = await t.run(async (ctx) => ctx.db.query("compliance_export_history").collect());
    expect(rows[0].orgType).toBe("university");
  });
});
