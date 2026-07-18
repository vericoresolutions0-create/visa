import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUserOrThrow, getCurrentUser, assertNotSuspended } from "./authHelpers.ts";
import { requireAdmin, logAdminAction } from "./admin.ts";

function corridorKey(origin: string, destination: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${norm(origin)}-${norm(destination)}`;
}

// Pro/Expert members only. Rate-limited to 1 per day.
// Admin-moderated before going public — nothing shows until approved.
export const submitApprovalStory = mutation({
  args: {
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
    attempts: v.union(v.literal(1), v.literal(2), v.literal(3)),
    shortNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);

    if ((user.plan ?? "free") === "free") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only Pro and Expert members can share approval stories.",
      });
    }

    if (
      args.origin.length > 100 ||
      args.destination.length > 100 ||
      args.visaType.length > 100
    ) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Input fields are too long." });
    }
    if (args.shortNote && args.shortNote.length > 120) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "Note must be under 120 characters.",
      });
    }

    const dateKey = new Date().toISOString().split("T")[0];
    const usageRow = await ctx.db
      .query("user_daily_usage")
      .withIndex("by_user_resource_date", (q) =>
        q.eq("userId", user._id).eq("resource", "approval_story").eq("dateKey", dateKey),
      )
      .unique();

    if ((usageRow?.count ?? 0) >= 1) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "You can share one approval story per day.",
      });
    }

    await ctx.db.insert("approval_stories", {
      origin: args.origin,
      destination: args.destination,
      visaType: args.visaType,
      corridor: corridorKey(args.origin, args.destination),
      attempts: args.attempts,
      shortNote: args.shortNote?.trim(),
      submittedAt: new Date().toISOString(),
      status: "pending",
    });

    if (usageRow) {
      await ctx.db.patch(usageRow._id, { count: usageRow.count + 1 });
    } else {
      await ctx.db.insert("user_daily_usage", {
        userId: user._id,
        resource: "approval_story",
        dateKey,
        count: 1,
      });
    }
  },
});

// Used on the corridor page — shows up to 5 recent approvals inline.
export const getApprovedStoriesByCorridor = query({
  args: { corridor: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("approval_stories")
      .withIndex("by_corridor_status", (q) =>
        q.eq("corridor", args.corridor).eq("status", "approved"),
      )
      .order("desc")
      .take(5);
  },
});

// Used on /approvals public page — paginated, optionally filtered by corridor.
export const listApprovedStories = query({
  args: {
    paginationOpts: paginationOptsValidator,
    corridor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.corridor) {
      return await ctx.db
        .query("approval_stories")
        .withIndex("by_corridor_status", (q) =>
          q.eq("corridor", args.corridor!).eq("status", "approved"),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("approval_stories")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Lightweight count for corridor page trust badge. Capped read is fine here
// since the badge rounds to nearest 10 and users see "50+" not an exact number.
export const getCorridorApprovalCount = query({
  args: { corridor: v.string() },
  handler: async (ctx, args) => {
    const stories = await ctx.db
      .query("approval_stories")
      .withIndex("by_corridor_status", (q) =>
        q.eq("corridor", args.corridor).eq("status", "approved"),
      )
      .take(200);
    return stories.length;
  },
});

// Admin moderation queue.
export const listPendingStories = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return [];
    return await ctx.db
      .query("approval_stories")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(100);
  },
});

export const moderateStory = mutation({
  args: {
    storyId: v.id("approval_stories"),
    action: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const story = await ctx.db.get(args.storyId);
    if (!story) throw new ConvexError({ code: "NOT_FOUND", message: "Story not found." });
    await ctx.db.patch(args.storyId, {
      status: args.action,
      moderatedAt: new Date().toISOString(),
      moderatedByUserId: admin._id,
    });
    await logAdminAction(ctx, admin, "moderateStory", args.storyId, `${args.action} (${story.origin} -> ${story.destination})`);
  },
});
