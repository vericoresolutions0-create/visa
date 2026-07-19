/// <reference types="vite/client" />
// Regression test for closing the self-serve white-label checkout gap
// (2026-07-19): Agency White-Label implies a custom domain and full brand
// replacement that don't exist anywhere in the app's infrastructure yet —
// letting someone self-serve pay $149/mo for it via the normal agent
// checkout would take real money for a deliverable that can't actually be
// provided. createCheckoutSession now rejects that plan outright, checked
// before Stripe is even touched, so this fires regardless of whether
// billing is configured in a given environment.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", { email: `user-${Math.random()}@example.com` }));
}

describe("stripe.createCheckoutSession — agency_white_label is not self-serve", () => {
  test("rejects agency_white_label with a clear, non-Stripe error", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);

    await expect(
      t.withIdentity({ subject: userId }).action(api.stripe.createCheckoutSession, {
        product: "agent",
        plan: "agency_white_label",
        billingCycle: "monthly",
      }),
    ).rejects.toThrow(/isn't available for instant checkout/);
  });

  test("other agent plans are unaffected — they pass this guard and fail later only on Stripe not being configured in this test env", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);

    for (const plan of ["agent_listing", "agent_featured"] as const) {
      try {
        await t.withIdentity({ subject: userId }).action(api.stripe.createCheckoutSession, {
          product: "agent",
          plan,
          billingCycle: "monthly",
        });
      } catch (err) {
        // Proves this specific guard isn't what's blocking these plans —
        // a genuinely different, later error (Stripe isn't configured here).
        expect(String(err)).not.toMatch(/NOT_SELF_SERVE/);
      }
    }
  });
});
