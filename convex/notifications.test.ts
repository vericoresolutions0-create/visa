/// <reference types="vite/client" />
// Regression test: markAllRead only checked isPaid(user.plan), never
// user.agentPlan — unlike getMyNotifications and getUnreadCount right above
// it in the same file, which both correctly check both. The result: every
// agent's "Mark all read" button in the notification bell was a silent
// no-op — it returned successfully (no error shown) but never touched a
// single row, so the unread badge could never be cleared in bulk.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUserWithUnread(
  t: ReturnType<typeof convexTest>,
  overrides: { plan?: "free" | "pro" | "expert"; agentPlan?: "agent_listing" | "agent_featured" | "agency_white_label" },
) {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: `user-${Math.random()}@example.com`,
      plan: overrides.plan,
      agentPlan: overrides.agentPlan,
    }),
  );
  await t.run(async (ctx) => {
    for (let i = 0; i < 3; i++) {
      await ctx.db.insert("in_app_notifications", {
        userId,
        type: "marketplace_lead_alert",
        title: `Notification ${i}`,
        body: "Body",
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  });
  return userId;
}

describe("notifications visibility for trial-only agents (2026-07-24 fix)", () => {
  test("a trial-only agent (agentTrialPlan set, no paid agentPlan) can see and count their own notifications", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "trial-agent@example.com",
        agentTrialPlan: "agent_listing",
        agentTrialExpiresAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      }),
    );
    await t.run(async (ctx) =>
      ctx.db.insert("in_app_notifications", {
        userId,
        type: "agent_trial_expiring",
        title: "Trial ending in 3 days",
        body: "Body",
        read: false,
        createdAt: new Date().toISOString(),
      }),
    );

    expect(await t.withIdentity({ subject: userId }).query(api.notifications.getUnreadCount, {})).toBe(1);
    expect(await t.withIdentity({ subject: userId }).query(api.notifications.getMyNotifications, {})).toHaveLength(1);
  });

  test("an agent whose trial already expired (and has no paid plan) sees nothing, same as before any trial existed", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "expired-trial-agent@example.com",
        agentTrialPlan: "agent_listing",
        agentTrialExpiresAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      }),
    );

    expect(await t.withIdentity({ subject: userId }).query(api.notifications.getUnreadCount, {})).toBe(0);
  });
});

describe("notifications.markAllRead", () => {
  test("an agent (agentPlan set, no consumer plan) can actually clear their unread notifications", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserWithUnread(t, { agentPlan: "agent_listing" });

    expect(await t.withIdentity({ subject: userId }).query(api.notifications.getUnreadCount, {})).toBe(3);

    await t.withIdentity({ subject: userId }).mutation(api.notifications.markAllRead, {});

    expect(await t.withIdentity({ subject: userId }).query(api.notifications.getUnreadCount, {})).toBe(0);
  });

  test("a paid consumer (plan set, no agentPlan) can still clear their unread notifications", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserWithUnread(t, { plan: "pro" });

    await t.withIdentity({ subject: userId }).mutation(api.notifications.markAllRead, {});

    expect(await t.withIdentity({ subject: userId }).query(api.notifications.getUnreadCount, {})).toBe(0);
  });

  test("a free user with neither a paid plan nor an agent plan sees no notifications to begin with", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUserWithUnread(t, {});

    // Consistent with getMyNotifications/getUnreadCount's own gating —
    // markAllRead is a no-op here, but there was nothing to mark anyway.
    expect(await t.withIdentity({ subject: userId }).query(api.notifications.getUnreadCount, {})).toBe(0);
    await t.withIdentity({ subject: userId }).mutation(api.notifications.markAllRead, {});
    const stillUnread = await t.run(async (ctx) =>
      ctx.db.query("in_app_notifications").withIndex("by_user_read", (q) => q.eq("userId", userId).eq("read", false)).collect(),
    );
    expect(stillUnread).toHaveLength(3); // never surfaced to the user, so left untouched
  });
});
