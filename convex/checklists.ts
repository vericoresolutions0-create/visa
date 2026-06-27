import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.js";
import { bumpStat } from "./platformStats.ts";
import { getCurrentUser, getCurrentUserOrThrow as getUserOrThrow } from "./authHelpers.ts";
import { recordPartnerEvent } from "./partners.ts";
import { internal } from "./_generated/api";

export const FREE_MONTHLY_TRIP_LIMIT = 3;

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

function getEffectivePlan(user: Doc<"users">): "free" | "pro" | "expert" {
  const plan = user.plan ?? "free";
  const isTrialActive = user.trialStartedAt
    ? new Date() < new Date(new Date(user.trialStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    : false;
  return isTrialActive ? "pro" : plan;
}

async function countTripsCreatedThisMonth(ctx: QueryCtx, userId: Id<"users">): Promise<number> {
  const monthStart = new Date(`${currentYearMonth()}-01T00:00:00.000Z`).getTime();
  const trips = await ctx.db
    .query("saved_checklists")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return trips.filter((t) => t._creationTime >= monthStart).length;
}

// ─── Monthly usage (for the free-plan save limit + upgrade prompt) ──────────
export const getMonthlyTripUsage = query({
  args: {},
  handler: async (ctx): Promise<{ plan: "free" | "pro" | "expert"; used: number; limit: number | null }> => {
    const user = await getCurrentUser(ctx);
    if (!user) return { plan: "free", used: 0, limit: FREE_MONTHLY_TRIP_LIMIT };
    const plan = getEffectivePlan(user);
    if (plan !== "free") return { plan, used: 0, limit: null };
    const used = await countTripsCreatedThisMonth(ctx, user._id);
    return { plan, used, limit: FREE_MONTHLY_TRIP_LIMIT };
  },
});

// ─── Save checklist / trip ───────────────────────────────────────────────────
export const saveChecklist = mutation({
  args: {
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
    checkedItems: v.array(v.string()),
    title: v.string(),
    progress: v.number(),
    tripName: v.optional(v.string()),
    travelDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    const plan = getEffectivePlan(user);

    // Check if a checklist for this combo already exists and update it
    const existing = await ctx.db
      .query("saved_checklists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const match = existing.find(
      (c) => c.origin === args.origin && c.destination === args.destination && c.visaType === args.visaType
    );

    if (match) {
      await ctx.db.patch(match._id, {
        checkedItems: args.checkedItems,
        progress: args.progress,
        savedAt: new Date().toISOString(),
        ...(args.tripName !== undefined ? { tripName: args.tripName } : {}),
        ...(args.travelDate !== undefined ? { travelDate: args.travelDate } : {}),
      });
      return match._id;
    }

    // Free plan: real 3-new-trips-per-month limit (saving over an existing
    // trip above never counts against this — only brand new trips do).
    if (plan === "free") {
      const usedThisMonth = await countTripsCreatedThisMonth(ctx, user._id);
      if (usedThisMonth >= FREE_MONTHLY_TRIP_LIMIT) {
        throw new ConvexError({
          code: "MONTHLY_LIMIT_REACHED",
          message: "You have used your 3 free checklists this month. Upgrade to Pro to save unlimited checklists.",
        });
      }
    }

    const id = await ctx.db.insert("saved_checklists", {
      userId: user._id,
      origin: args.origin,
      destination: args.destination,
      visaType: args.visaType,
      checkedItems: args.checkedItems,
      title: args.title,
      progress: args.progress,
      savedAt: new Date().toISOString(),
      tripName: args.tripName,
      travelDate: args.travelDate,
      status: "planning",
    });
    await bumpStat(ctx, "totalChecklists", 1);
    if (user.partnerReferralSlug) {
      await recordPartnerEvent(ctx, { slug: user.partnerReferralSlug, eventType: "checklist_completed", userId: user._id });
    }
    return id;
  },
});

// ─── Update trip details (Multi-Trip Manager workspace) ─────────────────────
export const updateTripDetails = mutation({
  args: {
    id: v.id("saved_checklists"),
    tripName: v.optional(v.string()),
    travelDate: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("planning"),
        v.literal("in_progress"),
        v.literal("submitted"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this trip" });
    }
    const { id, ...patch } = args;
    const justApproved = args.status === "approved" && doc.status !== "approved";
    await ctx.db.patch(id, patch);

    // Only fires on the transition into "approved" — re-saving an
    // already-approved trip (e.g. editing the trip name) must never re-send.
    if (justApproved && user.email) {
      await ctx.scheduler.runAfter(0, internal.emails.settleIn.sendSettleInReadyEmail, {
        to: user.email,
        destination: doc.destination,
        tripId: doc._id,
      });
    }
  },
});

// ─── Track progress through the post-approval Settle-In Toolkit ─────────────
export const updateSettleInProgress = mutation({
  args: {
    id: v.id("saved_checklists"),
    settleInCheckedItems: v.array(v.string()),
    settleInProgress: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this trip" });
    }
    if (doc.status !== "approved") {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Settle-in tracking is only available once a trip is approved." });
    }
    await ctx.db.patch(args.id, {
      settleInCheckedItems: args.settleInCheckedItems,
      settleInProgress: args.settleInProgress,
    });
  },
});

// ─── Archive / restore a trip ────────────────────────────────────────────────
export const setTripArchived = mutation({
  args: { id: v.id("saved_checklists"), archived: v.boolean() },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this trip" });
    }
    await ctx.db.patch(args.id, { archived: args.archived });
  },
});

// ─── Get user's saved checklists ─────────────────────────────────────────────
export const getSavedChecklists = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("saved_checklists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// ─── Get a single trip (Multi-Trip Manager workspace) ────────────────────────
export const getTrip = query({
  // Accepts a raw string rather than v.id(...) so a malformed or stale id in
  // the URL (a manually edited link, an old bookmark to a deleted trip)
  // returns null gracefully instead of throwing a raw ArgumentValidationError
  // that the user would see as a generic crash screen. Same reasoning for
  // being signed out: return null (same "Trip not found" empty state) rather
  // than throw, instead of using the throwing getUserOrThrow helper — a
  // direct visit to a bookmarked/shared trip link while signed out (or after
  // a session expires) should show a clean empty state, not crash. This also
  // avoids leaking whether a given id exists to an unauthenticated caller.
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const id = ctx.db.normalizeId("saved_checklists", args.id);
    if (!id) return null;
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== user._id) return null;
    return doc;
  },
});

// ─── Delete saved checklist ───────────────────────────────────────────────────
export const deleteChecklist = mutation({
  args: { id: v.id("saved_checklists") },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Checklist not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this checklist" });
    }
    await ctx.db.delete(args.id);
    await bumpStat(ctx, "totalChecklists", -1);
  },
});
