/// <reference types="vite/client" />
// Regression coverage for the payout-status notification fix (2026-07-24):
// processPayoutRequest previously updated payout_requests.status silently —
// an agent had no way to know their request was even looked at short of
// checking back on their own dashboard.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedAdmin(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", { email: "admin@visaclear.app", role: "admin" }));
}

async function seedAgentWithPendingPayout(t: ReturnType<typeof convexTest>, amountCents = 5000) {
  return await t.run(async (ctx) => {
    const agentUserId = await ctx.db.insert("users", { email: "payee-agent@example.com", agentPlan: "agent_featured" });
    const requestId = await ctx.db.insert("payout_requests", {
      agentUserId,
      amountCents,
      status: "pending",
      requestedAt: new Date().toISOString(),
    });
    return { agentUserId, requestId };
  });
}

describe("admin.processPayoutRequest — payout-status notification", () => {
  test("marking a payout as paid notifies the agent with the real amount", async () => {
    const t = convexTest(schema, modules);
    const adminUserId = await seedAdmin(t);
    const { agentUserId, requestId } = await seedAgentWithPendingPayout(t, 5000);

    await t.withIdentity({ subject: adminUserId }).mutation(api.admin.processPayoutRequest, {
      requestId,
      decision: "paid",
    });

    const notifications = await t
      .withIdentity({ subject: agentUserId })
      .query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("agent_payout_status");
    expect(notifications[0].title).toContain("$50.00");
    expect(notifications[0].title).toContain("sent");
  });

  test("declining a payout notifies the agent and includes the admin's note", async () => {
    const t = convexTest(schema, modules);
    const adminUserId = await seedAdmin(t);
    const { agentUserId, requestId } = await seedAgentWithPendingPayout(t, 3000);

    await t.withIdentity({ subject: adminUserId }).mutation(api.admin.processPayoutRequest, {
      requestId,
      decision: "declined",
      adminNotes: "Bank details on file don't match — please update and resubmit.",
    });

    const notifications = await t
      .withIdentity({ subject: agentUserId })
      .query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toContain("declined");
    expect(notifications[0].body).toContain("Bank details on file don't match");
  });

  test("a non-admin cannot process a payout request (and no notification is sent)", async () => {
    const t = convexTest(schema, modules);
    const { agentUserId, requestId } = await seedAgentWithPendingPayout(t);
    const nonAdminId = await t.run(async (ctx) => ctx.db.insert("users", { email: "not-admin@example.com" }));

    await expect(
      t.withIdentity({ subject: nonAdminId }).mutation(api.admin.processPayoutRequest, {
        requestId,
        decision: "paid",
      }),
    ).rejects.toThrow();

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", agentUserId)).collect(),
    );
    expect(notifications).toHaveLength(0);
  });

  test("processing the same request twice is rejected the second time (no duplicate notification)", async () => {
    const t = convexTest(schema, modules);
    const adminUserId = await seedAdmin(t);
    const { agentUserId, requestId } = await seedAgentWithPendingPayout(t);

    await t.withIdentity({ subject: adminUserId }).mutation(api.admin.processPayoutRequest, {
      requestId,
      decision: "paid",
    });
    await expect(
      t.withIdentity({ subject: adminUserId }).mutation(api.admin.processPayoutRequest, {
        requestId,
        decision: "paid",
      }),
    ).rejects.toThrow();

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", agentUserId)).collect(),
    );
    expect(notifications).toHaveLength(1); // only the first, successful call notified
  });
});
