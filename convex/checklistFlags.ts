import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow, getCurrentUser, assertNotSuspended } from "./authHelpers.ts";

const MAX_FLAGS_PER_DAY = 5;
const MAX_NOTES_LENGTH = 200;

function corridorKey(origin: string, destination: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${norm(origin)}-${norm(destination)}`;
}

// Authenticated users flag a checklist requirement they believe is wrong or
// outdated. Rate-limited to 5 per day via user_daily_usage. No personal data
// is stored with the flag — userId is used only for rate limiting, never
// written to the checklist_flags table.
export const submitFlag = mutation({
  args: {
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
    requirementTitle: v.optional(v.string()),
    issueType: v.union(
      v.literal("requirement_changed"),
      v.literal("link_broken"),
      v.literal("missing_information"),
      v.literal("incorrect_information"),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);

    if (
      args.origin.length > 100 ||
      args.destination.length > 100 ||
      args.visaType.length > 100
    ) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Input fields are too long." });
    }
    if (args.requirementTitle && args.requirementTitle.length > 200) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Requirement title too long." });
    }
    if (args.notes && args.notes.length > MAX_NOTES_LENGTH) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: `Notes must be under ${MAX_NOTES_LENGTH} characters.`,
      });
    }

    const dateKey = new Date().toISOString().split("T")[0];
    const usageRow = await ctx.db
      .query("user_daily_usage")
      .withIndex("by_user_resource_date", (q) =>
        q.eq("userId", user._id).eq("resource", "checklist_flag").eq("dateKey", dateKey),
      )
      .unique();

    if ((usageRow?.count ?? 0) >= MAX_FLAGS_PER_DAY) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "You've submitted 5 flags today — that's plenty. Thank you for helping keep the checklists accurate.",
      });
    }

    await ctx.db.insert("checklist_flags", {
      corridor: corridorKey(args.origin, args.destination),
      origin: args.origin,
      destination: args.destination,
      visaType: args.visaType,
      requirementTitle: args.requirementTitle,
      issueType: args.issueType,
      notes: args.notes?.trim(),
      submittedAt: new Date().toISOString(),
      status: "pending",
    });

    if (usageRow) {
      await ctx.db.patch(usageRow._id, { count: usageRow.count + 1 });
    } else {
      await ctx.db.insert("user_daily_usage", {
        userId: user._id,
        resource: "checklist_flag",
        dateKey,
        count: 1,
      });
    }
  },
});

export const listPendingFlags = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return [];
    return await ctx.db
      .query("checklist_flags")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(100);
  },
});

export const reviewFlag = mutation({
  args: {
    flagId: v.id("checklist_flags"),
    action: v.union(v.literal("reviewed"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin only." });
    }
    const flag = await ctx.db.get(args.flagId);
    if (!flag) throw new ConvexError({ code: "NOT_FOUND", message: "Flag not found." });
    await ctx.db.patch(args.flagId, {
      status: args.action,
      reviewedAt: new Date().toISOString(),
      reviewedByUserId: user._id,
    });
  },
});
