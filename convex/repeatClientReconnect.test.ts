/// <reference types="vite/client" />
// Regression coverage for the repeat-client reconnect feature (2026-07-24,
// build queue item #18). Real business decision from the founder: this
// should cost the agent something (1 credit — a real, deliberate discount
// off the cheapest cold-lead tier of 2), not be free, so the platform stays
// monetized on every real connection instead of teaching agents to take
// repeat business off-platform for free.
//
// Real finding during investigation, not assumed: the original plan
// ("once a client_intakes case reaches complete...") doesn't hold up against
// the real data model — client_intakes.claimedByUserId, the field that would
// link a case back to a signed-in applicant, is defined in the schema but
// never actually set anywhere in the codebase. The real, populated signal
// used instead is marketplace_lead_unlocks: proof an agent actually paid to
// see one of this applicant's own leads.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedVerifiedAgent(t: ReturnType<typeof convexTest>, creditBalance = 10) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: `agent-${Math.random()}@example.com`, agentPlan: "agent_featured" });
    const profileId = await ctx.db.insert("agent_profiles", {
      userId,
      fullName: "Repeat Agent",
      email: "agent@example.com",
      country: "United Kingdom",
      specialisations: ["skilled-worker"],
      bio: "Test",
      yearsExperience: 5,
      languages: ["en"],
      verified: true,
      createdAt: new Date().toISOString(),
      creditBalance,
      leadAccessRevoked: false,
    });
    return { userId, profileId };
  });
}

async function seedApplicantWithRealUnlock(
  t: ReturnType<typeof convexTest>,
  agentUserId: Id<"users">,
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const applicantId = await ctx.db.insert("users", { email: `applicant-${Math.random()}@example.com` });
    const leadId = await ctx.db.insert("marketplace_leads", {
      userId: applicantId,
      visaType: "skilled-worker",
      destinationCountry: "United Kingdom",
      urgencyLevel: "standard",
      status: "open",
      unlockCost: 3,
      createdAt: new Date().toISOString(),
    });
    // The real proof of relationship: an actual paid unlock.
    await ctx.db.insert("marketplace_lead_unlocks", {
      leadId,
      agentUserId,
      creditsSpent: 3,
      unlockedAt: new Date().toISOString(),
    });
    return applicantId;
  });
}

describe("marketplace.getMyPastAgents", () => {
  test("returns an agent who has genuinely unlocked one of my leads", async () => {
    const t = convexTest(schema, modules);
    const { userId: agentUserId } = await seedVerifiedAgent(t);
    const applicantId = await seedApplicantWithRealUnlock(t, agentUserId);

    const past = await t.withIdentity({ subject: applicantId }).query(api.marketplace.getMyPastAgents, {});
    expect(past).toHaveLength(1);
    expect(past[0].agentUserId).toBe(agentUserId);
  });

  test("returns nothing for an applicant with no real unlock history at all", async () => {
    const t = convexTest(schema, modules);
    const applicantId = await t.run(async (ctx) => ctx.db.insert("users", { email: "no-history@example.com" }));

    const past = await t.withIdentity({ subject: applicantId }).query(api.marketplace.getMyPastAgents, {});
    expect(past).toHaveLength(0);
  });

  test("excludes an agent who is no longer verified, even with a real past unlock", async () => {
    const t = convexTest(schema, modules);
    const { userId: agentUserId, profileId } = await seedVerifiedAgent(t);
    await t.run(async (ctx) => ctx.db.patch(profileId, { verified: false }));
    const applicantId = await seedApplicantWithRealUnlock(t, agentUserId);

    const past = await t.withIdentity({ subject: applicantId }).query(api.marketplace.getMyPastAgents, {});
    expect(past).toHaveLength(0);
  });
});

describe("marketplace.reconnectWithAgent", () => {
  test("deducts exactly 1 credit (not the normal lead-unlock cost), creates a real client_intakes case, and notifies the agent", async () => {
    const t = convexTest(schema, modules);
    const { userId: agentUserId, profileId } = await seedVerifiedAgent(t, 10);
    const applicantId = await seedApplicantWithRealUnlock(t, agentUserId);

    const result = await t.withIdentity({ subject: applicantId }).mutation(api.marketplace.reconnectWithAgent, {
      agentUserId,
      destination: "Canada",
      visaType: "Study Permit",
    });

    const profile = await t.run(async (ctx) => ctx.db.get(profileId));
    expect(profile?.creditBalance).toBe(9); // 10 - 1, the discounted cost, not a cold-lead cost

    const intake = await t.run(async (ctx) => ctx.db.get(result.intakeId));
    expect(intake?.agentId).toBe(agentUserId);
    expect(intake?.destination).toBe("Canada");
    expect(intake?.visaType).toBe("Study Permit");
    expect(intake?.status).toBe("awaiting_documents");

    const notifications = await t
      .withIdentity({ subject: agentUserId })
      .query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("agent_returning_client");
  });

  test("rejects reconnecting with an agent there is no real prior relationship with", async () => {
    const t = convexTest(schema, modules);
    const { userId: agentUserId } = await seedVerifiedAgent(t, 10);
    const strangerApplicantId = await t.run(async (ctx) => ctx.db.insert("users", { email: "stranger@example.com" }));

    await expect(
      t.withIdentity({ subject: strangerApplicantId }).mutation(api.marketplace.reconnectWithAgent, {
        agentUserId,
        destination: "Canada",
        visaType: "Study Permit",
      }),
    ).rejects.toThrow();
  });

  test("blocks reconnecting when the agent doesn't have enough credit for even the discounted cost", async () => {
    const t = convexTest(schema, modules);
    const { userId: agentUserId } = await seedVerifiedAgent(t, 0); // no credits at all
    const applicantId = await seedApplicantWithRealUnlock(t, agentUserId);

    await expect(
      t.withIdentity({ subject: applicantId }).mutation(api.marketplace.reconnectWithAgent, {
        agentUserId,
        destination: "Canada",
        visaType: "Study Permit",
      }),
    ).rejects.toThrow(/credit/i);
  });

  test("blocks reconnecting with an agent whose lead access has been revoked", async () => {
    const t = convexTest(schema, modules);
    const { userId: agentUserId, profileId } = await seedVerifiedAgent(t, 10);
    await t.run(async (ctx) => ctx.db.patch(profileId, { leadAccessRevoked: true }));
    const applicantId = await seedApplicantWithRealUnlock(t, agentUserId);

    await expect(
      t.withIdentity({ subject: applicantId }).mutation(api.marketplace.reconnectWithAgent, {
        agentUserId,
        destination: "Canada",
        visaType: "Study Permit",
      }),
    ).rejects.toThrow();
  });
});
