import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow, assertNotSuspended } from "./authHelpers.ts";
import { requireAdmin } from "./admin.ts";

// Authenticated users may submit one review per agent after an engagement.
// Reviews are pending until an admin approves them — public, user-generated
// content attached to real people's livelihoods warrants moderation.
export const submitReview = mutation({
  args: {
    agentProfileId: v.id("agent_profiles"),
    starRating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);

    if (!Number.isInteger(args.starRating) || args.starRating < 1 || args.starRating > 5) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Rating must be a whole number between 1 and 5." });
    }
    if (args.comment && args.comment.trim().length > 500) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Review comment must be under 500 characters." });
    }

    const agent = await ctx.db.get(args.agentProfileId);
    if (!agent || !agent.verified) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Agent not found." });
    }
    if (agent.userId === user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You cannot review your own profile." });
    }

    // Require a real prior interaction — otherwise any authenticated,
    // non-suspended account could review any verified agent with zero
    // engagement, opening the door to review-bombing (competitor sabotage)
    // or fake 5-star rings. Contacting an agent through the marketplace
    // (agents.ts contactAgent) is the one real, provable interaction with a
    // fromUserId we can check.
    const hasContacted = await ctx.db
      .query("agent_contact_requests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", user._id))
      .filter((q) => q.eq(q.field("agentProfileId"), args.agentProfileId))
      .first();
    if (!hasContacted) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You can only review an agent you've contacted through VisaClear.",
      });
    }

    // One review per user per agent — enforced by the compound index
    const existing = await ctx.db
      .query("agent_reviews")
      .withIndex("by_reviewer_agent", (q) =>
        q.eq("reviewerUserId", user._id).eq("agentProfileId", args.agentProfileId),
      )
      .first();
    if (existing) {
      throw new ConvexError({ code: "CONFLICT", message: "You have already submitted a review for this agent." });
    }

    await ctx.db.insert("agent_reviews", {
      agentProfileId: args.agentProfileId,
      reviewerUserId: user._id,
      starRating: args.starRating,
      comment: args.comment?.trim(),
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  },
});

// Public — only approved reviews are shown on the profile page.
// reviewerUserId is stripped before returning to prevent user-ID enumeration
// by unauthenticated callers.
export const listApproved = query({
  args: { agentProfileId: v.id("agent_profiles") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("agent_reviews")
      .withIndex("by_agent_status", (q) =>
        q.eq("agentProfileId", args.agentProfileId).eq("status", "approved"),
      )
      .order("desc")
      .take(20);
    return rows.map(({ reviewerUserId: _omit, ...rest }) => rest);
  },
});

// Check if the signed-in user has already submitted a review for this agent.
// Used by the profile page to hide/show the "Write a review" form.
export const getMyReview = query({
  args: { agentProfileId: v.id("agent_profiles") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("agent_reviews")
      .withIndex("by_reviewer_agent", (q) =>
        q.eq("reviewerUserId", user._id).eq("agentProfileId", args.agentProfileId),
      )
      .first();
  },
});

// Admin: list all pending reviews waiting for moderation.
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("agent_reviews")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(100);
  },
});

// Admin: approve or reject a review. On approval, recompute agent's rating/count.
export const moderate = mutation({
  args: {
    reviewId: v.id("agent_reviews"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new ConvexError({ code: "NOT_FOUND", message: "Review not found." });
    if (review.status !== "pending") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This review has already been moderated." });
    }

    await ctx.db.patch(args.reviewId, { status: args.decision });

    if (args.decision === "approved") {
      // Recompute denormalized rating from all approved rows for this agent.
      // The newly-approved review is included by patching first, so we
      // re-query after the patch — but in the same transaction the patch
      // is already applied, so this read sees it as approved.
      const allApproved = await ctx.db
        .query("agent_reviews")
        .withIndex("by_agent_status", (q) =>
          q.eq("agentProfileId", review.agentProfileId).eq("status", "approved"),
        )
        .take(1000);

      // The patch on line 113 is visible to subsequent reads in the same
      // mutation (Convex own-write semantics), so allApproved already
      // includes the newly approved review. Use it directly — no manual
      // addition needed.
      const total = allApproved.reduce((s, r) => s + r.starRating, 0);
      const count = allApproved.length;
      const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;

      await ctx.db.patch(review.agentProfileId, { rating: avg, reviewCount: count });
    }
  },
});
