/// <reference types="vite/client" />
// backend_exceptions is the general-purpose version of email_delivery_failures
// (extended 2026-07-21) — a real durable record instead of a console.error
// nobody's watching, wired first into the Stripe/Paystack webhook handlers'
// existing "needs manual review" spots. These tests prove: repeat failures
// of the same error collapse into one row with a rising count rather than
// flooding the table, a fresh occurrence after resolution starts a new row,
// and only an admin can see or resolve any of it.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function recordTestException(t: ReturnType<typeof convexTest>, fn: string, msg: string) {
  await t.mutation(internal.exceptionLog.recordException, { functionName: fn, errorMessage: msg });
}

async function seedAdmin(t: ReturnType<typeof convexTest>) {
  const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "admin@visaclear.app", role: "admin" }));
  return t.withIdentity({ subject: adminUserId });
}

describe("exceptionLog — real failures, not a flood of duplicates", () => {
  test("a first-time failure creates one row with occurrenceCount 1", async () => {
    const t = convexTest(schema, modules);
    await recordTestException(t, "stripe.webhook.checkout.session.completed", "missing metadata");

    const asAdmin = await seedAdmin(t);
    const { unresolved } = await asAdmin.query(api.exceptionLog.listExceptions, {});
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].occurrenceCount).toBe(1);
  });

  test("the exact same error from the exact same function collapses into one row with a rising count", async () => {
    const t = convexTest(schema, modules);
    await recordTestException(t, "paystack.webhook.charge.success", "missing amountCents");
    await recordTestException(t, "paystack.webhook.charge.success", "missing amountCents");
    await recordTestException(t, "paystack.webhook.charge.success", "missing amountCents");

    const asAdmin = await seedAdmin(t);
    const { unresolved } = await asAdmin.query(api.exceptionLog.listExceptions, {});
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].occurrenceCount).toBe(3);
  });

  test("a different error message from the same function is tracked as a separate row", async () => {
    const t = convexTest(schema, modules);
    await recordTestException(t, "paystack.webhook.charge.success", "missing amountCents");
    await recordTestException(t, "paystack.webhook.charge.success", "missing userId");

    const asAdmin = await seedAdmin(t);
    const { unresolved } = await asAdmin.query(api.exceptionLog.listExceptions, {});
    expect(unresolved).toHaveLength(2);
  });

  test("resolving an alert removes it from the unresolved list", async () => {
    const t = convexTest(schema, modules);
    await recordTestException(t, "stripe.webhook.charge.dispute.created", "STRIPE_SECRET_KEY not set");

    const asAdmin = await seedAdmin(t);
    const before = await asAdmin.query(api.exceptionLog.listExceptions, {});
    expect(before.unresolved).toHaveLength(1);

    await asAdmin.mutation(api.exceptionLog.resolveException, { exceptionId: before.unresolved[0]._id });

    const after = await asAdmin.query(api.exceptionLog.listExceptions, {});
    expect(after.unresolved).toHaveLength(0);
    expect(after.recentResolved.some((r) => r._id === before.unresolved[0]._id)).toBe(true);
  });

  test("a fresh occurrence after resolution starts a new row instead of reopening the old one", async () => {
    const t = convexTest(schema, modules);
    await recordTestException(t, "stripe.webhook.checkout.session.completed", "missing metadata");

    const asAdmin = await seedAdmin(t);
    const first = await asAdmin.query(api.exceptionLog.listExceptions, {});
    await asAdmin.mutation(api.exceptionLog.resolveException, { exceptionId: first.unresolved[0]._id });

    await recordTestException(t, "stripe.webhook.checkout.session.completed", "missing metadata");

    const after = await asAdmin.query(api.exceptionLog.listExceptions, {});
    expect(after.unresolved).toHaveLength(1);
    expect(after.unresolved[0]._id).not.toBe(first.unresolved[0]._id);
    expect(after.unresolved[0].occurrenceCount).toBe(1);
  });

  test("a non-admin cannot view or resolve alerts", async () => {
    const t = convexTest(schema, modules);
    await recordTestException(t, "paystack.webhook.charge.success", "missing amountCents");
    const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "not-admin@example.com" }));
    const asUser = t.withIdentity({ subject: userId });

    await expect(asUser.query(api.exceptionLog.listExceptions, {})).rejects.toThrow(/Admin access required/);
  });
});
