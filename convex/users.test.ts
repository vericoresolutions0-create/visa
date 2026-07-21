/// <reference types="vite/client" />
// The dashboard's Trip Timeline countdown used to live only in localStorage
// under a single global key — didn't survive a device switch, and leaked
// between accounts on a shared computer. tripTargetDate makes it a real
// per-user field instead.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("users.setTripTargetDate — a real per-user field, not localStorage", () => {
  test("setting a date persists it on the user's own record", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "traveller@example.com" }));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.users.setTripTargetDate, { date: "2026-12-01" });
    const user = await asUser.query(api.users.getCurrentUser, {});
    expect(user?.tripTargetDate).toBe("2026-12-01");
  });

  test("omitting the date clears it", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "traveller@example.com" }));
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.users.setTripTargetDate, { date: "2026-12-01" });
    await asUser.mutation(api.users.setTripTargetDate, { date: undefined });
    const user = await asUser.query(api.users.getCurrentUser, {});
    expect(user?.tripTargetDate).toBeUndefined();
  });

  test("rejects a malformed date instead of silently storing garbage", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "traveller@example.com" }));
    const asUser = t.withIdentity({ subject: userId });

    await expect(
      asUser.mutation(api.users.setTripTargetDate, { date: "not-a-date" }),
    ).rejects.toThrow(/Invalid date/);
  });
});
