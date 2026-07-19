/// <reference types="vite/client" />
// Founder asked for a real way to track vendor billing/plan checks (Vercel
// plan tier, Convex usage ceiling, domain renewal, etc.) that have no API to
// read from, plus real OpenAI spend where an actual API exists. This proves:
// the manual-check tracking genuinely persists and is admin-only, and the
// OpenAI spend action correctly gates on admin role before ever touching the
// "is it configured" question (so a non-admin can't even probe whether the
// key is set), then fails honestly (not silently/fake) when it isn't.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUser(t: ReturnType<typeof convexTest>, role: "user" | "admin" = "user") {
  return await t.run(async (ctx) => ctx.db.insert("users", { email: `user-${Math.random()}@example.com`, role }));
}

describe("vendorWatch — manual vendor-check tracking", () => {
  test("a fresh vendor list is empty", async () => {
    const t = convexTest(schema, modules);
    const adminId = await seedUser(t, "admin");

    const checks = await t.withIdentity({ subject: adminId }).query(api.vendorWatch.getVendorChecks, {});
    expect(checks).toEqual([]);
  });

  test("marking a vendor checked persists it, and a second check on a different vendor doesn't clobber the first", async () => {
    const t = convexTest(schema, modules);
    const adminId = await seedUser(t, "admin");
    const identity = t.withIdentity({ subject: adminId });

    await identity.mutation(api.vendorWatch.markVendorChecked, { vendorKey: "vercel_plan", note: "Confirmed on Pro plan" });
    await identity.mutation(api.vendorWatch.markVendorChecked, { vendorKey: "domain_renewal" });

    const checks = await identity.query(api.vendorWatch.getVendorChecks, {});
    expect(checks.length).toBe(2);
    const vercel = checks.find((c) => c.vendorKey === "vercel_plan");
    expect(vercel?.note).toBe("Confirmed on Pro plan");
    expect(vercel?.lastCheckedAt).toBeTruthy();
  });

  test("re-checking the same vendor updates lastCheckedAt in place rather than creating a duplicate row", async () => {
    const t = convexTest(schema, modules);
    const adminId = await seedUser(t, "admin");
    const identity = t.withIdentity({ subject: adminId });

    await identity.mutation(api.vendorWatch.markVendorChecked, { vendorKey: "resend_quota" });
    const first = (await identity.query(api.vendorWatch.getVendorChecks, {}))[0].lastCheckedAt;

    await new Promise((r) => setTimeout(r, 5));
    await identity.mutation(api.vendorWatch.markVendorChecked, { vendorKey: "resend_quota" });

    const checks = await identity.query(api.vendorWatch.getVendorChecks, {});
    expect(checks.length).toBe(1);
    expect(checks[0].lastCheckedAt).not.toBe(first);
  });

  test("a non-admin cannot read or write vendor checks", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "user");
    const identity = t.withIdentity({ subject: userId });

    await expect(identity.query(api.vendorWatch.getVendorChecks, {})).rejects.toThrow();
    await expect(identity.mutation(api.vendorWatch.markVendorChecked, { vendorKey: "vercel_plan" })).rejects.toThrow();
  });
});

describe("vendorWatch — OpenAI spend is real or honestly absent, never faked", () => {
  test("a non-admin is rejected before the action ever checks whether OpenAI is configured", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "user");

    await expect(
      t.withIdentity({ subject: userId }).action(api.vendorWatch.getOpenAiSpendThisMonth, {}),
    ).rejects.toThrow(/Admin access required/);
  });

  test("an admin gets a clear NOT_CONFIGURED error, not a fake number, when no Admin key is set", async () => {
    const t = convexTest(schema, modules);
    const adminId = await seedUser(t, "admin");

    await expect(
      t.withIdentity({ subject: adminId }).action(api.vendorWatch.getOpenAiSpendThisMonth, {}),
    ).rejects.toThrow(/No OpenAI Admin key set/);
  });

  test("isOpenAiAdminConfigured is admin-only and honestly reports false when unset", async () => {
    const t = convexTest(schema, modules);
    const adminId = await seedUser(t, "admin");
    const userId = await seedUser(t, "user");

    expect(await t.withIdentity({ subject: adminId }).query(api.vendorWatch.isOpenAiAdminConfigured, {})).toBe(false);
    await expect(t.withIdentity({ subject: userId }).query(api.vendorWatch.isOpenAiAdminConfigured, {})).rejects.toThrow();
  });
});
