/// <reference types="vite/client" />
// Regression test for a real gap found during a founder-requested Quick
// Actions audit (2026-07-19): the European Tracker's "Renewal Document
// Readiness" checklist was localStorage-only — no Convex mutation at all —
// so it never synced across devices and was wiped by clearing browser
// storage. This proves the real replacement: server-owned toggle (immune to
// a client-diffed full-array overwrite race), scoped per user, and that a
// second toggle call never silently duplicates or drops an entry.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", { email: `user-${Math.random()}@example.com` }));
}

describe("euRenewalChecklist — real, account-scoped, race-safe persistence", () => {
  test("a fresh user has an empty checklist, not undefined/null", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);

    const checked = await t.withIdentity({ subject: userId }).query(api.euRenewalChecklist.getMyEuRenewalChecklist, {});
    expect(checked).toEqual([]);
  });

  test("checking an item persists it, and it's still there on the next read", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const identity = t.withIdentity({ subject: userId });

    await identity.mutation(api.euRenewalChecklist.toggleEuRenewalDocument, { documentId: "passport", checked: true });

    const checked = await identity.query(api.euRenewalChecklist.getMyEuRenewalChecklist, {});
    expect(checked).toEqual(["passport"]);
  });

  test("unchecking an item removes only that item, leaving siblings untouched", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const identity = t.withIdentity({ subject: userId });

    await identity.mutation(api.euRenewalChecklist.toggleEuRenewalDocument, { documentId: "passport", checked: true });
    await identity.mutation(api.euRenewalChecklist.toggleEuRenewalDocument, { documentId: "permit", checked: true });
    await identity.mutation(api.euRenewalChecklist.toggleEuRenewalDocument, { documentId: "passport", checked: false });

    const checked = await identity.query(api.euRenewalChecklist.getMyEuRenewalChecklist, {});
    expect(checked).toEqual(["permit"]);
  });

  test("checking the same item twice doesn't duplicate it", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const identity = t.withIdentity({ subject: userId });

    await identity.mutation(api.euRenewalChecklist.toggleEuRenewalDocument, { documentId: "passport", checked: true });
    await identity.mutation(api.euRenewalChecklist.toggleEuRenewalDocument, { documentId: "passport", checked: true });

    const checked = await identity.query(api.euRenewalChecklist.getMyEuRenewalChecklist, {});
    expect(checked).toEqual(["passport"]);
  });

  test("checklists are scoped per user — one user's checked items are invisible to another", async () => {
    const t = convexTest(schema, modules);
    const userA = await seedUser(t);
    const userB = await seedUser(t);

    await t.withIdentity({ subject: userA }).mutation(api.euRenewalChecklist.toggleEuRenewalDocument, { documentId: "passport", checked: true });

    const checkedB = await t.withIdentity({ subject: userB }).query(api.euRenewalChecklist.getMyEuRenewalChecklist, {});
    expect(checkedB).toEqual([]);
  });

  test("rejects an empty or oversized document id", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const identity = t.withIdentity({ subject: userId });

    await expect(
      identity.mutation(api.euRenewalChecklist.toggleEuRenewalDocument, { documentId: "", checked: true }),
    ).rejects.toThrow();
    await expect(
      identity.mutation(api.euRenewalChecklist.toggleEuRenewalDocument, { documentId: "x".repeat(101), checked: true }),
    ).rejects.toThrow();
  });
});
