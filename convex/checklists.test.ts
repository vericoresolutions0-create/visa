/// <reference types="vite/client" />
// updateTripDetails (Multi-Trip Manager) was UI-gated to Pro+ via a disabled
// <fieldset> (canUseMultiTripManager, src/lib/plan-gates.ts) but the mutation
// itself never re-checked plan server-side — a free-plan user calling it
// directly bypassed the paywall entirely. This proves the gate now blocks
// free plans and still works for Pro/Expert, without breaking ownership
// enforcement.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedChecklist(t: ReturnType<typeof convexTest>, plan: "free" | "pro" | "expert") {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: `${plan}@example.com`, plan }));
  const checklistId = await t.run(async (ctx) => ctx.db.insert("saved_checklists", {
    userId,
    origin: "Nigeria",
    destination: "United Kingdom",
    visaType: "Skilled Worker",
    checkedItems: [],
    title: "My UK Trip",
    progress: 0,
    savedAt: new Date().toISOString(),
  }));
  return { userId, checklistId };
}

describe("checklists.updateTripDetails — Multi-Trip Manager is really Pro+, not just UI-hidden", () => {
  test("a free-plan user is rejected server-side, not just hidden client-side", async () => {
    const t = convexTest(schema, modules);
    const { userId, checklistId } = await seedChecklist(t, "free");

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.checklists.updateTripDetails, {
        id: checklistId,
        tripName: "Renamed Trip",
      }),
    ).rejects.toThrow(/Pro plan/);
  });

  test("a pro-plan user can edit their own trip", async () => {
    const t = convexTest(schema, modules);
    const { userId, checklistId } = await seedChecklist(t, "pro");

    await t.withIdentity({ subject: userId }).mutation(api.checklists.updateTripDetails, {
      id: checklistId,
      tripName: "Renamed Trip",
    });
    const doc = await t.run(async (ctx) => ctx.db.get(checklistId));
    expect(doc?.tripName).toBe("Renamed Trip");
  });

  test("an expert-plan user can edit their own trip", async () => {
    const t = convexTest(schema, modules);
    const { userId, checklistId } = await seedChecklist(t, "expert");

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.checklists.updateTripDetails, {
        id: checklistId,
        notes: "Interview scheduled",
      }),
    ).resolves.not.toThrow();
  });

  test("a pro-plan user still cannot edit someone else's trip", async () => {
    const t = convexTest(schema, modules);
    const { checklistId } = await seedChecklist(t, "pro");
    const otherUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "other@example.com", plan: "pro" }));

    await expect(
      t.withIdentity({ subject: otherUserId }).mutation(api.checklists.updateTripDetails, {
        id: checklistId,
        tripName: "Hijacked",
      }),
    ).rejects.toThrow(/don't have access/);
  });
});
