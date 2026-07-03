import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

// ─── Get vault documents expiring on a specific date ─────────────────────────
export const getDocumentsExpiringOn = internalQuery({
  args: { expiryDate: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vault_documents")
      .filter((q) => q.eq(q.field("expiryDate"), args.expiryDate))
      .collect();
  },
});

// ─── Get trips with a specific travel date ────────────────────────────────────
export const getTripsWithTravelDate = internalQuery({
  args: { travelDate: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("saved_checklists")
      .filter((q) => q.eq(q.field("travelDate"), args.travelDate))
      .collect();
  },
});

// ─── Get user by id ───────────────────────────────────────────────────────────
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
