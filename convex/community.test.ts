/// <reference types="vite/client" />
// Build-queue item #28 (final item, Community Hub Phase 2): turns the
// one-way Wall of Fame-style community posts into real threaded
// conversations. Covers the new backend surface added on top of the
// existing (untested until now) Phase 1 posts module: replies, reactions,
// the per-thread anonymous handle, and the admin reply-moderation path.
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedUser(t: ReturnType<typeof convexTest>, plan: string, country = "Nigeria") {
  return await t.run(async (ctx) => ctx.db.insert("users", { email: `user-${Math.random()}@example.com`, plan, country }));
}

async function seedApprovedPost(t: ReturnType<typeof convexTest>, authorId: Id<"users">) {
  return await t.run(async (ctx) =>
    ctx.db.insert("community_posts", {
      userId: authorId, title: "My visa story", body: "A real experience worth sharing with the community.",
      category: "experience", country: "Nigeria", status: "approved",
      flagCount: 0, flaggedByUserIds: [], featured: false, createdAt: new Date().toISOString(),
    }),
  );
}

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

async function seedReply(t: ReturnType<typeof convexTest>, postId: Id<"community_posts">, replierId: Id<"users">) {
  await t.withIdentity({ subject: replierId }).mutation(api.community.submitReply, { postId, body: "A reply worth flagging maybe." });
  const replies = await t.run(async (ctx) => ctx.db.query("community_replies").withIndex("by_post", (q) => q.eq("postId", postId)).collect());
  return replies[0]._id;
}

describe("community.submitReply", () => {
  test("a paid user can reply to an approved post — real content, real notification to the author", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const replierId = await seedUser(t, "pro");

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: replierId }).mutation(api.community.submitReply, {
        postId, body: "Thank you for sharing this, it really helped me understand the process.",
      });
    }, t);

    const replies = await t.query(api.community.listReplies, { postId });
    expect(replies).toHaveLength(1);
    expect(replies[0].body).toContain("Thank you for sharing");

    const post = await t.run(async (ctx) => ctx.db.get(postId));
    expect(post?.replyCount).toBe(1);

    // createNotification (the shared chokepoint) checks the author's plan
    // at the moment the scheduled call actually runs, same as every other
    // paid-only notification in the app — the author here is already paid,
    // so it should have landed.
    const notifications = await t.withIdentity({ subject: authorId }).query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("community_reply_received");
  });

  test("a free-plan author never receives the notification — createNotification's paid gate applies here too, same as every other type", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "free");
    const postId = await seedApprovedPost(t, authorId);
    const replierId = await seedUser(t, "pro");

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: replierId }).mutation(api.community.submitReply, {
        postId, body: "A reply to a free-plan author's post.",
      });
    }, t);

    const rows = await t.run(async (ctx) => ctx.db.query("in_app_notifications").withIndex("by_user", (q) => q.eq("userId", authorId)).collect());
    expect(rows).toHaveLength(0);
  });

  test("free-plan users cannot reply", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const freeUserId = await seedUser(t, "free");

    await expect(
      t.withIdentity({ subject: freeUserId }).mutation(api.community.submitReply, { postId, body: "Nice post!" }),
    ).rejects.toThrow(/Pro and Expert/);
  });

  test("cannot reply to a post that isn't approved (pending/rejected/hidden)", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const pendingPostId = await t.run(async (ctx) =>
      ctx.db.insert("community_posts", {
        userId: authorId, title: "x", body: "A pending post body that is long enough to pass validation.",
        category: "experience", country: "Nigeria", status: "pending",
        flagCount: 0, flaggedByUserIds: [], featured: false, createdAt: new Date().toISOString(),
      }),
    );
    const replierId = await seedUser(t, "pro");

    await expect(
      t.withIdentity({ subject: replierId }).mutation(api.community.submitReply, { postId: pendingPostId, body: "Hello" }),
    ).rejects.toThrow(/isn't available/i);
  });

  test("a reply containing a phone number is rejected by the same scam scan posts use", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const replierId = await seedUser(t, "pro");

    await expect(
      t.withIdentity({ subject: replierId }).mutation(api.community.submitReply, {
        postId, body: "Contact me at +234 812 345 6789 for more info",
      }),
    ).rejects.toThrow(/contact details/i);
  });

  test("replying to your own post never notifies yourself", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);

    await runWithScheduling(async () => {
      await t.withIdentity({ subject: authorId }).mutation(api.community.submitReply, {
        postId, body: "Adding my own follow-up thought here.",
      });
    }, t);

    const notifications = await t.withIdentity({ subject: authorId }).query(api.notifications.getMyNotifications, {});
    expect(notifications).toHaveLength(0);
  });
});

describe("community.listReplies — anonymous per-thread handle", () => {
  test("the same commenter gets the same handle for every reply they post in one thread", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const replierId = await seedUser(t, "pro");

    await t.withIdentity({ subject: replierId }).mutation(api.community.submitReply, { postId, body: "First reply from this person." });
    await t.withIdentity({ subject: replierId }).mutation(api.community.submitReply, { postId, body: "A second reply, same person." });

    const replies = await t.query(api.community.listReplies, { postId });
    expect(replies).toHaveLength(2);
    expect(replies[0].handle).toBe(replies[1].handle);
  });

  test("different commenters on the same thread get different handles", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const replierA = await seedUser(t, "pro");
    const replierB = await seedUser(t, "pro");

    await t.withIdentity({ subject: replierA }).mutation(api.community.submitReply, { postId, body: "Reply from person A here." });
    await t.withIdentity({ subject: replierB }).mutation(api.community.submitReply, { postId, body: "Reply from person B here." });

    const replies = await t.query(api.community.listReplies, { postId });
    const handles = new Set(replies.map((r) => r.handle));
    expect(handles.size).toBe(2);
  });

  test("isMe is true only for the caller's own reply", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const replierId = await seedUser(t, "pro");
    await t.withIdentity({ subject: replierId }).mutation(api.community.submitReply, { postId, body: "A genuine reply here." });

    const asReplier = await t.withIdentity({ subject: replierId }).query(api.community.listReplies, { postId });
    expect(asReplier[0].isMe).toBe(true);

    const asAuthor = await t.withIdentity({ subject: authorId }).query(api.community.listReplies, { postId });
    expect(asAuthor[0].isMe).toBe(false);
  });

  test("never exposes the replier's real userId", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const replierId = await seedUser(t, "pro");
    await t.withIdentity({ subject: replierId }).mutation(api.community.submitReply, { postId, body: "A genuine reply here." });

    const replies = await t.query(api.community.listReplies, { postId });
    expect(JSON.stringify(replies)).not.toContain(replierId);
  });
});

describe("community.flagReply — auto-hide at 3 flags", () => {
  test("a reply is auto-hidden once it reaches 3 flags, and vanishes from listReplies", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const replierId = await seedUser(t, "pro");
    const replyId = await seedReply(t, postId, replierId);

    const flaggers = await Promise.all([seedUser(t, "pro"), seedUser(t, "expert"), seedUser(t, "pro")]);
    for (const flaggerId of flaggers) {
      await t.withIdentity({ subject: flaggerId }).mutation(api.community.flagReply, { replyId });
    }

    const reply = await t.run(async (ctx) => ctx.db.get(replyId));
    expect(reply?.status).toBe("hidden");

    const visibleReplies = await t.query(api.community.listReplies, { postId });
    expect(visibleReplies).toHaveLength(0);
  });

  test("the same user cannot flag the same reply twice", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const replierId = await seedUser(t, "pro");
    const replyId = await seedReply(t, postId, replierId);
    const flaggerId = await seedUser(t, "pro");

    await t.withIdentity({ subject: flaggerId }).mutation(api.community.flagReply, { replyId });
    await expect(
      t.withIdentity({ subject: flaggerId }).mutation(api.community.flagReply, { replyId }),
    ).rejects.toThrow(/already flagged/i);
  });

  test("free-plan users cannot flag replies (same abuse-prevention rule as flagging posts)", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const replierId = await seedUser(t, "pro");
    const replyId = await seedReply(t, postId, replierId);
    const freeUserId = await seedUser(t, "free");

    await expect(
      t.withIdentity({ subject: freeUserId }).mutation(api.community.flagReply, { replyId }),
    ).rejects.toThrow(/Pro and Expert/);
  });
});

describe("community.toggleReaction", () => {
  test("open to a free-plan user, not paid-gated like posting", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const freeUserId = await seedUser(t, "free");

    const result = await t.withIdentity({ subject: freeUserId }).mutation(api.community.toggleReaction, { postId, type: "helpful" });
    expect(result.active).toBe(true);

    const post = await t.run(async (ctx) => ctx.db.get(postId));
    expect(post?.helpfulCount).toBe(1);
  });

  test("tapping the same reaction again removes it (toggle), not a duplicate", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const userId = await seedUser(t, "free");

    await t.withIdentity({ subject: userId }).mutation(api.community.toggleReaction, { postId, type: "helpful" });
    const secondCall = await t.withIdentity({ subject: userId }).mutation(api.community.toggleReaction, { postId, type: "helpful" });

    expect(secondCall.active).toBe(false);
    const post = await t.run(async (ctx) => ctx.db.get(postId));
    expect(post?.helpfulCount).toBe(0);
  });

  test("helpful and relatable are independent — reacting with both counts both", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const userId = await seedUser(t, "free");

    await t.withIdentity({ subject: userId }).mutation(api.community.toggleReaction, { postId, type: "helpful" });
    await t.withIdentity({ subject: userId }).mutation(api.community.toggleReaction, { postId, type: "relatable" });

    const post = await t.run(async (ctx) => ctx.db.get(postId));
    expect(post?.helpfulCount).toBe(1);
    expect(post?.relatableCount).toBe(1);

    const detail = await t.withIdentity({ subject: userId }).query(api.community.getPostDetail, { postId });
    expect(detail?.myReactions.sort()).toEqual(["helpful", "relatable"]);
  });
});

describe("community.getPostDetail", () => {
  test("returns null for a post that isn't approved", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const pendingId = await t.run(async (ctx) =>
      ctx.db.insert("community_posts", {
        userId: authorId, title: "x", body: "A pending post body long enough to pass validation checks.",
        category: "experience", country: "Nigeria", status: "pending",
        flagCount: 0, flaggedByUserIds: [], featured: false, createdAt: new Date().toISOString(),
      }),
    );
    const detail = await t.query(api.community.getPostDetail, { postId: pendingId });
    expect(detail).toBeNull();
  });
});

describe("community.listApprovedPosts — includes the new counters", () => {
  test("a fresh post shows zero counts; after activity, real counts appear", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);

    let page = await t.query(api.community.listApprovedPosts, { paginationOpts: { numItems: 10, cursor: null } });
    expect(page.page[0].replyCount).toBe(0);
    expect(page.page[0].helpfulCount).toBe(0);

    const reactorId = await seedUser(t, "free");
    await t.withIdentity({ subject: reactorId }).mutation(api.community.toggleReaction, { postId, type: "helpful" });
    const replierId = await seedUser(t, "pro");
    await t.withIdentity({ subject: replierId }).mutation(api.community.submitReply, { postId, body: "A real reply to this post." });

    page = await t.query(api.community.listApprovedPosts, { paginationOpts: { numItems: 10, cursor: null } });
    expect(page.page[0].replyCount).toBe(1);
    expect(page.page[0].helpfulCount).toBe(1);
  });
});

describe("community admin — reply moderation", () => {
  async function seedAdmin(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => ctx.db.insert("users", { email: `admin-${Math.random()}@example.com`, role: "admin", plan: "expert" }));
  }

  test("listFlaggedReplies only returns hidden replies, and moderateReply(restore) makes it visible again", async () => {
    const t = convexTest(schema, modules);
    const authorId = await seedUser(t, "pro");
    const postId = await seedApprovedPost(t, authorId);
    const replierId = await seedUser(t, "pro");
    const replyId = await seedReply(t, postId, replierId);

    const flaggers = await Promise.all([seedUser(t, "pro"), seedUser(t, "expert"), seedUser(t, "pro")]);
    for (const flaggerId of flaggers) {
      await t.withIdentity({ subject: flaggerId }).mutation(api.community.flagReply, { replyId });
    }

    const adminId = await seedAdmin(t);
    const flagged = await t.withIdentity({ subject: adminId }).query(api.community.listFlaggedReplies, {});
    expect(flagged).toHaveLength(1);

    await t.withIdentity({ subject: adminId }).mutation(api.community.moderateReply, { replyId, decision: "restore" });
    const reply = await t.run(async (ctx) => ctx.db.get(replyId));
    expect(reply?.status).toBe("visible");
    expect(reply?.flagCount).toBe(0);

    const visibleAgain = await t.query(api.community.listReplies, { postId });
    expect(visibleAgain).toHaveLength(1);
  });

  test("a non-admin cannot access the flagged-replies queue", async () => {
    const t = convexTest(schema, modules);
    const regularUserId = await seedUser(t, "expert");
    await expect(t.withIdentity({ subject: regularUserId }).query(api.community.listFlaggedReplies, {})).rejects.toThrow();
  });
});
