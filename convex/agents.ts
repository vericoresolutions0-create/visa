import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { bumpStat } from "./platformStats.ts";

// ─── List agents (public, paginated) ──────────────────────────────────────────
// Paginated rather than collect()-ing the whole table: at scale this table can
// hold millions of rows, and an unbounded query here would slow down (or
// eventually crash) every visit to the public agent directory.
export const listAgents = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agent_profiles")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// ─── Get my agent profile ─────────────────────────────────────────────────────
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    return await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

// ─── Create or update agent profile ──────────────────────────────────────────
export const upsertProfile = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    country: v.string(),
    specialisations: v.array(v.string()),
    bio: v.string(),
    yearsExperience: v.number(),
    languages: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    const existing = await ctx.db
      .query("agent_profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
      return existing._id;
    }

    const id = await ctx.db.insert("agent_profiles", {
      userId: user._id,
      ...args,
      verified: false,
      createdAt: new Date().toISOString(),
    });
    await bumpStat(ctx, "totalAgents", 1);
    return id;
  },
});
