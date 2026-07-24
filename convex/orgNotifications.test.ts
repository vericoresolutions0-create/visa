/// <reference types="vite/client" />
// Build-queue item #19/#20: real in-app notifications for business/org
// accounts. Two real events wired up: an invited employee/student/client
// accepting their invite, and a linked member's checklist crossing the same
// "Ready" threshold (progress >= 90) employerCohort.ts's own dashboard
// already uses to bucket them. Also covers the read-side gate fix — org
// admins have no personal plan (org features are free today), so without
// the fix a real org admin's bell/notification page stayed permanently
// empty even after notifications were being created for them, the same bug
// class as the earlier trial-agent notification gap.
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// The notifications this file tests are all fired via ctx.scheduler.runAfter
// inside a mutation, not inserted synchronously — this is the established
// pattern (see marketplaceLeads.test.ts) for actually letting that scheduled
// call run inside a test: fake timers must be active *before* the triggering
// mutation runs, not just before draining afterward.
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

async function seedOrg(
  t: ReturnType<typeof convexTest>,
  orgType: "employer" | "university" | "law_firm" = "employer",
) {
  const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: `admin-${Math.random()}@employer.com` }));
  const organizationId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org",
      type: orgType,
      approvalStatus: "approved",
      createdByUserId: adminUserId,
      createdAt: new Date().toISOString(),
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.insert("org_members", { organizationId, userId: adminUserId, orgRole: "org_admin", joinedAt: new Date().toISOString() }),
  );
  return { adminUserId, organizationId };
}

async function seedPendingInvite(
  t: ReturnType<typeof convexTest>,
  organizationId: Id<"organizations">,
  adminUserId: Id<"users">,
  invitedEmail: string,
) {
  const token = "tok-" + Math.random();
  await t.run(async (ctx) =>
    ctx.db.insert("org_employee_links", {
      organizationId,
      invitedEmail,
      token,
      status: "pending",
      invitedByUserId: adminUserId,
      pipelineStage: "invited",
      createdAt: new Date().toISOString(),
    }),
  );
  return token;
}

describe("employerInvites.acceptInvite — notifies the org admin", () => {
  test("accepting a real invite creates an org_member_invite_accepted notification for the admin", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, "employer");
    const email = "new-employee@example.com";
    const token = await seedPendingInvite(t, organizationId, adminUserId, email);
    const employeeUserId = await t.run(async (ctx) => ctx.db.insert("users", { email, name: "Jordan" }));

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: employeeUserId }).mutation(api.employerInvites.acceptInvite, { token });
    }, t);

    const notifications = await t.withIdentity({ subject: adminUserId }).query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("org_member_invite_accepted");
    expect(notifications[0].body).toContain("Jordan");
    expect(notifications[0].body).toContain("employee");
  });

  test("uses the correct noun for a university org (\"student\", not \"employee\")", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, "university");
    const email = "new-student@example.com";
    const token = await seedPendingInvite(t, organizationId, adminUserId, email);
    const employeeUserId = await t.run(async (ctx) => ctx.db.insert("users", { email, name: "Amara" }));

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: employeeUserId }).mutation(api.employerInvites.acceptInvite, { token });
    }, t);

    const notifications = await t.withIdentity({ subject: adminUserId }).query(api.notifications.getMyNotifications, {});
    expect(notifications[0].body).toContain("student");
    expect(notifications[0].body).not.toContain("employee");
  });

  test("a checklist already at 90%+ BEFORE the invite is accepted also fires org_member_ready immediately (real gap caught via manual E2E, not just unit coverage)", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, "employer");
    const email = "already-ready@example.com";
    const token = await seedPendingInvite(t, organizationId, adminUserId, email);
    const employeeUserId = await t.run(async (ctx) => ctx.db.insert("users", { email, name: "Riley" }));

    // Employee completes their checklist to 100% first — no org relationship
    // exists yet, so saveChecklist's own crossing-detection has nothing to
    // attach to. This is the exact ordering the real UI produces when
    // someone builds their checklist before ever seeing an invite.
    const checklistId = await t.withIdentity({ subject: employeeUserId }).mutation(api.checklists.saveChecklist, {
      origin: "Nigeria", destination: "United Kingdom", visaType: "work",
      checkedItems: ["a", "b", "c"], title: "UK Work Visa", progress: 100,
    });

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: employeeUserId }).mutation(api.employerInvites.acceptInvite, { token, linkedChecklistId: checklistId });
    }, t);

    const notifications = await t.withIdentity({ subject: adminUserId }).query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(2);
    expect(notifications.map((n) => n.type).sort()).toEqual(["org_member_invite_accepted", "org_member_ready"].sort());
  });

  test("a plain org_member (not org_admin) never receives the notification", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, "employer");
    const otherMemberId = await t.run(async (ctx) => ctx.db.insert("users", { email: "colleague@employer.com" }));
    await t.run(async (ctx) =>
      ctx.db.insert("org_members", { organizationId, userId: otherMemberId, orgRole: "org_member", joinedAt: new Date().toISOString() }),
    );
    const email = "new-employee@example.com";
    const token = await seedPendingInvite(t, organizationId, adminUserId, email);
    const employeeUserId = await t.run(async (ctx) => ctx.db.insert("users", { email }));

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: employeeUserId }).mutation(api.employerInvites.acceptInvite, { token });
    }, t);

    // org_member isn't gated into getMyNotifications at all (only admins
    // are) — check directly that no row was ever inserted for them.
    const rows = await t.run(async (ctx) =>
      ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", otherMemberId)).collect(),
    );
    expect(rows).toHaveLength(0);
  });
});

describe("checklists.saveChecklist — notifies the org admin when a linked member becomes Ready", () => {
  async function seedAcceptedLink(
    t: ReturnType<typeof convexTest>,
    organizationId: Id<"organizations">,
    adminUserId: Id<"users">,
    employeeUserId: Id<"users">,
    linkedChecklistId: Id<"saved_checklists">,
  ) {
    await t.run(async (ctx) =>
      ctx.db.insert("org_employee_links", {
        organizationId,
        invitedEmail: "employee@example.com",
        token: "tok-" + Math.random(),
        status: "accepted",
        invitedByUserId: adminUserId,
        employeeUserId,
        linkedChecklistId,
        pipelineStage: "accepted",
        createdAt: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
      }),
    );
  }

  test("crossing from below 90% to 90%+ fires org_member_ready exactly once", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId, organizationId } = await seedOrg(t, "employer");
    const employeeUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "employee@example.com", name: "Sam" }));

    const checklistId = await t.withIdentity({ subject: employeeUserId }).mutation(api.checklists.saveChecklist, {
      origin: "Nigeria", destination: "United Kingdom", visaType: "work",
      checkedItems: ["a"], title: "UK Work Visa", progress: 40,
    });
    await seedAcceptedLink(t, organizationId, adminUserId, employeeUserId, checklistId);

    // Still below threshold — no notification yet.
    await runWithScheduling(async () => {
      await t.withIdentity({ subject: employeeUserId }).mutation(api.checklists.saveChecklist, {
        origin: "Nigeria", destination: "United Kingdom", visaType: "work",
        checkedItems: ["a", "b"], title: "UK Work Visa", progress: 70,
      });
    }, t);
    let notifications = await t.withIdentity({ subject: adminUserId }).query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(0);

    // Crosses the threshold — fires once.
    await runWithScheduling(async () => {
      await t.withIdentity({ subject: employeeUserId }).mutation(api.checklists.saveChecklist, {
        origin: "Nigeria", destination: "United Kingdom", visaType: "work",
        checkedItems: ["a", "b", "c"], title: "UK Work Visa", progress: 95,
      });
    }, t);
    notifications = await t.withIdentity({ subject: adminUserId }).query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("org_member_ready");
    expect(notifications[0].body).toContain("Sam");

    // Saving again while still >= 90% does not re-fire.
    await runWithScheduling(async () => {
      await t.withIdentity({ subject: employeeUserId }).mutation(api.checklists.saveChecklist, {
        origin: "Nigeria", destination: "United Kingdom", visaType: "work",
        checkedItems: ["a", "b", "c", "d"], title: "UK Work Visa", progress: 100,
      });
    }, t);
    notifications = await t.withIdentity({ subject: adminUserId }).query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
  });

  test("a checklist with no org link at all never notifies anyone and never throws", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "solo@example.com" }));

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.checklists.saveChecklist, {
        origin: "Nigeria", destination: "Canada", visaType: "study",
        checkedItems: ["a"], title: "Canada Study", progress: 50,
      }),
    ).resolves.toBeTruthy();

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: userId }).mutation(api.checklists.saveChecklist, {
        origin: "Nigeria", destination: "Canada", visaType: "study",
        checkedItems: ["a", "b"], title: "Canada Study", progress: 95,
      });
    }, t);
    // No assertion target exists since there's no org — proving no crash occurred above is the point of this test.
  });
});

describe("notifications gate — org admins can read notifications despite having no personal plan", () => {
  test("getMyNotifications / getUnreadCount / markAllRead all work for a free-plan org admin", async () => {
    const t = convexTest(schema, modules);
    const { adminUserId } = await seedOrg(t, "employer");
    await t.run(async (ctx) =>
      ctx.db.insert("in_app_notifications", {
        userId: adminUserId, type: "org_member_ready", title: "A member is ready",
        body: "Test", read: false, createdAt: new Date().toISOString(),
      }),
    );

    const asAdmin = t.withIdentity({ subject: adminUserId });
    expect(await asAdmin.query(api.notifications.getMyNotifications, {})).toHaveLength(1);
    expect(await asAdmin.query(api.notifications.getUnreadCount, {})).toBe(1);

    await asAdmin.mutation(api.notifications.markAllRead, {});
    expect(await asAdmin.query(api.notifications.getUnreadCount, {})).toBe(0);
  });

  test("a user with no org membership and no paid plan still gets nothing (gate isn't wide open)", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "free@example.com" }));
    await t.run(async (ctx) =>
      ctx.db.insert("in_app_notifications", {
        userId, type: "org_member_ready", title: "x", body: "x", read: false, createdAt: new Date().toISOString(),
      }),
    );
    expect(await t.withIdentity({ subject: userId }).query(api.notifications.getMyNotifications, {})).toHaveLength(0);
  });
});
