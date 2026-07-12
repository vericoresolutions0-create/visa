import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./authHelpers.ts";

export const addDependent = mutation({
  args: {
    fullName: v.string(),
    relationship: v.string(),
    dateOfBirth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!args.fullName.trim() || args.fullName.length > 200) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Name is required and must be under 200 characters." });
    }
    if (!args.relationship.trim() || args.relationship.length > 100) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Relationship is required (e.g. Son, Daughter) — max 100 characters." });
    }
    if (args.dateOfBirth && args.dateOfBirth.length > 20) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid date of birth." });
    }
    return await ctx.db.insert("managed_dependents", {
      parentUserId: user._id,
      fullName: args.fullName.trim(),
      relationship: args.relationship.trim(),
      dateOfBirth: args.dateOfBirth,
      createdAt: new Date().toISOString(),
    });
  },
});

export const listMyDependents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const [dependents, checklists] = await Promise.all([
      ctx.db.query("managed_dependents").withIndex("by_parent", (q) => q.eq("parentUserId", user._id)).order("desc").take(50),
      ctx.db.query("saved_checklists").withIndex("by_user", (q) => q.eq("userId", user._id)).take(200),
    ]);

    return dependents.map((dep) => ({
      ...dep,
      checklistCount: checklists.filter((c) => c.managedDependentId === dep._id).length,
    }));
  },
});

export const updateDependent = mutation({
  args: {
    id: v.id("managed_dependents"),
    fullName: v.optional(v.string()),
    relationship: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const dependent = await ctx.db.get(args.id);
    if (!dependent) throw new ConvexError({ code: "NOT_FOUND", message: "Dependent not found." });
    if (dependent.parentUserId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "This dependent doesn't belong to your account." });
    }
    const fullName = args.fullName?.trim();
    const relationship = args.relationship?.trim();
    if (args.fullName !== undefined && (!fullName || args.fullName.length > 200)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Name can't be empty and must be under 200 characters." });
    }
    if (args.relationship !== undefined && (!relationship || args.relationship.length > 100)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Relationship can't be empty and must be under 100 characters." });
    }
    if (args.dateOfBirth && args.dateOfBirth.length > 20) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid date of birth." });
    }
    await ctx.db.patch(args.id, {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(relationship !== undefined ? { relationship } : {}),
      ...(args.dateOfBirth !== undefined ? { dateOfBirth: args.dateOfBirth } : {}),
    });
  },
});

export const deleteDependent = mutation({
  args: { id: v.id("managed_dependents") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const dependent = await ctx.db.get(args.id);
    if (!dependent) throw new ConvexError({ code: "NOT_FOUND", message: "Dependent not found." });
    if (dependent.parentUserId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "This dependent doesn't belong to your account." });
    }
    const checklists = await ctx.db
      .query("saved_checklists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(200);
    const linkedCount = checklists.filter((c) => c.managedDependentId === args.id).length;
    if (linkedCount > 0) {
      throw new ConvexError({
        code: "HAS_LINKED_CHECKLISTS",
        message: `${dependent.fullName} has ${linkedCount} saved checklist(s). Delete those first, or they'll lose their dependent link.`,
      });
    }
    await ctx.db.delete(args.id);
  },
});
