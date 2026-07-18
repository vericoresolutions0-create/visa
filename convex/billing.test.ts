/// <reference types="vite/client" />
// Regression test: applyCheckoutCompleted, applySubscriptionEnded, and
// applyPaymentReversed all unconditionally overwrote agent_profiles.tier,
// with no awareness of an active admin-granted trial (agentTrials.ts). A
// trial is supposed to be authoritative until it expires or is explicitly
// revoked — but an unrelated billing event (a purchase of a different plan,
// a cancellation, a refund) would silently stomp the trial's tier, either
// downgrading an agent mid-trial or making them vanish from the marketplace
// entirely while agentTrials.ts still reported the trial as active.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const FUTURE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

async function seedTrialAgent(
  t: ReturnType<typeof convexTest>,
  trialExpiresAt: string | undefined,
) {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: `agent-${Math.random()}@example.com`,
      agentTrialPlan: trialExpiresAt ? "agency_white_label" : undefined,
      agentTrialExpiresAt: trialExpiresAt,
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.insert("agent_profiles", {
      userId,
      fullName: "Trial Agent",
      email: "agent@example.com",
      country: "United Kingdom",
      specialisations: ["skilled-worker"],
      bio: "Test bio",
      yearsExperience: 5,
      languages: ["en"],
      verified: true,
      createdAt: new Date().toISOString(),
      tier: "agency_white_label", // set as if grantTrial had already run
    }),
  );
  return userId;
}

describe("billing.ts agent tier writes respect an active trial", () => {
  test("applyCheckoutCompleted does not downgrade tier while a trial is active", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedTrialAgent(t, FUTURE);

    await t.mutation(internal.billing.applyCheckoutCompleted, {
      userId,
      product: "agent",
      plan: "agent_listing", // a real purchase of a LOWER plan than the trial
      billingCycle: "monthly",
      amountCents: 4900,
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
    });

    const profile = await t.run(async (ctx) =>
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique(),
    );
    expect(profile?.tier).toBe("agency_white_label"); // untouched — trial still wins

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.agentPlan).toBe("agent_listing"); // the real purchase IS recorded, for later
  });

  test("applyCheckoutCompleted sets tier normally once there is no active trial", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedTrialAgent(t, undefined);

    await t.mutation(internal.billing.applyCheckoutCompleted, {
      userId,
      product: "agent",
      plan: "agent_featured",
      billingCycle: "monthly",
      amountCents: 9900,
      stripeCustomerId: "cus_test2",
      stripeSubscriptionId: "sub_test2",
    });

    const profile = await t.run(async (ctx) =>
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique(),
    );
    expect(profile?.tier).toBe("agent_featured");
  });

  test("an already-expired trial does not block a real tier update", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedTrialAgent(t, PAST); // trial technically still on the row, but expired

    await t.mutation(internal.billing.applyCheckoutCompleted, {
      userId,
      product: "agent",
      plan: "agent_listing",
      billingCycle: "monthly",
      amountCents: 4900,
      stripeCustomerId: "cus_test3",
      stripeSubscriptionId: "sub_test3",
    });

    const profile = await t.run(async (ctx) =>
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique(),
    );
    expect(profile?.tier).toBe("agent_listing");
  });

  test("applySubscriptionEnded does not clear tier while a trial is active", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedTrialAgent(t, FUTURE);
    await t.run(async (ctx) => ctx.db.patch(userId, { agentStripeSubscriptionId: "sub_cancel_test" }));

    await t.mutation(internal.billing.applySubscriptionEnded, { stripeSubscriptionId: "sub_cancel_test" });

    const profile = await t.run(async (ctx) =>
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique(),
    );
    expect(profile?.tier).toBe("agency_white_label"); // untouched — trial still wins

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.agentPlan).toBeUndefined(); // the real cancellation IS recorded
  });

  test("applySubscriptionEnded clears tier normally once there is no active trial", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedTrialAgent(t, undefined);
    await t.run(async (ctx) => ctx.db.patch(userId, { agentStripeSubscriptionId: "sub_cancel_test2" }));

    await t.mutation(internal.billing.applySubscriptionEnded, { stripeSubscriptionId: "sub_cancel_test2" });

    const profile = await t.run(async (ctx) =>
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique(),
    );
    expect(profile?.tier).toBeUndefined();
  });
});

describe("billing.ts applySubscriptionRenewal keeps agent payment records fresh", () => {
  test("an agent subscription renewal updates lastAgentPaymentAt, not lastPaymentAt", async () => {
    // Regression test — applySubscriptionRenewal only ever looked up
    // stripeSubscriptionId (the applicant/consumer field), so an agent's
    // subscription renewing found no matching user and silently did
    // nothing. lastAgentPaymentAt stayed frozen at the original checkout
    // date forever, even though Stripe kept charging the agent every cycle.
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: `agent-${Math.random()}@example.com`,
        agentPlan: "agent_listing",
        agentStripeSubscriptionId: "sub_agent_renew_test",
        lastAgentPaymentAt: "2020-01-01T00:00:00.000Z",
      }),
    );

    await t.mutation(internal.billing.applySubscriptionRenewal, {
      stripeSubscriptionId: "sub_agent_renew_test",
      amountCents: 4900,
      stripeEventId: "evt_agent_renew_test",
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.lastAgentPaymentAt).not.toBe("2020-01-01T00:00:00.000Z");
    expect(user?.lastPaymentAt).toBeUndefined(); // the consumer field must stay untouched
  });
});
