import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.js";
import { bumpStat } from "./platformStats.ts";

export const FREE_MONTHLY_TRIP_LIMIT = 3;

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

async function getUserOrThrow(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  return user;
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { plan: "free", used: 0, limit: FREE_MONTHLY_TRIP_LIMIT };
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
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
    await ctx.db.patch(id, patch);
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
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
  args: { id: v.id("saved_checklists") },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    const doc = await ctx.db.get(args.id);
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
