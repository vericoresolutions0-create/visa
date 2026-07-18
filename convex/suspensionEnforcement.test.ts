/// <reference types="vite/client" />
// Regression guard for the "Suspend actor" admin action's enforcement — see
// project memory: a prior incident had isSuspended set by the admin panel
// but read nowhere else in the app, so a suspended user could still act.
// That was fixed by adding assertNotSuspended() at each specific write
// action. This test proves one of those call sites (community.submitPost)
// still actually rejects a suspended user, end to end through the real
// public mutation — not just that the helper function exists.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUser(t: ReturnType<typeof convexTest>, overrides: { isSuspended?: boolean; plan?: "free" | "pro" | "expert" } = {}) {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: `user-${Math.random()}@example.com`,
      plan: overrides.plan ?? "pro",
      isSuspended: overrides.isSuspended ?? false,
    }),
  );
}

const VALID_POST = {
  title: "My experience with the visa process",
  body: "This is a genuinely long enough post body to pass the minimum length validation check in community.ts.",
  category: "experience" as const,
};

describe("Suspension enforcement — community.submitPost", () => {
  test("a suspended user is rejected before their post is ever written", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { isSuspended: true });

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.community.submitPost, VALID_POST),
    ).rejects.toThrow();

    const posts = await t.run(async (ctx) => ctx.db.query("community_posts").collect());
    expect(posts).toHaveLength(0);
  });

  test("a non-suspended paid user's post succeeds (proves the test setup itself is valid, not just permissive)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { isSuspended: false, plan: "pro" });

    await t.withIdentity({ subject: userId }).mutation(api.community.submitPost, VALID_POST);

    const posts = await t.run(async (ctx) => ctx.db.query("community_posts").collect());
    expect(posts).toHaveLength(1);
  });

  test("suspension is checked even for a free-plan user (fails on suspension, not plan-gating, so the guard order can't hide a regression)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { isSuspended: true, plan: "free" });

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.community.submitPost, VALID_POST),
    ).rejects.toThrow(/suspended/i);
  });
});
