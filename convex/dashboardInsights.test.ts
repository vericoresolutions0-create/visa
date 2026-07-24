/// <reference types="vite/client" />
// Regression coverage for the "no_data" vs. a false 100/100 Travel Health
// Score: a brand-new Pro user with zero vault documents, reminders, or
// checklists was previously scored a perfect 100 with "Everything is in
// order" — indistinguishable from a real all-clear, when really the app had
// simply never seen any of their data.
import { convexTest, TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type T = TestConvex<typeof schema>;

async function seedUser(t: T, plan: "free" | "pro" | "expert") {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", { email: `user-${Math.random()}@example.com`, plan }),
  );
}

async function seedStorageId(t: T) {
  return await t.run(async (ctx) => ctx.storage.store(new Blob([new Uint8Array(10)], { type: "application/pdf" })));
}

describe("dashboardInsights.getTravelHealth", () => {
  test("free-plan users get locked, not a score", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "free");

    const result = await t.withIdentity({ subject: userId }).query(api.dashboardInsights.getTravelHealth, {});
    expect(result).toBe("locked");
  });

  test("a Pro user with zero documents, reminders, or checklists gets no_data, not a false 100", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "pro");

    const result = await t.withIdentity({ subject: userId }).query(api.dashboardInsights.getTravelHealth, {});
    expect(result).toBe("no_data");
  });

  test("a Pro user with a real expired document gets a real reduced score and a real action", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "pro");
    const storageId = await seedStorageId(t);
    await t.run(async (ctx) =>
      ctx.db.insert("vault_documents", {
        userId,
        category: "identity",
        label: "Old Passport",
        storageId,
        fileName: "old-passport.pdf",
        fileSize: 1000,
        mimeType: "application/pdf",
        expiryDate: "2020-01-01",
        uploadedAt: new Date().toISOString(),
      }),
    );

    const result = await t.withIdentity({ subject: userId }).query(api.dashboardInsights.getTravelHealth, {});
    expect(result).not.toBe("no_data");
    expect(result).not.toBe("locked");
    if (result && result !== "locked" && result !== "no_data") {
      expect(result.score).toBeLessThan(100);
      expect(result.actions.some((a) => a.label.includes("Old Passport has expired"))).toBe(true);
    }
  });

  test("a Pro user with only a fully-complete checklist still gets a real score, not no_data", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "pro");
    await t.run(async (ctx) =>
      ctx.db.insert("saved_checklists", {
        userId,
        origin: "Nigeria",
        destination: "United Kingdom",
        visaType: "Skilled Worker",
        checkedItems: [],
        title: "UK Skilled Worker",
        tripName: "UK Skilled Worker",
        progress: 100,
        archived: false,
        savedAt: new Date().toISOString(),
      }),
    );

    const result = await t.withIdentity({ subject: userId }).query(api.dashboardInsights.getTravelHealth, {});
    expect(result).not.toBe("no_data");
    expect(result).not.toBe("locked");
    if (result && result !== "locked" && result !== "no_data") {
      expect(result.score).toBe(100);
      expect(result.actions).toHaveLength(0);
    }
  });
});
