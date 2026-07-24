/// <reference types="vite/client" />
// Regression coverage for the commission-earned notification fix
// (2026-07-24): commissions accrued in agent_referral_commissions with zero
// notification — an agent's only way to find out was checking their own
// dashboard stats unprompted. creditAgentReferralCommission had no test
// coverage at all before this file (a real, pre-existing gap, not
// introduced by this fix) — added real coverage for the crediting logic
// itself alongside the new notification behaviour.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";
import { creditAgentReferralCommission } from "./agentReferralCommissions.ts";

const modules = import.meta.glob("./**/*.ts");

async function seedReferringAgent(
  t: ReturnType<typeof convexTest>,
  agentPlan: "agent_listing" | "agent_featured" | "agency_white_label" | undefined = "agent_featured",
): Promise<Doc<"users">> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: `agent-${Math.random()}@example.com`,
      referralCode: `AGENT${Math.floor(Math.random() * 1_000_000)}`,
      agentPlan,
    });
    await ctx.db.insert("agent_profiles", {
      userId,
      fullName: "Referring Agent",
      email: "agent@example.com",
      country: "United Kingdom",
      specialisations: ["skilled-worker"],
      bio: "Test",
      yearsExperience: 5,
      languages: ["en"],
      verified: true,
      createdAt: new Date().toISOString(),
      creditBalance: 0,
      leadAccessRevoked: false,
    });
    const agent = await ctx.db.get(userId);
    if (!agent) throw new Error("seeded agent unexpectedly missing");
    return agent;
  });
}

async function seedPayingUser(t: ReturnType<typeof convexTest>, referredByCode: string): Promise<Doc<"users">> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: `client-${Math.random()}@example.com`, referredByCode });
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("seeded user unexpectedly missing");
    return user;
  });
}

describe("agentReferralCommissions.creditAgentReferralCommission", () => {
  test("credits the correct commission (15% for Pro) and notifies the referring agent", async () => {
    const t = convexTest(schema, modules);
    const agent = await seedReferringAgent(t);
    const payingUser = await seedPayingUser(t, agent.referralCode!);

    await t.run(async (ctx) => creditAgentReferralCommission(ctx, payingUser, "pro", "monthly", 900));

    const commissions = await t.run(async (ctx) =>
      ctx.db.query("agent_referral_commissions").withIndex("by_agent", (q) => q.eq("agentUserId", agent._id)).collect(),
    );
    expect(commissions).toHaveLength(1);
    expect(commissions[0].commissionCents).toBe(135); // 15% of 900
    expect(commissions[0].paymentAmountCents).toBe(900); // the real amount, never guessed

    const notifications = await t
      .withIdentity({ subject: agent._id })
      .query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("agent_commission_earned");
    expect(notifications[0].title).toContain("$1.35");
  });

  test("credits 20% for Expert, not the Pro rate", async () => {
    const t = convexTest(schema, modules);
    const agent = await seedReferringAgent(t);
    const payingUser = await seedPayingUser(t, agent.referralCode!);

    await t.run(async (ctx) => creditAgentReferralCommission(ctx, payingUser, "expert", "yearly", 10_000));

    const commissions = await t.run(async (ctx) =>
      ctx.db.query("agent_referral_commissions").withIndex("by_agent", (q) => q.eq("agentUserId", agent._id)).collect(),
    );
    expect(commissions[0].commissionCents).toBe(2000); // 20% of 10,000
  });

  test("does nothing when the paying user has no referredByCode at all", async () => {
    const t = convexTest(schema, modules);
    const payingUser = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "direct-signup@example.com" });
      return (await ctx.db.get(userId))!;
    });

    await t.run(async (ctx) => creditAgentReferralCommission(ctx, payingUser, "pro", "monthly", 900));

    const all = await t.run(async (ctx) => ctx.db.query("agent_referral_commissions").collect());
    expect(all).toHaveLength(0);
  });

  test("does nothing when the referral code belongs to a personal user, not an agent (no agent_profiles row)", async () => {
    // A personal-user-to-personal-user referral uses a completely separate
    // reward system (referralRewards.ts) — this function must never fire
    // for it, since there's no agent to pay a commission to.
    const t = convexTest(schema, modules);
    const referrerId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "personal-referrer@example.com", referralCode: "PERSONAL123" }),
    );
    const payingUser = await seedPayingUser(t, "PERSONAL123");

    await t.run(async (ctx) => creditAgentReferralCommission(ctx, payingUser, "pro", "monthly", 900));

    const all = await t.run(async (ctx) => ctx.db.query("agent_referral_commissions").collect());
    expect(all).toHaveLength(0);
    const notifications = await t.run(async (ctx) => ctx.db.query("in_app_notifications").collect());
    expect(notifications).toHaveLength(0);
    void referrerId;
  });

  test("does not notify a referring agent whose account has no active plan or trial (still credits the commission itself)", async () => {
    const t = convexTest(schema, modules);
    const agent = await seedReferringAgent(t);
    // Explicit patch, not a seed-time default — passing `undefined` as an
    // argument to a parameter with a default value triggers that default in
    // JS, not literal undefined, so this can't be done via the helper's
    // parameter alone.
    await t.run(async (ctx) => ctx.db.patch(agent._id, { agentPlan: undefined }));
    const payingUser = await seedPayingUser(t, agent.referralCode!);

    await t.run(async (ctx) => creditAgentReferralCommission(ctx, payingUser, "pro", "monthly", 900));

    // The commission itself is a historical financial record — still credited
    // regardless of the agent's current plan status.
    const commissions = await t.run(async (ctx) =>
      ctx.db.query("agent_referral_commissions").withIndex("by_agent", (q) => q.eq("agentUserId", agent._id)).collect(),
    );
    expect(commissions).toHaveLength(1);

    // But the notification (a live-account feature) correctly stays gated,
    // same as every other agent notification in the app.
    const notifications = await t.run(async (ctx) => ctx.db.query("in_app_notifications").collect());
    expect(notifications).toHaveLength(0);
  });

  test("a self-referral (agent refers themself) is never credited", async () => {
    const t = convexTest(schema, modules);
    const agent = await seedReferringAgent(t);
    // The "paying user" and the referring agent are the same account.
    await t.run(async (ctx) => ctx.db.patch(agent._id, { referredByCode: agent.referralCode }));
    const selfAsPayingUser: Doc<"users"> = await t.run(async (ctx) => {
      const user = await ctx.db.get(agent._id);
      if (!user) throw new Error("seeded user unexpectedly missing");
      return user;
    });

    await t.run(async (ctx) => creditAgentReferralCommission(ctx, selfAsPayingUser, "pro", "monthly", 900));

    const all = await t.run(async (ctx) => ctx.db.query("agent_referral_commissions").collect());
    expect(all).toHaveLength(0);
  });
});
