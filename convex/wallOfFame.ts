import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUserOrThrow } from "./authHelpers.ts";
import { requireAdmin, logAdminAction } from "./admin.ts";
import { checkUserDailyLimit } from "./rateLimits.ts";

const MAX_FIELD_LENGTH = 1500;
const MIN_FIELD_LENGTH = 20;

// A long run of digits is the single most common shape of an accidentally
// pasted passport, ID, or account number — rejecting it outright is a real
// safety net, not just a content-quality check, given this content goes
// fully public once approved.
const LONG_DIGIT_RUN = /\d{6,}/;

function validateStoryText(field: string, label: string): void {
  if (field.trim().length < MIN_FIELD_LENGTH) {
    throw new ConvexError({ code: "TOO_SHORT", message: `${label} needs a bit more detail (at least ${MIN_FIELD_LENGTH} characters).` });
  }
  if (field.length > MAX_FIELD_LENGTH) {
    throw new ConvexError({ code: "TOO_LONG", message: `${label} is too long (max ${MAX_FIELD_LENGTH} characters).` });
  }
  if (LONG_DIGIT_RUN.test(field)) {
    throw new ConvexError({
      code: "POSSIBLE_PII",
      message: `${label} appears to contain a long number (like a passport or account number). Please remove any personal identifiers before submitting — this story will be public.`,
    });
  }
}

export const submitStory = mutation({
  args: {
    destination: v.string(),
    visaType: v.string(),
    refusalCount: v.number(),
    whatWentWrong: v.string(),
    whatFixedIt: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    await checkUserDailyLimit(
      ctx, user._id, "wall_of_fame", 3,
      "You can submit up to 3 Wall of Fame stories per day. Resets at midnight UTC.",
    );

    if (args.destination.length > 100)
      throw new ConvexError({ code: "INVALID_INPUT", message: "Destination is too long." });
    if (args.visaType.length > 100)
      throw new ConvexError({ code: "INVALID_INPUT", message: "Visa type is too long." });
    if (args.refusalCount < 1 || args.refusalCount > 20) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Refusal count must be between 1 and 20." });
    }
    validateStoryText(args.whatWentWrong, "What went wrong");
    validateStoryText(args.whatFixedIt, "What fixed it");

    const storyId = await ctx.db.insert("wall_of_fame_stories", {
      submittedByUserId: user._id,
      destination: args.destination,
      visaType: args.visaType,
      refusalCount: args.refusalCount,
      whatWentWrong: args.whatWentWrong.trim(),
      whatFixedIt: args.whatFixedIt.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return { storyId };
  },
});

// Public, paginated, and deliberately stripped of any identity field —
// nothing about who submitted a story is ever returned here.
export const listApprovedStories = query({
  args: {
    paginationOpts: paginationOptsValidator,
    destination: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("wall_of_fame_stories")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page
        .filter((s) => !args.destination || s.destination === args.destination)
        .map((s) => ({
          _id: s._id,
          destination: s.destination,
          visaType: s.visaType,
          refusalCount: s.refusalCount,
          whatWentWrong: s.whatWentWrong,
          whatFixedIt: s.whatFixedIt,
          createdAt: s.createdAt,
        })),
    };
  },
});

export const getMySubmissions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("wall_of_fame_stories")
      .withIndex("by_user", (q) => q.eq("submittedByUserId", user._id))
      .order("desc")
      .collect();
  },
});

export const listPendingStories = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("wall_of_fame_stories")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .collect();
  },
});

export const moderateStory = mutation({
  args: {
    storyId: v.id("wall_of_fame_stories"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(args.storyId, {
      status: args.decision,
      moderatedAt: new Date().toISOString(),
      moderatedByUserId: admin._id,
    });
    await logAdminAction(ctx, admin, `wallOfFame:${args.decision}`, args.storyId, undefined);
  },
});
