/// <reference types="vite/client" />
// Build-queue item #23: once every active member of a cohort reaches
// pipelineStage "relocated", nothing prompted the org before their next
// intake cycle. Wired into employerCohort.ts setPipelineStage — the real
// chokepoint every pipeline-stage change already goes through — fired only
// on the real state transition (not-all-relocated -> all-relocated), never
// on every later no-op call once a cohort is already fully relocated.
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function runWithScheduling(fn: () => Promise<void>, t: ReturnType<typeof convexTest>) {
  vi.useFakeTimers();
  try {
    await fn();
    vi.runAllTimers();
    await t.finishInProgressScheduledFunctions();
  } finally {
    vi.useRealTimers();
  }
}

async function seedOrg(t: ReturnType<typeof convexTest>, type: "employer" | "university" = "employer") {
  const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: `admin-${Math.random()}@example.com` }));
  const organizationId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org", type, approvalStatus: "approved",
      createdByUserId: adminUserId, createdAt: new Date().toISOString(),
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.insert("org_members", { organizationId, userId: adminUserId, orgRole: "org_admin", joinedAt: new Date().toISOString() }),
  );
  return { adminUserId, organizationId };
}

async function seedMember(
  t: ReturnType<typeof convexTest>,
  organizationId: Id<"organizations">,
  adminUserId: Id<"users">,
  pipelineStage: "invited" | "accepted" | "in_progress" | "ready" | "relocated" = "accepted",
  status: "pending" | "accepted" | "declined" | "revoked" = "accepted",
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("org_employee_links", {
      organizationId,
      invitedEmail: `member-${Math.random()}@example.com`,
      token: "tok-" + Math.random(),
      status,
      invitedByUserId: adminUserId,
      pipelineStage,
      createdAt: new Date().toISOString(),
    }),
  );
}

async function notificationTypesFor(t: ReturnType<typeof convexTest>, adminUserId: Id<"users">) {
  const rows = await t.withIdentity({ subject: adminUserId }).query(api.notifications.getMyNotifications, {});
  return rows.map((r) => r.type);
}

describe("employerCohort.setPipelineStage — cohort-completed notification", () => {
  test("a single-member cohort fires org_cohort_completed the moment that member becomes relocated", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const linkId = await seedMember(t, organizationId, adminUserId, "ready");

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: adminUserId }).mutation(api.employerCohort.setPipelineStage, { linkId, pipelineStage: "relocated" });
    }, t);

    expect(await notificationTypesFor(t, adminUserId)).toContain("org_cohort_completed");
  });

  test("a multi-member cohort only fires once ALL members are relocated, not on the first one", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const linkA = await seedMember(t, organizationId, adminUserId, "ready");
    const linkB = await seedMember(t, organizationId, adminUserId, "in_progress");

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: adminUserId }).mutation(api.employerCohort.setPipelineStage, { linkId: linkA, pipelineStage: "relocated" });
    }, t);
    expect(await notificationTypesFor(t, adminUserId)).not.toContain("org_cohort_completed");

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: adminUserId }).mutation(api.employerCohort.setPipelineStage, { linkId: linkB, pipelineStage: "relocated" });
    }, t);
    expect(await notificationTypesFor(t, adminUserId)).toContain("org_cohort_completed");
  });

  test("re-saving \"relocated\" on an already-fully-relocated cohort does not re-fire", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const linkA = await seedMember(t, organizationId, adminUserId, "relocated");

    await runWithScheduling(async () => {
      // Same stage, same link — a genuinely no-op update.
      await t.withIdentity({ subject: adminUserId }).mutation(api.employerCohort.setPipelineStage, { linkId: linkA, pipelineStage: "relocated" });
    }, t);

    expect(await notificationTypesFor(t, adminUserId)).not.toContain("org_cohort_completed");
  });

  test("a declined member is excluded from the active cohort and never blocks completion", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    await seedMember(t, organizationId, adminUserId, "invited", "declined"); // stuck at "invited" forever, but declined — must not count
    const activeLink = await seedMember(t, organizationId, adminUserId, "ready");

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: adminUserId }).mutation(api.employerCohort.setPipelineStage, { linkId: activeLink, pipelineStage: "relocated" });
    }, t);

    expect(await notificationTypesFor(t, adminUserId)).toContain("org_cohort_completed");
  });

  test("advancing to a non-relocated stage never fires this notification", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const linkId = await seedMember(t, organizationId, adminUserId, "in_progress");

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: adminUserId }).mutation(api.employerCohort.setPipelineStage, { linkId, pipelineStage: "ready" });
    }, t);

    expect(await notificationTypesFor(t, adminUserId)).not.toContain("org_cohort_completed");
  });

  test("a second, later cohort completing (after a first cycle already fired) fires again — real repeat business, not a stale flag", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t);
    const firstLink = await seedMember(t, organizationId, adminUserId, "ready");

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: adminUserId }).mutation(api.employerCohort.setPipelineStage, { linkId: firstLink, pipelineStage: "relocated" });
    }, t);
    const firstCount = (await notificationTypesFor(t, adminUserId)).filter((ty) => ty === "org_cohort_completed").length;
    expect(firstCount).toBe(1);

    // A brand new member joins after the first cohort already completed —
    // cohort is no longer "all relocated" until this one catches up too.
    const secondLink = await seedMember(t, organizationId, adminUserId, "ready");
    await runWithScheduling(async () => {
      await t.withIdentity({ subject: adminUserId }).mutation(api.employerCohort.setPipelineStage, { linkId: secondLink, pipelineStage: "relocated" });
    }, t);

    const secondCount = (await notificationTypesFor(t, adminUserId)).filter((ty) => ty === "org_cohort_completed").length;
    expect(secondCount).toBe(2);
  });
});
