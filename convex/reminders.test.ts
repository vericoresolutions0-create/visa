/// <reference types="vite/client" />
// Regression test for a latent IDOR found during a security review: createReminder
// accepted an optional checklistId with no ownership check. Inert today (nothing
// reads reminders.checklistId back across users), but a future feature reading it
// without its own check would have made it exploitable. Fixed by verifying the
// checklist belongs to the caller before it's ever stored.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("reminders.createReminder — checklistId ownership", () => {
  test("rejects a checklistId that belongs to another user", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const checklistId = await t.run(async (ctx) =>
      ctx.db.insert("saved_checklists", {
        userId: ownerId,
        origin: "Nigeria",
        destination: "United Kingdom",
        visaType: "skilled-worker",
        checkedItems: [],
        title: "Owner's checklist",
        progress: 0,
        savedAt: new Date().toISOString(),
      }),
    );

    const attackerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "attacker@example.com" }));

    await expect(
      t.withIdentity({ subject: attackerId }).mutation(api.reminders.createReminder, {
        title: "Sneaky reminder",
        dueDate: new Date().toISOString(),
        email: "attacker@example.com",
        checklistId,
      }),
    ).rejects.toThrow();
  });

  test("allows a checklistId that belongs to the caller", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "user@example.com" }));
    const checklistId = await t.run(async (ctx) =>
      ctx.db.insert("saved_checklists", {
        userId,
        origin: "Nigeria",
        destination: "United Kingdom",
        visaType: "skilled-worker",
        checkedItems: [],
        title: "My checklist",
        progress: 0,
        savedAt: new Date().toISOString(),
      }),
    );

    await t.withIdentity({ subject: userId }).mutation(api.reminders.createReminder, {
      title: "My reminder",
      dueDate: new Date().toISOString(),
      email: "user@example.com",
      checklistId,
    });

    const reminders = await t.run(async (ctx) => ctx.db.query("reminders").collect());
    expect(reminders).toHaveLength(1);
  });

  test("allows creating a reminder with no checklistId at all", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "user2@example.com" }));

    await t.withIdentity({ subject: userId }).mutation(api.reminders.createReminder, {
      title: "Standalone reminder",
      dueDate: new Date().toISOString(),
      email: "user2@example.com",
    });

    const reminders = await t.run(async (ctx) => ctx.db.query("reminders").collect());
    expect(reminders).toHaveLength(1);
  });
});
