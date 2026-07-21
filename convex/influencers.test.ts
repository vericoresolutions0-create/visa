/// <reference types="vite/client" />
// Two real gaps found in an audit: logCommission had no self-referral check
// (unlike the equivalent creator commission logic, which does), so an
// influencer paying under their own code earned commission on their own
// money; and the 90-day attribution window was only ever checked
// client-side (localStorage), never re-validated server-side at the moment
// that actually pays out — trackSignup, commission time.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedInfluencer(t: ReturnType<typeof convexTest>, overrides: { attributionWindowDays?: number } = {}) {
  const creatorUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "influencer@example.com" }));
  await t.run(async (ctx) => ctx.db.insert("influencer_codes", {
    code: "MIKETALKS",
    name: "Mike Talks",
    email: "influencer@example.com",
    commissionRate: 20,
    attributionWindowDays: overrides.attributionWindowDays ?? 90,
    portalToken: "test-token-" + Math.random(),
    active: true,
    createdAt: new Date().toISOString(),
    createdByUserId: creatorUserId,
  }));
  return creatorUserId;
}

describe("influencers.logCommission — no self-referral, attribution window enforced", () => {
  test("a normal referred user gets commissioned", async () => {
    const t = convexTest(schema, modules);
    await seedInfluencer(t);
    const referredUserId = await t.run(async (ctx) => ctx.db.insert("users", {
      email: "referred@example.com",
      influencerCode: "MIKETALKS",
      influencerTrackedAt: new Date().toISOString(),
    }));

    await t.mutation(internal.influencers.logCommission, { userId: referredUserId, plan: "pro", subscriptionAmountCents: 2900 });

    const commissions = await t.run(async (ctx) => ctx.db.query("influencer_commissions").collect());
    expect(commissions).toHaveLength(1);
    expect(commissions[0].commissionCents).toBe(580); // 20% of 2900
  });

  test("an influencer paying under their own code earns no commission", async () => {
    const t = convexTest(schema, modules);
    await seedInfluencer(t);
    // Same email as the influencer_codes row — a second personal account.
    const selfReferredUserId = await t.run(async (ctx) => ctx.db.insert("users", {
      email: "influencer@example.com",
      influencerCode: "MIKETALKS",
      influencerTrackedAt: new Date().toISOString(),
    }));

    await t.mutation(internal.influencers.logCommission, { userId: selfReferredUserId, plan: "pro", subscriptionAmountCents: 2900 });

    const commissions = await t.run(async (ctx) => ctx.db.query("influencer_commissions").collect());
    expect(commissions).toHaveLength(0);
  });

  test("a payment inside the attribution window is commissioned", async () => {
    const t = convexTest(schema, modules);
    await seedInfluencer(t, { attributionWindowDays: 90 });
    const trackedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const referredUserId = await t.run(async (ctx) => ctx.db.insert("users", {
      email: "referred@example.com",
      influencerCode: "MIKETALKS",
      influencerTrackedAt: trackedAt,
    }));

    await t.mutation(internal.influencers.logCommission, { userId: referredUserId, plan: "pro", subscriptionAmountCents: 2900 });

    const commissions = await t.run(async (ctx) => ctx.db.query("influencer_commissions").collect());
    expect(commissions).toHaveLength(1);
  });

  test("a payment outside the attribution window earns no commission, regardless of what the client claims", async () => {
    const t = convexTest(schema, modules);
    await seedInfluencer(t, { attributionWindowDays: 90 });
    const trackedAt = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(); // 120 days ago
    const referredUserId = await t.run(async (ctx) => ctx.db.insert("users", {
      email: "referred@example.com",
      influencerCode: "MIKETALKS",
      influencerTrackedAt: trackedAt,
    }));

    await t.mutation(internal.influencers.logCommission, { userId: referredUserId, plan: "pro", subscriptionAmountCents: 2900 });

    const commissions = await t.run(async (ctx) => ctx.db.query("influencer_commissions").collect());
    expect(commissions).toHaveLength(0);
  });

  test("a shorter, influencer-specific attribution window is respected", async () => {
    const t = convexTest(schema, modules);
    await seedInfluencer(t, { attributionWindowDays: 14 });
    const trackedAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(); // 20 days ago — outside a 14-day window
    const referredUserId = await t.run(async (ctx) => ctx.db.insert("users", {
      email: "referred@example.com",
      influencerCode: "MIKETALKS",
      influencerTrackedAt: trackedAt,
    }));

    await t.mutation(internal.influencers.logCommission, { userId: referredUserId, plan: "pro", subscriptionAmountCents: 2900 });

    const commissions = await t.run(async (ctx) => ctx.db.query("influencer_commissions").collect());
    expect(commissions).toHaveLength(0);
  });
});
