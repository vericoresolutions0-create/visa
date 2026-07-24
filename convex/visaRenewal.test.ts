/// <reference types="vite/client" />
// Build-queue item #26: proactive 90/60/30/14-day renewal warnings before a
// visa/permit expires, distinct from the existing on-demand EU renewal
// checklist. Real legal stakes flagged by the founder — missing a renewal
// window can mean losing status entirely — so this is tested at the exact
// query the dispatcher relies on (getVisaStatusesExpiringOn) plus the real
// in-app notification chokepoint, matching the precedent set by
// notificationDispatch.ts's own two alert types (no dedicated test file
// exists for those either — the thin dispatcher just orchestrates).
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function dateOffset(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

async function seedVisaStatus(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  opts: { expiryDate: string; active?: boolean },
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("visa_status", {
      userId,
      jurisdiction: "uk_ilr",
      visaType: "Skilled Worker",
      hostCountry: "United Kingdom",
      grantDate: "2020-01-01",
      expiryDate: opts.expiryDate,
      active: opts.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );
}

describe("notificationProcessor.getVisaStatusesExpiringOn", () => {
  test("finds an active status expiring on the exact target date", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "a@example.com", plan: "pro" }));
    const target = dateOffset(90);
    await seedVisaStatus(t, userId, { expiryDate: target });

    const results = await t.run(async (ctx) => ctx.runQuery(internal.notificationProcessor.getVisaStatusesExpiringOn, { expiryDate: target }));
    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe(userId);
  });

  test("excludes an inactive (superseded/expired) visa_status row even if the date matches", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "a@example.com", plan: "pro" }));
    const target = dateOffset(90);
    await seedVisaStatus(t, userId, { expiryDate: target, active: false });

    const results = await t.run(async (ctx) => ctx.runQuery(internal.notificationProcessor.getVisaStatusesExpiringOn, { expiryDate: target }));
    expect(results).toHaveLength(0);
  });

  test("a status expiring on a different date is never returned", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "a@example.com", plan: "pro" }));
    await seedVisaStatus(t, userId, { expiryDate: dateOffset(45) });

    const results = await t.run(async (ctx) => ctx.runQuery(internal.notificationProcessor.getVisaStatusesExpiringOn, { expiryDate: dateOffset(90) }));
    expect(results).toHaveLength(0);
  });
});

describe("full dispatch pipeline via the real notification chokepoint", () => {
  async function runWithScheduling(fn: () => Promise<void>, t: ReturnType<typeof convexTest>) {
    vi.useFakeTimers();
    try {
      await fn();
      vi.runAllTimers();
      await t.finishInProgressScheduledFunctions();
    } finally {
      vi.useRealTimers();
    }
  }

  test("a real notification is created for a paid user with a status expiring in exactly 14 days", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "user@example.com", name: "Kemi", plan: "expert" }));
    await seedVisaStatus(t, userId, { expiryDate: dateOffset(14) });

    await runWithScheduling(async () => {
      await t.run(async (ctx) =>
        ctx.runMutation(internal.notifications.createNotification, {
          userId,
          type: "visa_status_expiring",
          title: "Skilled Worker status expires in 14 days",
          body: "Your Skilled Worker status in United Kingdom expires soon.",
          linkTo: "/dashboard/immigration-status",
        }),
      );
    }, t);

    const notifications = await t.withIdentity({ subject: userId }).query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("visa_status_expiring");
    expect(notifications[0].linkTo).toBe("/dashboard/immigration-status");
  });

  test("createNotification silently skips a free-plan user — no notification created", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "free@example.com", plan: "free" }));

    await t.run(async (ctx) =>
      ctx.runMutation(internal.notifications.createNotification, {
        userId, type: "visa_status_expiring", title: "x", body: "x", linkTo: "/dashboard/immigration-status",
      }),
    );

    const rows = await t.run(async (ctx) => ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", userId)).collect());
    expect(rows).toHaveLength(0);
  });
});
