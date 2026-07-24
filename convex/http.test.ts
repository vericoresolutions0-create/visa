/// <reference types="vite/client" />
// Tests the highest-consequence endpoints in convex/http.ts:
// - Stripe / Paystack webhooks: a silent regression costs real money — a
//   plan granted for free, a payment that never activates a subscription,
//   a forged webhook accepted, or (the exact bug fixed earlier this build)
//   a foreign-currency amount treated as USD cents.
// - Telegram webhook: a regression here means a duplicate reply sent to a
//   real user, or an unhandled crash on a routine send failure.
//
// These are genuine end-to-end tests: a real HTTP request goes through
// t.fetch(), with a real HMAC signature (or secret token) computed the
// same way each provider computes theirs, through the actual httpAction,
// the actual signature verifier, and the actual internal mutations —
// nothing here is mocked except the outbound fetch() to Telegram's own
// API, which would otherwise make a real network call on every test run.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { deriveWebhookSecret } from "./telegramBot.ts";

const modules = import.meta.glob("./**/*.ts");

const STRIPE_WEBHOOK_SECRET = "whsec_test_secret_for_automated_tests_only";
const PAYSTACK_SECRET_KEY = "sk_test_secret_for_automated_tests_only";
const TELEGRAM_BOT_TOKEN = "123456:test-bot-token-for-automated-tests-only";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET;
  process.env.PAYSTACK_SECRET_KEY = PAYSTACK_SECRET_KEY;
  process.env.TELEGRAM_BOT_TOKEN = TELEGRAM_BOT_TOKEN;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
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

  test("invoice.payment_failed notifies the agent and does not touch an unrelated applicant subscription", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedUser(t, {
      email: "agent@example.com",
      plan: undefined,
      agentPlan: "agent_featured",
      agentStripeSubscriptionId: "sub_agent_fail_1",
    });
    const payload = JSON.stringify({
      id: "evt_payment_failed_1",
      type: "invoice.payment_failed",
      data: {
        object: {
          subscription: "sub_agent_fail_1",
          amount_due: 4900,
          next_payment_attempt: Math.floor(Date.now() / 1000) + 3 * 86400,
        },
      },
    });
    const sig = await stripeSignatureHeader(payload, STRIPE_WEBHOOK_SECRET);
    const res = await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });
    expect(res.status).toBe(200);

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", agentUserId)).collect(),
    );
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("agent_payment_failed");
    // Plan itself isn't touched by a failed attempt — only Stripe's own
    // retries or an eventual customer.subscription.deleted end it.
    const agentUser = await t.run(async (ctx) => ctx.db.get(agentUserId));
    expect(agentUser?.agentPlan).toBe("agent_featured");
  });

  test("invoice.payment_failed with no next_payment_attempt (final retry) still notifies once, marked final", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, {
      email: "agent2@example.com",
      plan: undefined,
      agentPlan: "agent_listing",
      agentStripeSubscriptionId: "sub_agent_final_fail",
    });
    const payload = JSON.stringify({
      id: "evt_payment_failed_final",
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_agent_final_fail", amount_due: 2900, next_payment_attempt: null } },
    });
    const sig = await stripeSignatureHeader(payload, STRIPE_WEBHOOK_SECRET);
    const res = await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });
    expect(res.status).toBe(200);

    const all = await t.run(async (ctx) => ctx.db.query("in_app_notifications").collect());
    expect(all).toHaveLength(1);
    expect(all[0].body).toMatch(/final retry/i);
  });

  test("invoice.payment_failed delivered twice only notifies once (Stripe retries webhooks on timeout)", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, {
      email: "agent3@example.com",
      plan: undefined,
      agentPlan: "agent_featured",
      agentStripeSubscriptionId: "sub_agent_dup",
    });
    const payload = JSON.stringify({
      id: "evt_payment_failed_dup",
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_agent_dup", amount_due: 4900, next_payment_attempt: null } },
    });
    const sig = await stripeSignatureHeader(payload, STRIPE_WEBHOOK_SECRET);

    await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });
    await t.fetch("/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": sig } });

    const all = await t.run(async (ctx) => ctx.db.query("in_app_notifications").collect());
    expect(all).toHaveLength(1);
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

describe("Telegram webhook — /telegram/webhook", () => {
  function mockTelegramSendSuccess() {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  test("rejects when TELEGRAM_BOT_TOKEN is not configured", async () => {
    const t = convexTest(schema, modules);
    delete process.env.TELEGRAM_BOT_TOKEN;
    const res = await t.fetch("/telegram/webhook", { method: "POST", body: "{}" });
    expect(res.status).toBe(500);
  });

  test("rejects a request with no secret token header", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/telegram/webhook", { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
  });

  test("rejects a wrong secret token — never reaches (and never calls) the send path", async () => {
    const t = convexTest(schema, modules);
    const fetchMock = mockTelegramSendSuccess();
    const res = await t.fetch("/telegram/webhook", {
      method: "POST",
      body: JSON.stringify({ update_id: 1, message: { chat: { id: 42 }, text: "UK tourist visa" } }),
      headers: { "x-telegram-bot-api-secret-token": "wrong-secret" },
    });
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a genuine update with the correct secret sends exactly one reply", async () => {
    const t = convexTest(schema, modules);
    const fetchMock = mockTelegramSendSuccess();
    const secret = await deriveWebhookSecret(TELEGRAM_BOT_TOKEN);
    const res = await t.fetch("/telegram/webhook", {
      method: "POST",
      body: JSON.stringify({ update_id: 100, message: { chat: { id: 42 }, text: "UK tourist visa" } }),
      headers: { "x-telegram-bot-api-secret-token": secret },
    });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("api.telegram.org");
  });

  test(
    "the same update_id delivered twice sends only one reply — proves the dedup fix works, " +
      "not just that the code compiles",
    async () => {
      const t = convexTest(schema, modules);
      const fetchMock = mockTelegramSendSuccess();
      const secret = await deriveWebhookSecret(TELEGRAM_BOT_TOKEN);
      const body = JSON.stringify({ update_id: 200, message: { chat: { id: 42 }, text: "UK tourist visa" } });
      const headers = { "x-telegram-bot-api-secret-token": secret };

      const first = await t.fetch("/telegram/webhook", { method: "POST", body, headers });
      const second = await t.fetch("/telegram/webhook", { method: "POST", body, headers });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200); // still acked cleanly, not an error — just a no-op
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  test("a send failure (Telegram API error) is caught, logged, and still acks 200 — never crashes the webhook", async () => {
    const t = convexTest(schema, modules);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Bad Request", { status: 400 })));
    const secret = await deriveWebhookSecret(TELEGRAM_BOT_TOKEN);
    const res = await t.fetch("/telegram/webhook", {
      method: "POST",
      body: JSON.stringify({ update_id: 300, message: { chat: { id: 42 }, text: "UK tourist visa" } }),
      headers: { "x-telegram-bot-api-secret-token": secret },
    });
    expect(res.status).toBe(200);
  });
});
