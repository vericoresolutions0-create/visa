/// <reference types="vite/client" />
// Regression coverage for the review-received notification fix (2026-07-24):
// submitReview had zero notification hook — an agent had no way to know a
// review had come in until it was approved and appeared on their public
// profile, if they happened to check.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedAgentProfile(t: ReturnType<typeof convexTest>, agentPlan: "agent_listing" | "agent_featured" | undefined = "agent_featured") {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: `agent-${Math.random()}@example.com`, agentPlan });
    const profileId = await ctx.db.insert("agent_profiles", {
      userId,
      fullName: "Reviewed Agent",
      email: "agent@example.com",
      country: "United Kingdom",
      specialisations: ["skilled-worker"],
      bio: "Test",
      yearsExperience: 5,
      languages: ["en"],
      verified: true,
      createdAt: new Date().toISOString(),
      creditBalance: 0,
      leadAccessRevoked: false,
    });
    return { userId, profileId };
  });
}

async function seedContactedReviewer(t: ReturnType<typeof convexTest>, agentProfileId: Id<"agent_profiles">) {
  return await t.run(async (ctx) => {
    const reviewerId = await ctx.db.insert("users", { email: `client-${Math.random()}@example.com` });
    await ctx.db.insert("agent_contact_requests", {
      agentProfileId,
      fromUserId: reviewerId,
      createdAt: new Date().toISOString(),
      read: false,
    });
    return reviewerId;
  });
}

describe("agentReviews.submitReview — review-received notification", () => {
  test("a review from a real prior contact notifies the agent with the star rating, not the reviewer's identity", async () => {
    const t = convexTest(schema, modules);
    const { userId: agentUserId, profileId } = await seedAgentProfile(t);
    const reviewerId = await seedContactedReviewer(t, profileId);

    await t.withIdentity({ subject: reviewerId }).mutation(api.agentReviews.submitReview, {
      agentProfileId: profileId,
      starRating: 5,
      comment: "Excellent, fast, and honest.",
    });

    const notifications = await t
      .withIdentity({ subject: agentUserId })
      .query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("agent_review_received");
    expect(notifications[0].title).toContain("★★★★★");
    expect(notifications[0].body).not.toContain(reviewerId); // reviewer identity never named
  });

  test("a review blocked by the anti-review-bombing guard (no prior contact) never notifies the agent", async () => {
    const t = convexTest(schema, modules);
    const { userId: agentUserId, profileId } = await seedAgentProfile(t);
    const strangerId = await t.run(async (ctx) => ctx.db.insert("users", { email: "stranger@example.com" }));

    await expect(
      t.withIdentity({ subject: strangerId }).mutation(api.agentReviews.submitReview, {
        agentProfileId: profileId,
        starRating: 1,
      }),
    ).rejects.toThrow();

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", agentUserId)).collect(),
    );
    expect(notifications).toHaveLength(0);
  });

  test("does not notify an agent with no active plan or trial (still saves the review itself, pending moderation)", async () => {
    const t = convexTest(schema, modules);
    const { userId: agentUserId, profileId } = await seedAgentProfile(t);
    // Passing `undefined` as an argument to a parameter with a default
    // value triggers that default in JS, not literal undefined — an
    // explicit patch is required to actually clear it.
    await t.run(async (ctx) => ctx.db.patch(agentUserId, { agentPlan: undefined }));
    const reviewerId = await seedContactedReviewer(t, profileId);

    await t.withIdentity({ subject: reviewerId }).mutation(api.agentReviews.submitReview, {
      agentProfileId: profileId,
      starRating: 4,
    });

    const reviews = await t.run(async (ctx) =>
      ctx.db.query("agent_reviews").withIndex("by_agent_status", (q) => q.eq("agentProfileId", profileId).eq("status", "pending")).collect(),
    );
    expect(reviews).toHaveLength(1); // the review itself is a permanent record, unaffected by plan status

    const notifications = await t.run(async (ctx) => ctx.db.query("in_app_notifications").collect());
    expect(notifications).toHaveLength(0);
    void agentUserId;
  });

  test("a second review attempt from the same reviewer for the same agent is rejected, no duplicate notification", async () => {
    const t = convexTest(schema, modules);
    const { profileId } = await seedAgentProfile(t);
    const reviewerId = await seedContactedReviewer(t, profileId);

    await t.withIdentity({ subject: reviewerId }).mutation(api.agentReviews.submitReview, {
      agentProfileId: profileId,
      starRating: 5,
    });
    await expect(
      t.withIdentity({ subject: reviewerId }).mutation(api.agentReviews.submitReview, {
        agentProfileId: profileId,
        starRating: 3,
      }),
    ).rejects.toThrow();

    const notifications = await t.run(async (ctx) => ctx.db.query("in_app_notifications").collect());
    expect(notifications).toHaveLength(1);
  });
});
