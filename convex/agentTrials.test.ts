/// <reference types="vite/client" />
// Regression coverage for the agent trial expiry warning fix (2026-07-24):
// trials previously lapsed with zero proactive notice — the only signal was
// a passive in-app dashboard banner. internalListActiveTrials is the query
// the new daily dispatcher (agentTrialDispatch.ts) reads from; this proves
// it returns exactly the right set with the right daysLeft math, since a
// wrong day count would mean warnings fire on the wrong day or never.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedTrialUser(
  t: ReturnType<typeof convexTest>,
  plan: "agent_listing" | "agent_featured" | "agency_white_label",
  daysFromNow: number | null, // null = no trial at all
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: `agent-${Math.random()}@example.com`,
      name: "Test Agent",
      agentPlan: undefined,
      agentTrialPlan: daysFromNow === null ? undefined : plan,
      agentTrialExpiresAt:
        daysFromNow === null
          ? undefined
          : new Date(Date.now() + daysFromNow * 86_400_000).toISOString(),
    }),
  );
}

describe("agentTrials.internalListActiveTrials", () => {
  test("includes a trial expiring in exactly 7 days with daysLeft: 7", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedTrialUser(t, "agent_featured", 7);

    const active = await t.run(async (ctx) =>
      ctx.runQuery(internal.agentTrials.internalListActiveTrials, {}),
    );

    const mine = active.find((a) => a.userId === userId);
    expect(mine).toBeDefined();
    expect(mine!.daysLeft).toBe(7);
    expect(mine!.plan).toBe("agent_featured");
  });

  test("excludes a user with no trial at all", async () => {
    const t = convexTest(schema, modules);
    await seedTrialUser(t, "agent_listing", null);

    const active = await t.run(async (ctx) =>
      ctx.runQuery(internal.agentTrials.internalListActiveTrials, {}),
    );

    expect(active).toHaveLength(0);
  });

  test("excludes a trial that already expired", async () => {
    const t = convexTest(schema, modules);
    await seedTrialUser(t, "agent_listing", -1);

    const active = await t.run(async (ctx) =>
      ctx.runQuery(internal.agentTrials.internalListActiveTrials, {}),
    );

    expect(active).toHaveLength(0);
  });

  test("a trial expiring in 15 days is included but would not match the 7/3/1 warning thresholds", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedTrialUser(t, "agency_white_label", 15);

    const active = await t.run(async (ctx) =>
      ctx.runQuery(internal.agentTrials.internalListActiveTrials, {}),
    );

    const mine = active.find((a) => a.userId === userId);
    expect(mine).toBeDefined();
    expect([7, 3, 1]).not.toContain(mine!.daysLeft);
  });
});

describe("notifications.createAgentNotification", () => {
  test("creates a real in-app notification for a user with an active agent plan", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "agent@example.com", agentPlan: "agent_featured" }),
    );

    await t.run(async (ctx) =>
      ctx.runMutation(internal.notifications.createAgentNotification, {
        userId,
        type: "agent_trial_expiring",
        title: "Trial ending in 7 days",
        body: "Test body",
        linkTo: "/agents/dashboard",
      }),
    );

    const notifications = await t
      .withIdentity({ subject: userId })
      .query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("agent_trial_expiring");
  });

  test("creates a real notification for a TRIAL-ONLY agent (no paid agentPlan) — regression test for a real bug caught against a live backend", async () => {
    // A trial-only agent has agentTrialPlan set but agentPlan undefined —
    // that's the normal state for the entire duration of a trial, not an
    // edge case. The first version of this gate checked agentPlan alone and
    // silently dropped every trial-only agent's notification — caught by
    // seeding a real trial user against a live local Convex backend and
    // finding zero rows where one was expected, not by this test suite
    // (the original test above only covered the paid-agentPlan case).
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "trial-only-agent@example.com",
        agentTrialPlan: "agent_featured",
        agentTrialExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      }),
    );

    await t.run(async (ctx) =>
      ctx.runMutation(internal.notifications.createAgentNotification, {
        userId,
        type: "agent_trial_expiring",
        title: "Trial ending in 7 days",
        body: "Test body",
        linkTo: "/agents/dashboard",
      }),
    );

    const notifications = await t
      .withIdentity({ subject: userId })
      .query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
  });

  test("silently skips a user with no active agent plan (e.g. downgraded since the row was scanned)", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "noplan@example.com" }),
    );

    await t.run(async (ctx) =>
      ctx.runMutation(internal.notifications.createAgentNotification, {
        userId,
        type: "agent_trial_expiring",
        title: "Should not be created",
        body: "Test body",
      }),
    );

    const all = await t.run(async (ctx) => ctx.db.query("in_app_notifications").collect());
    expect(all).toHaveLength(0);
  });
});
