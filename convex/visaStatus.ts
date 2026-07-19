import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUserOrThrow } from "./authHelpers.ts";

// The authoritative per-jurisdiction rule config (absence thresholds, rule
// type) lives in src/pages/dashboard/immigration-status/page.tsx's
// JURISDICTIONS — that's what's actually read anywhere. This file only
// stores and returns whatever jurisdiction string the frontend sends; it
// doesn't validate or interpret it.

// ── Queries ─────────────────────────────────────────────────────────────────

export const getMyVisaStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("visa_status")
      .withIndex("by_user_active", (q) => q.eq("userId", user._id).eq("active", true))
      .first();
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const setVisaStatus = mutation({
  args: {
    jurisdiction: v.string(),
    visaType: v.string(),
    hostCountry: v.string(),
    grantDate: v.string(),
    expiryDate: v.string(),
    sponsorEmployer: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Input validation — prevent excessively long strings
    if (args.visaType.length > 100) throw new ConvexError({ code: "INVALID_INPUT", message: "Visa type too long." });
    if (args.hostCountry.length > 100) throw new ConvexError({ code: "INVALID_INPUT", message: "Host country too long." });
    if ((args.sponsorEmployer ?? "").length > 200) throw new ConvexError({ code: "INVALID_INPUT", message: "Sponsor name too long." });
    if ((args.notes ?? "").length > 1000) throw new ConvexError({ code: "INVALID_INPUT", message: "Notes too long (max 1,000 characters)." });

    // Validate dates
    const grant = new Date(args.grantDate);
    const expiry = new Date(args.expiryDate);
    if (isNaN(grant.getTime()) || isNaN(expiry.getTime())) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Invalid date format." });
    }
    if (expiry <= grant) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Expiry date must be after grant date." });
    }

    const now = new Date().toISOString();

    // Deactivate any existing active visa
    const existing = await ctx.db
      .query("visa_status")
      .withIndex("by_user_active", (q) => q.eq("userId", user._id).eq("active", true))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { active: false, updatedAt: now });
    }

    await ctx.db.insert("visa_status", {
      userId: user._id,
      jurisdiction: args.jurisdiction,
      visaType: args.visaType.trim(),
      hostCountry: args.hostCountry.trim(),
      grantDate: args.grantDate,
      expiryDate: args.expiryDate,
      sponsorEmployer: args.sponsorEmployer?.trim(),
      notes: args.notes?.trim(),
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteVisaStatus = mutation({
  args: { visaStatusId: v.id("visa_status") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const record = await ctx.db.get(args.visaStatusId);
    if (!record || record.userId !== user._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Visa record not found." });
    }
    await ctx.db.delete(args.visaStatusId);
  },
});
