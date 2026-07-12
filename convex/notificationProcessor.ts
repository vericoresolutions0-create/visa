import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

// ─── Get vault documents expiring on a specific date ─────────────────────────
export const getDocumentsExpiringOn = internalQuery({
  args: { expiryDate: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vault_documents")
      .withIndex("by_expiry_date", (q) => q.eq("expiryDate", args.expiryDate))
      .take(1000);
  },
});

// ─── Get trips with a specific travel date ────────────────────────────────────
export const getTripsWithTravelDate = internalQuery({
  args: { travelDate: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("saved_checklists")
      .withIndex("by_travel_date", (q) => q.eq("travelDate", args.travelDate))
      .take(1000);
  },
});

// ─── Get user by id ───────────────────────────────────────────────────────────
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
