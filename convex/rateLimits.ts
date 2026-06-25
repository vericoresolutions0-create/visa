import { ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";

// Generous ceiling — sized to absorb real legitimate traffic while still
// stopping an unattended script from running unbounded OpenAI spend on an
// endpoint that has no user account to gate by.
const PHOTO_CHECK_GLOBAL_DAILY_LIMIT = 1000;

export const checkAndIncrementPhotoCheckUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const dateKey = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("photo_check_daily_usage")
      .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
      .unique();

    if (existing && existing.count >= PHOTO_CHECK_GLOBAL_DAILY_LIMIT) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "The Photo Checker is at capacity right now. Please try again later.",
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("photo_check_daily_usage", { dateKey, count: 1 });
    }
  },
});
