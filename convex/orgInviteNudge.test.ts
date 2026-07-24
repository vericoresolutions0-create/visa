/// <reference types="vite/client" />
// Build-queue item #21: nudges an org admin who's gone quiet on inviting.
// internalListOrgsNeedingInviteNudge carries all the real eligibility rules
// (orgNudgeDispatch.ts itself is thin orchestration — runQuery, loop,
// runMutation/runAction — same pattern as agentTrialDispatch.ts, which has
// no dedicated test file either; the logic worth testing lives here).
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

async function seedOrg(
  t: ReturnType<typeof convexTest>,
  opts: {
    type?: "employer" | "university" | "law_firm" | "household";
    approvalStatus?: "pending" | "approved" | "rejected";
    createdAt: string;
    lastInviteNudgeSentAt?: string;
  },
) {
  const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: `admin-${Math.random()}@example.com`, name: "Admin" }));
  const organizationId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org",
      type: opts.type ?? "employer",
      approvalStatus: opts.approvalStatus,
      createdByUserId: adminUserId,
      createdAt: opts.createdAt,
      lastInviteNudgeSentAt: opts.lastInviteNudgeSentAt,
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.insert("org_members", { organizationId, userId: adminUserId, orgRole: "org_admin", joinedAt: opts.createdAt }),
  );
  return { adminUserId, organizationId };
}

async function seedInvite(
  t: ReturnType<typeof convexTest>,
  organizationId: Id<"organizations">,
  adminUserId: Id<"users">,
  createdAt: string,
  status: "pending" | "accepted" | "declined" | "revoked" = "pending",
) {
  await t.run(async (ctx) =>
    ctx.db.insert("org_employee_links", {
      organizationId,
      invitedEmail: `invitee-${Math.random()}@example.com`,
      token: "tok-" + Math.random(),
      status,
      invitedByUserId: adminUserId,
      pipelineStage: "invited",
      createdAt,
    }),
  );
}

async function eligibleOrgIds(t: ReturnType<typeof convexTest>) {
  const targets = await t.run(async (ctx) => ctx.runQuery(internal.organizations.internalListOrgsNeedingInviteNudge, {}));
  return targets.map((tg) => tg.organizationId);
}

describe("organizations.internalListOrgsNeedingInviteNudge", () => {
  test("an org created 31+ days ago with zero invites ever is eligible", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedOrg(t, { createdAt: daysAgo(31) });
    expect(await eligibleOrgIds(t)).toContain(organizationId);
  });

  test("an org created only 10 days ago with zero invites is NOT eligible yet", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedOrg(t, { createdAt: daysAgo(10) });
    expect(await eligibleOrgIds(t)).not.toContain(organizationId);
  });

  test("an org with a recent invite (5 days ago) is NOT eligible, even if the org itself is old", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, { createdAt: daysAgo(200) });
    await seedInvite(t, organizationId, adminUserId, daysAgo(5));
    expect(await eligibleOrgIds(t)).not.toContain(organizationId);
  });

  test("an org whose most recent invite is 40 days old is eligible", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, { createdAt: daysAgo(200) });
    await seedInvite(t, organizationId, adminUserId, daysAgo(40));
    expect(await eligibleOrgIds(t)).toContain(organizationId);
  });

  test("a DECLINED invite still counts as recent admin activity and blocks the nudge", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, { createdAt: daysAgo(200) });
    await seedInvite(t, organizationId, adminUserId, daysAgo(5), "declined");
    expect(await eligibleOrgIds(t)).not.toContain(organizationId);
  });

  test("nudged 10 days ago — re-arm window not reached, NOT eligible", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, { createdAt: daysAgo(200), lastInviteNudgeSentAt: daysAgo(10) });
    await seedInvite(t, organizationId, adminUserId, daysAgo(40));
    expect(await eligibleOrgIds(t)).not.toContain(organizationId);
  });

  test("nudged 35 days ago — re-armed, eligible again", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, { createdAt: daysAgo(200), lastInviteNudgeSentAt: daysAgo(35) });
    await seedInvite(t, organizationId, adminUserId, daysAgo(40));
    expect(await eligibleOrgIds(t)).toContain(organizationId);
  });

  test("a household org is never eligible, regardless of how quiet it's been", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedOrg(t, { type: "household", createdAt: daysAgo(365) });
    expect(await eligibleOrgIds(t)).not.toContain(organizationId);
  });

  test("a pending (not yet approved) org is never eligible", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedOrg(t, { approvalStatus: "pending", createdAt: daysAgo(365) });
    expect(await eligibleOrgIds(t)).not.toContain(organizationId);
  });

  test("an org already at the 500-member cap is NOT eligible", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, { createdAt: daysAgo(200) });
    for (let i = 0; i < 500; i++) {
      await seedInvite(t, organizationId, adminUserId, daysAgo(60), i % 2 === 0 ? "pending" : "accepted");
    }
    expect(await eligibleOrgIds(t)).not.toContain(organizationId);
  });
});

describe("organizations.internalMarkInviteNudgeSent", () => {
  test("stamps the org with the current time", async () => {
    const t = convexTest(schema, modules);
    const { organizationId } = await seedOrg(t, { createdAt: daysAgo(200) });
    await t.run(async (ctx) => ctx.runMutation(internal.organizations.internalMarkInviteNudgeSent, { organizationId }));
    const org = await t.run(async (ctx) => ctx.db.get(organizationId));
    expect(org?.lastInviteNudgeSentAt).toBeDefined();
    expect(new Date(org!.lastInviteNudgeSentAt!).getTime()).toBeGreaterThan(Date.now() - 5000);
  });
});
