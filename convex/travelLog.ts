import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUserOrThrow } from "./authHelpers.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDateStr(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) throw new ConvexError({ code: "INVALID_INPUT", message: `Invalid date: ${dateStr}` });
  return d;
}

function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// Rolling 12-month window ending today
function rollingWindowStart(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  d.setDate(d.getDate() + 1); // exclusive: 365 days ago + 1 = rolling year
  return d.toISOString().slice(0, 10);
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const getMyTrips = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("travel_trips")
      .withIndex("by_user_departure", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);
  },
});

// Returns the absence summary needed for the tracker gauge — both the
// rolling-12-month figure (the correct measure for "rolling_year" rule
// jurisdictions like the UK: no more than N days in any rolling 12-month
// period) AND the EU Long-Term Residency figures (a genuinely different
// test: 6 consecutive months absent, OR 10 months total across the whole
// 5-year qualifying period — neither of which a rolling-12-month sum
// actually measures). Computing both here, always, is deliberate: it's
// one extra pass over an already-fetched, already-small trip list, and it
// means the frontend never has to guess which fields are meaningful for
// which jurisdiction.
export const getAbsenceSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const windowStart = rollingWindowStart();

    // All trips that overlap with the rolling 12-month window
    const allTrips = await ctx.db
      .query("travel_trips")
      .withIndex("by_user_departure", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);

    // Sum days for trips whose return date falls within the window
    let daysUsedThisWindow = 0;
    for (const trip of allTrips) {
      if (trip.returnDate >= windowStart) {
        // Clamp start to window start
        const tripStart = trip.departureDate < windowStart ? windowStart : trip.departureDate;
        const departure = parseDateStr(tripStart);
        const returnDate = parseDateStr(trip.returnDate);
        daysUsedThisWindow += Math.max(0, diffDays(departure, returnDate));
      }
    }

    const totalTrips = allTrips.length;
    const totalDaysAllTime = allTrips.reduce((sum, t) => sum + t.daysAbsent, 0);

    // Longest single trip — the practical proxy for "6 consecutive months
    // absent". A single trip's length is an unambiguous, real number;
    // stitching together back-to-back separate trips into one "consecutive"
    // streak is a genuinely ambiguous edge case even under the real rule,
    // so this deliberately doesn't attempt that — it flags the clear case.
    const longestSingleTripDays = allTrips.reduce((max, t) => Math.max(max, t.daysAbsent), 0);

    // Total absence since the visa was granted, clamped to trips that
    // actually fall on/after the grant date — this is the real "10 months
    // total over the 5-year qualifying period" measure. Null if there's no
    // active visa record yet (nothing to measure "since" without a start
    // date).
    let totalDaysSinceGrant: number | null = null;
    const visa = await ctx.db
      .query("visa_status")
      .withIndex("by_user_active", (q) => q.eq("userId", user._id).eq("active", true))
      .first();
    if (visa) {
      totalDaysSinceGrant = allTrips
        .filter((t) => t.returnDate >= visa.grantDate)
        .reduce((sum, t) => {
          const clampedStart = t.departureDate < visa.grantDate ? visa.grantDate : t.departureDate;
          const departure = parseDateStr(clampedStart);
          const returnDate = parseDateStr(t.returnDate);
          return sum + Math.max(0, diffDays(departure, returnDate));
        }, 0);
    }

    return {
      windowStart,
      daysUsedThisWindow,
      totalTrips,
      totalDaysAllTime,
      longestSingleTripDays,
      totalDaysSinceGrant,
    };
  },
});

// Returns all trips formatted for PDF export — includes everything the user
// logged, sorted oldest-first so the printed page reads chronologically.
export const getTripsForExport = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("travel_trips")
      .withIndex("by_user_departure", (q) => q.eq("userId", user._id))
      .order("asc")
      .take(500);
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const addTrip = mutation({
  args: {
    destination: v.string(),
    destinationEmoji: v.optional(v.string()),
    departureDate: v.string(),
    returnDate: v.string(),
    purpose: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Input validation
    if (args.destination.length > 100) throw new ConvexError({ code: "INVALID_INPUT", message: "Destination too long." });
    if ((args.notes ?? "").length > 500) throw new ConvexError({ code: "INVALID_INPUT", message: "Notes too long (max 500 characters)." });

    const departure = parseDateStr(args.departureDate);
    const returnDate = parseDateStr(args.returnDate);
    if (returnDate < departure) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Return date must be on or after departure date." });
    }
    const daysAbsent = diffDays(departure, returnDate);
    if (daysAbsent > 730) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "A single trip cannot exceed 730 days." });
    }

    const now = new Date().toISOString();
    await ctx.db.insert("travel_trips", {
      userId: user._id,
      destination: args.destination.trim(),
      destinationEmoji: args.destinationEmoji,
      departureDate: args.departureDate,
      returnDate: args.returnDate,
      daysAbsent,
      purpose: args.purpose?.trim(),
      notes: args.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTrip = mutation({
  args: {
    tripId: v.id("travel_trips"),
    destination: v.string(),
    destinationEmoji: v.optional(v.string()),
    departureDate: v.string(),
    returnDate: v.string(),
    purpose: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.userId !== user._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found." });
    }

    if (args.destination.length > 100) throw new ConvexError({ code: "INVALID_INPUT", message: "Destination too long." });
    if ((args.notes ?? "").length > 500) throw new ConvexError({ code: "INVALID_INPUT", message: "Notes too long." });

    const departure = parseDateStr(args.departureDate);
    const returnDate = parseDateStr(args.returnDate);
    if (returnDate < departure) throw new ConvexError({ code: "INVALID_INPUT", message: "Return date must be on or after departure date." });
    const daysAbsent = diffDays(departure, returnDate);

    await ctx.db.patch(args.tripId, {
      destination: args.destination.trim(),
      destinationEmoji: args.destinationEmoji,
      departureDate: args.departureDate,
      returnDate: args.returnDate,
      daysAbsent,
      purpose: args.purpose?.trim(),
      notes: args.notes?.trim(),
      updatedAt: new Date().toISOString(),
    });
  },
});

export const deleteTrip = mutation({
  args: { tripId: v.id("travel_trips") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.userId !== user._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found." });
    }
    await ctx.db.delete(args.tripId);
  },
});
