/// <reference types="vite/client" />
// Tests the full guard chain in convex/marketplace.ts unlockLead — this is
// the one mutation in the app that moves an agent's credit balance, so a
// regression here is either lost revenue (a guard silently stops blocking)
// or a broken product (a guard fires when it shouldn't). Real DB rows, real
// identity simulation via t.withIdentity, nothing mocked.
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
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

describe("marketplace.getMarketplaceLeads — pagination", () => {
  test("leads beyond the old 50-item cap are reachable by continuing with the cursor", async () => {
    // Regression test — getMarketplaceLeads used to hard .take(50), so any
    // open lead older than the 50 most recent silently fell off Browse with
    // no way for any agent to ever reach it, forever.
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));

    const TOTAL_LEADS = 55;
    for (let i = 0; i < TOTAL_LEADS; i++) {
      await seedLead(t, ownerId, { unlockCost: 1 });
    }

    const seen = new Set<string>();
    let cursor: string | null = null;
    let isDone = false;
    let guard = 0;
    while (!isDone && guard < 20) {
      guard += 1;
      const result: { page: { _id: string }[]; isDone: boolean; continueCursor: string } = await t
        .withIdentity({ subject: agentUserId })
        .query(api.marketplace.getMarketplaceLeads, {
          paginationOpts: { numItems: 20, cursor },
        });
      for (const lead of result.page) seen.add(lead._id);
      isDone = result.isDone;
      cursor = result.continueCursor;
    }

    expect(seen.size).toBe(TOTAL_LEADS); // every single lead was eventually reachable
  });

  test("a single page still respects the requested page size", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));

    for (let i = 0; i < 5; i++) {
      await seedLead(t, ownerId, { unlockCost: 1 });
    }

    const result = await t.withIdentity({ subject: agentUserId }).query(api.marketplace.getMarketplaceLeads, {
      paginationOpts: { numItems: 3, cursor: null },
    });
    expect(result.page.length).toBeLessThanOrEqual(3);
    expect(result.isDone).toBe(false);
  });
});

describe("marketplace.findMatchingVerifiedAgents — immediate lead alert matching (2026-07-24)", () => {
  test("matches a verified agent whose specialisation matches the lead's visa type", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t); // specialisations: ["skilled-worker"], verified: true
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const leadId = await seedLead(t, ownerId); // visaType: "skilled-worker"

    const matches = await t.run(async (ctx) =>
      ctx.runQuery(internal.marketplace.findMatchingVerifiedAgents, { leadId }),
    );

    expect(matches.map((m) => m.userId)).toContain(agentUserId);
  });

  test("excludes an unverified agent even with a matching specialisation", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t, { verified: false });
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner2@example.com" }));
    const leadId = await seedLead(t, ownerId);

    const matches = await t.run(async (ctx) =>
      ctx.runQuery(internal.marketplace.findMatchingVerifiedAgents, { leadId }),
    );

    expect(matches.map((m) => m.userId)).not.toContain(agentUserId);
  });

  test("excludes the lead owner from their own matches, even if they have a matching agent profile", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedAgent(t); // owner is also a verified agent with a matching specialisation
    const leadId = await seedLead(t, ownerId);

    const matches = await t.run(async (ctx) =>
      ctx.runQuery(internal.marketplace.findMatchingVerifiedAgents, { leadId }),
    );

    expect(matches.map((m) => m.userId)).not.toContain(ownerId);
  });

  test("falls back to destination-served agents when no specialisation matches", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "dest-agent@example.com" });
      await ctx.db.insert("agent_profiles", {
        userId,
        fullName: "Destination Agent",
        email: "dest-agent@example.com",
        country: "Canada",
        specialisations: ["student-visa"], // does not match the lead's visaType below
        destinations: ["Canada"],
        bio: "Test bio",
        yearsExperience: 3,
        languages: ["en"],
        verified: true,
        createdAt: new Date().toISOString(),
        creditBalance: 100,
        leadAccessRevoked: false,
      });
      return userId;
    });
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner3@example.com" }));
    const leadId = await t.run(async (ctx) =>
      ctx.db.insert("marketplace_leads", {
        userId: ownerId,
        visaType: "work-permit", // no agent specialises in this
        destinationCountry: "Canada",
        urgencyLevel: "standard",
        status: "open",
        unlockCost: 10,
        createdAt: new Date().toISOString(),
      }),
    );

    const matches = await t.run(async (ctx) =>
      ctx.runQuery(internal.marketplace.findMatchingVerifiedAgents, { leadId }),
    );

    expect(matches.map((m) => m.userId)).toContain(agentUserId);
  });
});

describe("marketplace.submitLead — immediate new-lead alert dispatch (2026-07-24)", () => {
  test("submitting a lead schedules the immediate alert, which creates a real notification for a matching verified agent", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t); // specialisations: ["skilled-worker"], verified: true
    // seedAgent's shared helper doesn't set agentPlan (other tests using it
    // don't need an active plan to browse/unlock) — notifications correctly
    // require an active agent (paid or trial), so this test needs one too.
    await t.run(async (ctx) => ctx.db.patch(agentUserId, { agentPlan: "agent_listing" }));
    const applicantId = await t.run(async (ctx) => ctx.db.insert("users", { email: "applicant@example.com", plan: "free" }));

    vi.useFakeTimers();
    try {
      await t.withIdentity({ subject: applicantId }).mutation(api.marketplace.submitLead, {
        visaType: "skilled-worker",
        destinationCountry: "United Kingdom",
        urgencyLevel: "urgent",
      });
      vi.runAllTimers();
      await t.finishInProgressScheduledFunctions();
    } finally {
      vi.useRealTimers();
    }

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", agentUserId)).collect(),
    );
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("marketplace_lead_alert");
    expect(notifications[0].title).toContain("skilled-worker");
  });

  test("does not alert an agent whose trial has already expired and has no paid plan", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "expired-trial@example.com",
        agentTrialPlan: "agent_listing",
        agentTrialExpiresAt: new Date(Date.now() - 86_400_000).toISOString(),
      });
      await ctx.db.insert("agent_profiles", {
        userId,
        fullName: "Expired Trial Agent",
        email: "expired-trial@example.com",
        country: "United Kingdom",
        specialisations: ["skilled-worker"],
        bio: "Test bio",
        yearsExperience: 2,
        languages: ["en"],
        verified: true,
        createdAt: new Date().toISOString(),
        creditBalance: 0,
        leadAccessRevoked: false,
      });
      return userId;
    });
    const applicantId = await t.run(async (ctx) => ctx.db.insert("users", { email: "applicant2@example.com", plan: "free" }));

    vi.useFakeTimers();
    try {
      await t.withIdentity({ subject: applicantId }).mutation(api.marketplace.submitLead, {
        visaType: "skilled-worker",
        destinationCountry: "United Kingdom",
        urgencyLevel: "urgent",
      });
      vi.runAllTimers();
      await t.finishInProgressScheduledFunctions();
    } finally {
      vi.useRealTimers();
    }

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", agentUserId)).collect(),
    );
    expect(notifications).toHaveLength(0);
  });
});
