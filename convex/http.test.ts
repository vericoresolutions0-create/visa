/// <reference types="vite/client" />
// Tests the two highest-consequence endpoints in the app: the Stripe and
// Paystack webhook handlers in convex/http.ts. A silent regression here
// costs real money — a plan granted for free, a payment that never
// activates a subscription, a forged webhook accepted, or (the exact bug
// fixed earlier this build) a foreign-currency amount treated as USD cents.
//
// These are genuine end-to-end tests: a real HTTP request goes through
// t.fetch(), with a real HMAC signature computed the same way Stripe/
// Paystack compute theirs, through the actual httpAction, the actual
// signature verifier, and the actual internal mutations in billing.ts —
// nothing here is mocked. If any of these functions change in a way that
// breaks the real flow, these tests fail.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const STRIPE_WEBHOOK_SECRET = "whsec_test_secret_for_automated_tests_only";
const PAYSTACK_SECRET_KEY = "sk_test_secret_for_automated_tests_only";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET;
  process.env.PAYSTACK_SECRET_KEY = PAYSTACK_SECRET_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// --- Real signature construction, mirroring exactly what Stripe/Paystack
// themselves compute — see verifyStripeSignature / verifyPaystackSignature
// in convex/http.ts, which this deliberately does NOT import from (a test
// that imports the code under test to also generate its expected input
// proves nothing; recomputing independently is what makes this a real check).

async function hmacHex(secret: string, message: string, hash: "SHA-256" | "SHA-512"): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash }, false, ["sign"]);
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function stripeSignatureHeader(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): Promise<string> {
  const v1 = await hmacHex(secret, `${timestamp}.${payload}`, "SHA-256");
  return `t=${timestamp},v1=${v1}`;
}

async function paystackSignatureHeader(payload: string, secret: string): Promise<string> {
  return hmacHex(secret, payload, "SHA-512");
}

async function seedUser(t: ReturnType<typeof convexTest>, overrides: Record<string, unknown> = {}): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", { plan: "free", email: "applicant@example.com", ...overrides }),
  );
}

describe("Stripe webhook — /stripe/webhook", () => {
  test("rejects when STRIPE_WEBHOOK_SECRET is not configured", async () => {
    const t = convexTest(schema, modules);
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await t.fetch("/stripe/webhook", { method: "POST", body: "{}" });
    expect(res.status).toBe(500);
  });

  test("rejects a request with no signature header at all", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/stripe/webhook", { method: "POST", body: "{}" });
    expect(res.status).toBe(400);
  });

  test("rejects a forged signature — wrong secret", async () => {
    const t = convexTest(schema, modules);
    const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
    const sig = await stripeSignatureHeader(payload, "wrong_secret_entirely");
    const res = await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });
    expect(res.status).toBe(400);
  });

  test("rejects a tampered body — signature was computed over different bytes", async () => {
    const t = convexTest(schema, modules);
    const signedPayload = JSON.stringify({ id: "evt_1", amount: 100 });
    const sig = await stripeSignatureHeader(signedPayload, STRIPE_WEBHOOK_SECRET);
    const tamperedPayload = JSON.stringify({ id: "evt_1", amount: 999999 });
    const res = await t.fetch("/stripe/webhook", { method: "POST", body: tamperedPayload, headers: { "stripe-signature": sig } });
    expect(res.status).toBe(400);
  });

  test("rejects a replayed signature outside the 5-minute tolerance", async () => {
    const t = convexTest(schema, modules);
    const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
    const staleTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes old
    const sig = await stripeSignatureHeader(payload, STRIPE_WEBHOOK_SECRET, staleTimestamp);
    const res = await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });
    expect(res.status).toBe(400);
  });

  test("a genuine checkout.session.completed activates the plan with the exact amount sent", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const payload = JSON.stringify({
      id: "evt_real_checkout_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          customer: "cus_test_1",
          subscription: "sub_test_1",
          metadata: { userId, product: "applicant", plan: "pro", billingCycle: "monthly", amountCents: "900" },
        },
      },
    });
    const sig = await stripeSignatureHeader(payload, STRIPE_WEBHOOK_SECRET);
    const res = await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });
    expect(res.status).toBe(200);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.plan).toBe("pro");
    // The exact regression class fixed earlier this build: this must be the
    // real USD-cents amount sent in metadata, never a raw foreign-currency
    // minor-unit figure misread as cents.
    expect(user?.subscriptionAmountCents).toBe(900);
  });

  test("the same event delivered twice only applies once (Stripe retries webhooks on timeout)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const payload = JSON.stringify({
      id: "evt_duplicate_delivery",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_2",
          customer: "cus_test_2",
          subscription: "sub_test_2",
          metadata: { userId, product: "applicant", plan: "pro", billingCycle: "monthly", amountCents: "900" },
        },
      },
    });
    const sig = await stripeSignatureHeader(payload, STRIPE_WEBHOOK_SECRET);

    await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });
    await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });

    const processedCount = await t.run(async (ctx) =>
      (await ctx.db.query("processed_webhook_events").collect()).filter((e) => e.reference === "evt_duplicate_delivery").length,
    );
    expect(processedCount).toBe(1);
  });

  test("incomplete metadata is logged and skipped, not applied blind (never silently activates a plan with guessed data)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const payload = JSON.stringify({
      id: "evt_incomplete_metadata",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_3", customer: "cus_test_3", subscription: "sub_test_3", metadata: { userId } } }, // missing product/plan/billingCycle
    });
    const sig = await stripeSignatureHeader(payload, STRIPE_WEBHOOK_SECRET);
    const res = await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });
    expect(res.status).toBe(200); // acknowledged to Stripe (don't trigger retries) ...

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.plan).toBe("free"); // ... but nothing was actually activated.
  });

  test("charge.refunded downgrades a subscribed user back to free", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { plan: "pro", stripeSubscriptionId: "sub_to_refund" });
    const payload = JSON.stringify({
      id: "evt_refund_1",
      type: "charge.refunded",
      data: { object: { customer: "cus_refund_1", metadata: { userId, product: "applicant" } } },
    });
    const sig = await stripeSignatureHeader(payload, STRIPE_WEBHOOK_SECRET);
    const res = await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });
    expect(res.status).toBe(200);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.plan).toBe("free");
  });
});

describe("Paystack webhook — /paystack/webhook", () => {
  test("rejects when PAYSTACK_SECRET_KEY is not configured", async () => {
    const t = convexTest(schema, modules);
    delete process.env.PAYSTACK_SECRET_KEY;
    const res = await t.fetch("/paystack/webhook", { method: "POST", body: "{}" });
    expect(res.status).toBe(500);
  });

  test("rejects a forged signature", async () => {
    const t = convexTest(schema, modules);
    const payload = JSON.stringify({ event: "charge.success", data: {} });
    const res = await t.fetch("/paystack/webhook", {
      method: "POST",
      body: payload,
      headers: { "x-paystack-signature": "0".repeat(128) },
    });
    expect(res.status).toBe(400);
  });

  test(
    "a real charge.success activates the plan using metadata.amountCents (USD), " +
      "never event.data.amount (NGN kobo) — the exact currency bug fixed earlier this build",
    async () => {
      const t = convexTest(schema, modules);
      const userId = await seedUser(t);
      const payload = JSON.stringify({
        event: "charge.success",
        data: {
          reference: "ref_test_1",
          // A real ₦13,000 charge is 1,300,000 kobo. If this ever gets read
          // as the USD-cents amount again, this assertion below catches it
          // immediately (900 !== 1300000).
          amount: 1_300_000,
          metadata: { userId, plan: "pro", billingCycle: "monthly", amountCents: "900" },
        },
      });
      const sig = await paystackSignatureHeader(payload, PAYSTACK_SECRET_KEY);
      const res = await t.fetch("/paystack/webhook", { method: "POST", body: payload, headers: { "x-paystack-signature": sig } });
      expect(res.status).toBe(200);

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.plan).toBe("pro");
      expect(user?.subscriptionAmountCents).toBe(900);
    },
  );

  test("missing metadata.amountCents skips activation instead of guessing from the raw kobo amount", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const payload = JSON.stringify({
      event: "charge.success",
      data: { reference: "ref_test_2", amount: 1_300_000, metadata: { userId, plan: "pro", billingCycle: "monthly" } }, // no amountCents
    });
    const sig = await paystackSignatureHeader(payload, PAYSTACK_SECRET_KEY);
    const res = await t.fetch("/paystack/webhook", { method: "POST", body: payload, headers: { "x-paystack-signature": sig } });
    expect(res.status).toBe(200);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.plan).toBe("free");
  });

  test("the same charge reference delivered twice only applies once (Paystack retries webhooks)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const payload = JSON.stringify({
      event: "charge.success",
      data: { reference: "ref_duplicate_delivery", amount: 1_300_000, metadata: { userId, plan: "pro", billingCycle: "monthly", amountCents: "900" } },
    });
    const sig = await paystackSignatureHeader(payload, PAYSTACK_SECRET_KEY);

    await t.fetch("/paystack/webhook", { method: "POST", body: payload, headers: { "x-paystack-signature": sig } });
    await t.fetch("/paystack/webhook", { method: "POST", body: payload, headers: { "x-paystack-signature": sig } });

    const processedCount = await t.run(async (ctx) =>
      (await ctx.db.query("processed_webhook_events").collect()).filter((e) => e.reference === "ref_duplicate_delivery").length,
    );
    expect(processedCount).toBe(1);
  });
});
