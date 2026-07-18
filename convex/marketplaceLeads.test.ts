/// <reference types="vite/client" />
// Tests the full guard chain in convex/marketplace.ts unlockLead — this is
// the one mutation in the app that moves an agent's credit balance, so a
// regression here is either lost revenue (a guard silently stops blocking)
// or a broken product (a guard fires when it shouldn't). Real DB rows, real
// identity simulation via t.withIdentity, nothing mocked.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedAgent(
  t: ReturnType<typeof convexTest>,
  overrides: { creditBalance?: number; leadAccessRevoked?: boolean; isSuspended?: boolean; verified?: boolean } = {},
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: `agent-${Math.random()}@example.com`,
      isSuspended: overrides.isSuspended ?? false,
    });
    await ctx.db.insert("agent_profiles", {
      userId,
      fullName: "Test Agent",
      email: "agent@example.com",
      country: "United Kingdom",
      specialisations: ["skilled-worker"],
      bio: "Test bio",
      yearsExperience: 5,
      languages: ["en"],
      verified: overrides.verified ?? true,
      createdAt: new Date().toISOString(),
      creditBalance: overrides.creditBalance ?? 100,
      leadAccessRevoked: overrides.leadAccessRevoked ?? false,
    });
    return userId;
  });
}

async function seedLead(
  t: ReturnType<typeof convexTest>,
  ownerUserId: Id<"users">,
  overrides: { status?: "open" | "closed"; unlockCost?: number } = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("marketplace_leads", {
      userId: ownerUserId,
      visaType: "skilled-worker",
      destinationCountry: "United Kingdom",
      urgencyLevel: "standard",
      status: overrides.status ?? "open",
      unlockCost: overrides.unlockCost ?? 10,
      createdAt: new Date().toISOString(),
    });
  });
}

describe("marketplace.unlockLead — guard chain", () => {
  test("a suspended agent cannot unlock a lead", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t, { isSuspended: true });
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const leadId = await seedLead(t, ownerId);

    await expect(
      t.withIdentity({ subject: agentUserId }).mutation(api.marketplace.unlockLead, { leadId }),
    ).rejects.toThrow();
  });

  test("an agent with revoked lead access cannot unlock a lead", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t, { leadAccessRevoked: true });
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const leadId = await seedLead(t, ownerId);

    await expect(
      t.withIdentity({ subject: agentUserId }).mutation(api.marketplace.unlockLead, { leadId }),
    ).rejects.toThrow();
  });

  test("an unverified agent cannot unlock a lead, even with a real profile and credits", async () => {
    // Regression test — the read path (getMarketplaceLeads) always gated
    // unverified agents behind a "locked preview," but unlockLead itself
    // never checked profile.verified, so calling the mutation directly
    // (bypassing the UI, which only hides the Unlock button) let an
    // unverified agent spend credits and receive an applicant's real
    // contact details before ever being approved.
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t, { verified: false });
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const leadId = await seedLead(t, ownerId);

    await expect(
      t.withIdentity({ subject: agentUserId }).mutation(api.marketplace.unlockLead, { leadId }),
    ).rejects.toThrow();

    const profile = await t.run(async (ctx) =>
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", agentUserId)).unique(),
    );
    expect(profile?.creditBalance).toBe(100); // untouched — credits were never spent
  });

  test("an agent cannot unlock their own submitted lead", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    // The same user is both the agent and the lead owner.
    const leadId = await seedLead(t, agentUserId);

    await expect(
      t.withIdentity({ subject: agentUserId }).mutation(api.marketplace.unlockLead, { leadId }),
    ).rejects.toThrow();
  });

  test("a closed lead cannot be unlocked", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const leadId = await seedLead(t, ownerId, { status: "closed" });

    await expect(
      t.withIdentity({ subject: agentUserId }).mutation(api.marketplace.unlockLead, { leadId }),
    ).rejects.toThrow();
  });

  test("insufficient credit balance blocks the unlock", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t, { creditBalance: 5 });
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const leadId = await seedLead(t, ownerId, { unlockCost: 10 });

    await expect(
      t.withIdentity({ subject: agentUserId }).mutation(api.marketplace.unlockLead, { leadId }),
    ).rejects.toThrow();

    // And the balance must be untouched by the rejected attempt.
    const profile = await t.run(async (ctx) =>
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", agentUserId)).unique(),
    );
    expect(profile?.creditBalance).toBe(5);
  });

  test("a valid unlock deducts exactly the lead's server-side cost, once", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t, { creditBalance: 100 });
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const leadId = await seedLead(t, ownerId, { unlockCost: 30 });

    const result = await t.withIdentity({ subject: agentUserId }).mutation(api.marketplace.unlockLead, { leadId });
    expect(result.creditsSpent).toBe(30);
    expect(result.remainingBalance).toBe(70);

    const profile = await t.run(async (ctx) =>
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", agentUserId)).unique(),
    );
    expect(profile?.creditBalance).toBe(70);
  });

  test("the same agent cannot unlock the same lead twice", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t, { creditBalance: 100 });
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const leadId = await seedLead(t, ownerId, { unlockCost: 10 });

    await t.withIdentity({ subject: agentUserId }).mutation(api.marketplace.unlockLead, { leadId });
    await expect(
      t.withIdentity({ subject: agentUserId }).mutation(api.marketplace.unlockLead, { leadId }),
    ).rejects.toThrow();

    // Confirm the balance was only ever deducted once (90, not 80).
    const profile = await t.run(async (ctx) =>
      ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", agentUserId)).unique(),
    );
    expect(profile?.creditBalance).toBe(90);
  });

  test("the unlock cost is always read from the server-stored lead, never trusted from the client", async () => {
    // unlockLead's args only accept a leadId — there is no client-supplied
    // cost field at all, so this asserts the mutation's arg validator shape
    // itself closes that door (a regression that added a cost arg would
    // fail this test the moment it's called with one).
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t, { creditBalance: 100 });
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const leadId = await seedLead(t, ownerId, { unlockCost: 10 });

    // An attacker-controlled extra "unlockCost" field, sent as if calling
    // the mutation directly over the wire rather than through the typed
    // client — the args validator must reject it outright.
    const attackerArgs: unknown = { leadId, unlockCost: 0 };
    await expect(
      t.withIdentity({ subject: agentUserId }).mutation(
        api.marketplace.unlockLead,
        attackerArgs as { leadId: typeof leadId },
      ),
    ).rejects.toThrow();
  });
});
