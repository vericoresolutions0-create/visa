import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";
import { requireAdmin, logAdminAction } from "./admin.ts";
import { checkUserDailyLimit } from "./rateLimits.ts";

const PAID_PLANS = ["pro", "expert"] as const;
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 2000;
const MIN_BODY_LENGTH = 30;
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

    if (!PAID_PLANS.includes(user.plan as (typeof PAID_PLANS)[number])) {
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
