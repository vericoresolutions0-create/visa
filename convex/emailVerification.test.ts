/// <reference types="vite/client" />
// Coverage for the new signup email-verification flow: requesting a link,
// confirming it, and the assertEmailVerified gate it feeds (submitPost is
// used here as the representative gated action — contactAgent and
// startTrial share the exact same authHelpers.ts check).
import { convexTest, TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type T = TestConvex<typeof schema>;

async function seedUnverifiedUser(t: T) {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", { email: `user-${Math.random()}@example.com`, plan: "pro" }),
  );
}

const VALID_POST = {
  title: "My experience with the visa process",
  body: "This is a genuinely long enough post body to pass the minimum length validation check in community.ts.",
  category: "experience" as const,
};

describe("emailVerification.requestEmailVerification", () => {
  test("a real pending row is created for an unverified user", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUnverifiedUser(t);

    await t.withIdentity({ subject: userId }).mutation(api.emailVerification.requestEmailVerification, {});

    const pending = await t.run(async (ctx) =>
      ctx.db.query("pending_email_verifications").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    );
    expect(pending).toHaveLength(1);
    expect(pending[0].consumedAt).toBeUndefined();
  });

  test("rejects a resend once the account is already verified", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "verified@example.com", plan: "pro", emailVerificationTime: Date.now() }),
    );

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.emailVerification.requestEmailVerification, {}),
    ).rejects.toThrow();
  });

  test("a second request replaces the first pending token rather than stacking them", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUnverifiedUser(t);

    await t.withIdentity({ subject: userId }).mutation(api.emailVerification.requestEmailVerification, {});
    await t.withIdentity({ subject: userId }).mutation(api.emailVerification.requestEmailVerification, {});

    const pending = await t.run(async (ctx) =>
      ctx.db.query("pending_email_verifications").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    );
    expect(pending).toHaveLength(1);
  });
});

describe("emailVerification.confirmEmailVerification", () => {
  async function getToken(t: T, userId: Id<"users">) {
    await t.withIdentity({ subject: userId }).mutation(api.emailVerification.requestEmailVerification, {});
    const pending = await t.run(async (ctx) =>
      ctx.db.query("pending_email_verifications").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    );
    return pending[0].token;
  }

  test("a valid token verifies the account and consumes the token", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUnverifiedUser(t);
    const token = await getToken(t, userId);

    await t.withIdentity({ subject: userId }).mutation(api.emailVerification.confirmEmailVerification, { token });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.emailVerificationTime).toBeTypeOf("number");

    const pending = await t.run(async (ctx) =>
      ctx.db.query("pending_email_verifications").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    );
    expect(pending).toHaveLength(0);
  });

  test("an already-used token is rejected", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUnverifiedUser(t);
    const token = await getToken(t, userId);

    await t.withIdentity({ subject: userId }).mutation(api.emailVerification.confirmEmailVerification, { token });

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.emailVerification.confirmEmailVerification, { token }),
    ).rejects.toThrow();
  });

  test("a token belonging to a different account is rejected", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUnverifiedUser(t);
    const otherUserId = await seedUnverifiedUser(t);
    const token = await getToken(t, userId);

    await expect(
      t.withIdentity({ subject: otherUserId }).mutation(api.emailVerification.confirmEmailVerification, { token }),
    ).rejects.toThrow();
  });

  test("a garbage token is rejected", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUnverifiedUser(t);

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.emailVerification.confirmEmailVerification, { token: "not-a-real-token" }),
    ).rejects.toThrow();
  });
});

describe("assertEmailVerified gate — community.submitPost as the representative case", () => {
  test("an unverified user's post is rejected before it's ever written", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUnverifiedUser(t);

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.community.submitPost, VALID_POST),
    ).rejects.toThrow(/verify your email/i);

    const posts = await t.run(async (ctx) => ctx.db.query("community_posts").collect());
    expect(posts).toHaveLength(0);
  });

  test("a verified user's post succeeds", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "verified@example.com", plan: "pro", emailVerificationTime: Date.now() }),
    );

    await t.withIdentity({ subject: userId }).mutation(api.community.submitPost, VALID_POST);

    const posts = await t.run(async (ctx) => ctx.db.query("community_posts").collect());
    expect(posts).toHaveLength(1);
  });
});
