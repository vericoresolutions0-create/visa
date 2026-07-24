import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUser, getCurrentUserOrThrow, assertNotSuspended, assertEmailVerified } from "./authHelpers.ts";
import { requireAdmin, logAdminAction } from "./admin.ts";
import { checkUserDailyLimit } from "./rateLimits.ts";
import { getEffectivePlan } from "./checklists.ts";
import { internal } from "./_generated/api";

const PAID_PLANS = ["pro", "expert"] as const;
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 2000;
const MIN_BODY_LENGTH = 30;
const MAX_REPLY_LENGTH = 1000;
const MIN_REPLY_LENGTH = 2;
const FLAG_AUTO_HIDE_THRESHOLD = 3;

// Patterns that indicate someone is trying to share contact details or
// external links — the primary scam/spam vector on any community feature.
const SCAM_PATTERNS = [
  /(\+?\d[\s\-.]?){8,}/,              // phone numbers (8+ digit sequences)
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email addresses
  /wa\.me/i,                           // WhatsApp links
  /t\.me\//i,                          // Telegram links
  /telegram\.me/i,
  /\bwhatsapp\b/i,                     // the word "whatsapp"
  /instagram\.com\//i,
  /snapchat\.com\//i,
  /\bdm\s+me\b/i,                      // "dm me"
  /\btext\s+me\b/i,                    // "text me"
];

function scanForScamContent(text: string): boolean {
  return SCAM_PATTERNS.some((pattern) => pattern.test(text));
}

function validatePost(title: string, body: string): void {
  if (title.trim().length === 0) {
    throw new ConvexError({ code: "INVALID_INPUT", message: "Title is required." });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ConvexError({ code: "TOO_LONG", message: `Title must be under ${MAX_TITLE_LENGTH} characters.` });
  }
  if (body.trim().length < MIN_BODY_LENGTH) {
    throw new ConvexError({ code: "TOO_SHORT", message: `Post needs a bit more detail (at least ${MIN_BODY_LENGTH} characters).` });
  }
  if (body.length > MAX_BODY_LENGTH) {
    throw new ConvexError({ code: "TOO_LONG", message: `Post is too long (max ${MAX_BODY_LENGTH} characters).` });
  }
  if (scanForScamContent(title) || scanForScamContent(body)) {
    throw new ConvexError({
      code: "CONTACT_DETECTED",
      message:
        "Your post appears to contain a phone number, email address, or external link. " +
        "For everyone's safety, contact details are not allowed in community posts. " +
        "Please remove them and try again.",
    });
  }
}

function validateReplyBody(body: string): void {
  if (body.trim().length < MIN_REPLY_LENGTH) {
    throw new ConvexError({ code: "TOO_SHORT", message: "Reply can't be empty." });
  }
  if (body.length > MAX_REPLY_LENGTH) {
    throw new ConvexError({ code: "TOO_LONG", message: `Reply is too long (max ${MAX_REPLY_LENGTH} characters).` });
  }
  if (scanForScamContent(body)) {
    throw new ConvexError({
      code: "CONTACT_DETECTED",
      message:
        "Your reply appears to contain a phone number, email address, or external link. " +
        "For everyone's safety, contact details are not allowed. Please remove them and try again.",
    });
  }
}

const HANDLE_ADJECTIVES = [
  "Curious", "Hopeful", "Patient", "Steady", "Bold", "Calm", "Diligent",
  "Resolute", "Thoughtful", "Determined", "Quiet", "Earnest", "Bright",
  "Careful", "Persistent",
];
const HANDLE_ANIMALS = [
  "Falcon", "Otter", "Heron", "Fox", "Sparrow", "Wolf", "Owl", "Hare",
  "Crane", "Lynx", "Swift", "Robin", "Badger", "Kestrel", "Wren",
];

// A per-thread pseudonym, not a persistent identity — recomputed fresh from
// (postId, userId) every time a reply is read, never stored. The same
// commenter reads as the same handle within one thread (so a conversation
// makes sense — "X replied to Y" is followable) but is unrelated to their
// handle on any other post, and reveals nothing that could be correlated
// back to a real account.
function anonymousHandle(postId: string, userId: string): string {
  const seed = `${postId}:${userId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const adjective = HANDLE_ADJECTIVES[hash % HANDLE_ADJECTIVES.length];
  const animal = HANDLE_ANIMALS[Math.floor(hash / HANDLE_ADJECTIVES.length) % HANDLE_ANIMALS.length];
  return `${adjective} ${animal}`;
}

// ─── Submit a post (paid users only) ─────────────────────────────────────────
export const submitPost = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    category: v.union(
      v.literal("experience"),
      v.literal("question"),
      v.literal("tip"),
      v.literal("complaint"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);
    assertEmailVerified(user);

    if (!PAID_PLANS.includes(getEffectivePlan(user) as (typeof PAID_PLANS)[number])) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Community posts are available on Pro and Expert plans.",
      });
    }

    await checkUserDailyLimit(
      ctx, user._id, "community_post", 10,
      "You can submit up to 10 community posts per day. Resets at midnight UTC.",
    );

    validatePost(args.title, args.body);

    await ctx.db.insert("community_posts", {
      userId: user._id,
      title: args.title.trim(),
      body: args.body.trim(),
      category: args.category,
      country: user.country ?? "Unknown",
      status: "pending",
      flagCount: 0,
      flaggedByUserIds: [],
      featured: false,
      createdAt: new Date().toISOString(),
    });
  },
});

// ─── List approved posts (public, paginated) ──────────────────────────────────
// Identity is never returned — only country and category are surfaced.
export const listApprovedPosts = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(
      v.union(
        v.literal("experience"),
        v.literal("question"),
        v.literal("tip"),
        v.literal("complaint"),
      ),
    ),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = args.category
      ? await ctx.db
          .query("community_posts")
          .withIndex("by_status_category", (q) =>
            q.eq("status", "approved").eq("category", args.category!),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("community_posts")
          .withIndex("by_status", (q) => q.eq("status", "approved"))
          .order("desc")
          .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page
        .filter((p) => !args.country || p.country === args.country)
        .map((p) => ({
          _id: p._id,
          title: p.title,
          body: p.body,
          category: p.category,
          country: p.country,
          featured: p.featured,
          createdAt: p.createdAt,
          replyCount: p.replyCount ?? 0,
          helpfulCount: p.helpfulCount ?? 0,
          relatableCount: p.relatableCount ?? 0,
        })),
    };
  },
});

// ─── Featured posts for Blog page ────────────────────────────────────────────
export const listFeaturedPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("community_posts")
      .withIndex("by_featured_status", (q) =>
        q.eq("featured", true).eq("status", "approved"),
      )
      .order("desc")
      .take(6);

    return posts.map((p) => ({
      _id: p._id,
      title: p.title,
      body: p.body,
      category: p.category,
      country: p.country,
      createdAt: p.createdAt,
      replyCount: p.replyCount ?? 0,
      helpfulCount: p.helpfulCount ?? 0,
      relatableCount: p.relatableCount ?? 0,
    }));
  },
});

// ─── My posts ─────────────────────────────────────────────────────────────────
export const getMyPosts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("community_posts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

// ─── Flag a post ──────────────────────────────────────────────────────────────
export const flagPost = mutation({
  args: { postId: v.id("community_posts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);

    // Only paid members can flag — prevents 3 free accounts from coordinating
    // to hide a legitimate post by hitting the FLAG_AUTO_HIDE_THRESHOLD.
    if (!PAID_PLANS.includes(user.plan as (typeof PAID_PLANS)[number])) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only Pro and Expert members can flag posts." });
    }

    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError({ code: "NOT_FOUND", message: "Post not found." });
    if (post.status !== "approved") return;
    if (post.flaggedByUserIds.includes(user._id)) {
      throw new ConvexError({ code: "ALREADY_FLAGGED", message: "You have already flagged this post." });
    }

    const newFlagCount = post.flagCount + 1;
    const newStatus = newFlagCount >= FLAG_AUTO_HIDE_THRESHOLD ? "hidden" : "approved";

    await ctx.db.patch(args.postId, {
      flagCount: newFlagCount,
      flaggedByUserIds: [...post.flaggedByUserIds, user._id],
      status: newStatus,
    });
  },
});

// ─── Admin: list pending + hidden posts ───────────────────────────────────────
export const listPostsForModeration = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [pending, hidden] = await Promise.all([
      ctx.db
        .query("community_posts")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .order("asc")
        .take(200),
      ctx.db
        .query("community_posts")
        .withIndex("by_status", (q) => q.eq("status", "hidden"))
        .order("asc")
        .take(200),
    ]);
    return [...pending, ...hidden];
  },
});

// ─── Admin: approve / reject / feature a post ────────────────────────────────
export const moderatePost = mutation({
  args: {
    postId: v.id("community_posts"),
    decision: v.union(
      v.literal("approved"),
      v.literal("rejected"),
    ),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError({ code: "NOT_FOUND", message: "Post not found." });

    await ctx.db.patch(args.postId, {
      status: args.decision,
      featured: args.featured ?? post.featured,
      moderatedAt: new Date().toISOString(),
      moderatedByUserId: admin._id,
      // Clear accumulated flags so coordinated users can't permanently re-hide
      // a post the admin has explicitly cleared.
      ...(args.decision === "approved"
        ? { flagCount: 0, flaggedByUserIds: [] }
        : {}),
    });

    await logAdminAction(
      ctx,
      admin,
      `community:${args.decision}${args.featured ? ":featured" : ""}`,
      args.postId,
      undefined,
    );
  },
});

// ─── Admin: toggle featured on an already-approved post ──────────────────────
export const toggleFeatured = mutation({
  args: { postId: v.id("community_posts") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError({ code: "NOT_FOUND", message: "Post not found." });

    await ctx.db.patch(args.postId, { featured: !post.featured });
    await logAdminAction(ctx, admin, `community:toggleFeatured`, args.postId, undefined);
  },
});

// ═══ Community Hub Phase 2: threaded replies + reactions ════════════════════

// ─── Single post + my own reaction state, for the detail/thread page ────────
export const getPostDetail = query({
  args: { postId: v.id("community_posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || post.status !== "approved") return null;

    const user = await getCurrentUser(ctx);
    let myReactions: ("helpful" | "relatable")[] = [];
    if (user) {
      const rows = await ctx.db
        .query("community_post_reactions")
        .withIndex("by_post", (q) => q.eq("postId", args.postId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .take(2);
      myReactions = rows.map((r) => r.type);
    }

    return {
      _id: post._id,
      title: post.title,
      body: post.body,
      category: post.category,
      country: post.country,
      createdAt: post.createdAt,
      replyCount: post.replyCount ?? 0,
      helpfulCount: post.helpfulCount ?? 0,
      relatableCount: post.relatableCount ?? 0,
      myReactions,
    };
  },
});

// ─── Submit a reply (paid users only, same gate as posts) ────────────────────
// Auto-visible on submission — pre-moderating every reply the way posts are
// moderated would kill the real-time feel of a conversation thread. The
// same flag-to-auto-hide-at-3 mechanic as posts covers abuse reactively.
export const submitReply = mutation({
  args: { postId: v.id("community_posts"), body: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);
    assertEmailVerified(user);

    if (!PAID_PLANS.includes(getEffectivePlan(user) as (typeof PAID_PLANS)[number])) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Replying is available on Pro and Expert plans." });
    }

    const post = await ctx.db.get(args.postId);
    if (!post || post.status !== "approved") {
      throw new ConvexError({ code: "NOT_FOUND", message: "This post isn't available for replies." });
    }

    await checkUserDailyLimit(
      ctx, user._id, "community_reply", 30,
      "You can post up to 30 replies per day. Resets at midnight UTC.",
    );

    validateReplyBody(args.body);

    await ctx.db.insert("community_replies", {
      postId: args.postId,
      userId: user._id,
      body: args.body.trim(),
      country: user.country ?? "Unknown",
      status: "visible",
      flagCount: 0,
      flaggedByUserIds: [],
      createdAt: new Date().toISOString(),
    });

    await ctx.db.patch(args.postId, { replyCount: (post.replyCount ?? 0) + 1 });

    // Notify the post author someone replied — the notification itself
    // never names who; it preserves the replier's anonymity from the
    // author exactly as it's preserved from every other reader. Never
    // fires when replying to your own post.
    if (post.userId !== user._id) {
      await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
        userId: post.userId,
        type: "community_reply_received",
        title: "New reply on your post",
        body: `Someone replied to "${post.title}" in the community.`,
        linkTo: `/community/${args.postId}`,
      });
    }
  },
});

// ─── List visible replies for a post, with a per-thread anonymous handle ────
export const listReplies = query({
  args: { postId: v.id("community_posts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const replies = await ctx.db
      .query("community_replies")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("asc")
      .take(500);

    return replies
      .filter((r) => r.status === "visible")
      .map((r) => ({
        _id: r._id,
        body: r.body,
        country: r.country,
        createdAt: r.createdAt,
        handle: anonymousHandle(args.postId, r.userId),
        isMe: user?._id === r.userId,
      }));
  },
});

// ─── Flag a reply (same paid-only, one-flag-per-user rule as posts) ─────────
export const flagReply = mutation({
  args: { replyId: v.id("community_replies") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);

    if (!PAID_PLANS.includes(user.plan as (typeof PAID_PLANS)[number])) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only Pro and Expert members can flag replies." });
    }

    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new ConvexError({ code: "NOT_FOUND", message: "Reply not found." });
    if (reply.status !== "visible") return;
    if (reply.flaggedByUserIds.includes(user._id)) {
      throw new ConvexError({ code: "ALREADY_FLAGGED", message: "You have already flagged this reply." });
    }

    const newFlagCount = reply.flagCount + 1;
    const newStatus = newFlagCount >= FLAG_AUTO_HIDE_THRESHOLD ? "hidden" : "visible";

    await ctx.db.patch(args.replyId, {
      flagCount: newFlagCount,
      flaggedByUserIds: [...reply.flaggedByUserIds, user._id],
      status: newStatus,
    });
  },
});

// ─── Toggle a reaction on a post ─────────────────────────────────────────────
// Open to any authenticated user, not paid-gated like posting/replying/
// flagging — a reaction is light engagement, not content creation, and
// costs nothing to allow broadly (same "reading is open to everyone" spirit
// extended slightly). Idempotent toggle: tapping the same reaction again
// removes it rather than erroring or duplicating.
export const toggleReaction = mutation({
  args: { postId: v.id("community_posts"), type: v.union(v.literal("helpful"), v.literal("relatable")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);

    const post = await ctx.db.get(args.postId);
    if (!post || post.status !== "approved") {
      throw new ConvexError({ code: "NOT_FOUND", message: "This post isn't available." });
    }

    await checkUserDailyLimit(
      ctx, user._id, "community_reaction", 200,
      "You're reacting a little too fast — please try again in a moment.",
    );

    const existing = await ctx.db
      .query("community_post_reactions")
      .withIndex("by_post_user_type", (q) =>
        q.eq("postId", args.postId).eq("userId", user._id).eq("type", args.type),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      if (args.type === "helpful") {
        await ctx.db.patch(args.postId, { helpfulCount: Math.max(0, (post.helpfulCount ?? 0) - 1) });
      } else {
        await ctx.db.patch(args.postId, { relatableCount: Math.max(0, (post.relatableCount ?? 0) - 1) });
      }
      return { active: false };
    }

    await ctx.db.insert("community_post_reactions", {
      postId: args.postId,
      userId: user._id,
      type: args.type,
      createdAt: new Date().toISOString(),
    });
    if (args.type === "helpful") {
      await ctx.db.patch(args.postId, { helpfulCount: (post.helpfulCount ?? 0) + 1 });
    } else {
      await ctx.db.patch(args.postId, { relatableCount: (post.relatableCount ?? 0) + 1 });
    }
    return { active: true };
  },
});

// ─── Admin: list replies currently auto-hidden by flags ─────────────────────
export const listFlaggedReplies = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("community_replies").order("desc").take(500);
    return all.filter((r) => r.status === "hidden");
  },
});

// ─── Admin: restore or permanently remove a flagged reply ───────────────────
export const moderateReply = mutation({
  args: {
    replyId: v.id("community_replies"),
    decision: v.union(v.literal("restore"), v.literal("remove")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new ConvexError({ code: "NOT_FOUND", message: "Reply not found." });

    if (args.decision === "restore") {
      await ctx.db.patch(args.replyId, { status: "visible", flagCount: 0, flaggedByUserIds: [] });
    }
    // "remove" leaves it hidden permanently — matches how a "rejected" post
    // stays a real (soft-deleted) row rather than being hard-deleted.

    await logAdminAction(ctx, admin, `community:reply:${args.decision}`, args.replyId, undefined);
  },
});
