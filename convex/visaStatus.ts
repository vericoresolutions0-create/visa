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

// ── Document readiness checklist ────────────────────────────────────────────
// Real, user-confirmed state for each ILR/settlement document — nothing here
// is inferred from elapsed time or hardcoded. A partial update: only the
// fields actually present in args are touched, so saving one field (e.g.
// just the passport date) never silently clears the others.
const MAX_QUALIFYING_YEAR = 5;

export const updateDocumentChecklist = mutation({
  args: {
    passportExpiryDate: v.optional(v.string()),
    employmentRecordsConfirmedYears: v.optional(v.array(v.number())),
    travelLogConfirmedComplete: v.optional(v.boolean()),
    lifeInUkTestTaken: v.optional(v.boolean()),
    lifeInUkTestDate: v.optional(v.string()),
    englishQualificationConfirmed: v.optional(v.boolean()),
    englishQualificationType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const visa = await ctx.db
      .query("visa_status")
      .withIndex("by_user_active", (q) => q.eq("userId", user._id).eq("active", true))
      .first();
    if (!visa) throw new ConvexError({ code: "NOT_FOUND", message: "Set up your visa status first." });

    if (args.passportExpiryDate !== undefined && isNaN(new Date(args.passportExpiryDate).getTime())) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Invalid passport expiry date." });
    }
    if (args.employmentRecordsConfirmedYears !== undefined) {
      const years = args.employmentRecordsConfirmedYears;
      if (years.some((y) => !Number.isInteger(y) || y < 1 || y > MAX_QUALIFYING_YEAR)) {
        throw new ConvexError({ code: "INVALID_INPUT", message: `Years must be whole numbers between 1 and ${MAX_QUALIFYING_YEAR}.` });
      }
      if (new Set(years).size !== years.length) {
        throw new ConvexError({ code: "INVALID_INPUT", message: "Duplicate years in the list." });
      }
    }
    if (args.lifeInUkTestDate !== undefined && isNaN(new Date(args.lifeInUkTestDate).getTime())) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Invalid test date." });
    }
    if ((args.englishQualificationType ?? "").length > 100) {
      throw new ConvexError({ code: "INVALID_INPUT", message: "Qualification type is too long." });
    }

    const patch: Record<string, string | boolean | number[] | undefined> = { updatedAt: new Date().toISOString() };
    if (args.passportExpiryDate !== undefined) patch.passportExpiryDate = args.passportExpiryDate;
    if (args.employmentRecordsConfirmedYears !== undefined) patch.employmentRecordsConfirmedYears = args.employmentRecordsConfirmedYears;
    if (args.travelLogConfirmedComplete !== undefined) patch.travelLogConfirmedComplete = args.travelLogConfirmedComplete;
    if (args.lifeInUkTestTaken !== undefined) patch.lifeInUkTestTaken = args.lifeInUkTestTaken;
    if (args.lifeInUkTestDate !== undefined) patch.lifeInUkTestDate = args.lifeInUkTestDate;
    if (args.englishQualificationConfirmed !== undefined) patch.englishQualificationConfirmed = args.englishQualificationConfirmed;
    if (args.englishQualificationType !== undefined) patch.englishQualificationType = args.englishQualificationType.trim();

    await ctx.db.patch(visa._id, patch);
  },
});

// Real, server-computed readiness — every figure here is derived from
// actual stored data (or an explicit user confirmation), never a constant.
// Computed server-side (not in the frontend) so the score can't drift from
// what's actually saved, and so it's the same number regardless of which
// client renders it.
export const getDocumentReadiness = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const visa = await ctx.db
      .query("visa_status")
      .withIndex("by_user_active", (q) => q.eq("userId", user._id).eq("active", true))
      .first();
    if (!visa) return null;

    const grant = new Date(visa.grantDate);
    const now = new Date();
    const monthsIntoJourney = Math.max(0, (now.getFullYear() - grant.getFullYear()) * 12 + (now.getMonth() - grant.getMonth()));
    // At least 1 so a brand-new visa (0 months in) doesn't divide by zero —
    // there's always "year 1" to account for from day one.
    const yearsElapsed = Math.max(1, Math.min(MAX_QUALIFYING_YEAR, Math.floor(monthsIntoJourney / 12) + (monthsIntoJourney % 12 > 0 ? 1 : 0) || 1));

    const ilrEligible = new Date(visa.grantDate);
    ilrEligible.setFullYear(ilrEligible.getFullYear() + MAX_QUALIFYING_YEAR);

    let passportReady = false;
    if (visa.passportExpiryDate) {
      const passportExpiry = new Date(visa.passportExpiryDate);
      const requiredBy = new Date(ilrEligible);
      requiredBy.setMonth(requiredBy.getMonth() + 6);
      passportReady = passportExpiry.getTime() >= requiredBy.getTime();
    }

    const confirmedYears = visa.employmentRecordsConfirmedYears ?? [];
    // Only years that have actually happened count toward the denominator —
    // can't require records for a year that hasn't occurred yet.
    const relevantConfirmedYears = confirmedYears.filter((y) => y <= yearsElapsed).length;
    const employmentRecordsRatio = Math.min(1, relevantConfirmedYears / yearsElapsed);

    const travelLogReady = visa.travelLogConfirmedComplete === true;
    const lifeInUkReady = visa.lifeInUkTestTaken === true;
    const englishReady = visa.englishQualificationConfirmed === true;

    const items = [
      {
        key: "passport",
        label: "Valid host-country passport (6+ months beyond ILR date)",
        ready: passportReady,
        detail: visa.passportExpiryDate ? `Expires ${visa.passportExpiryDate}` : "Not entered yet",
      },
      {
        key: "employment",
        label: `Employment records for all ${yearsElapsed} year${yearsElapsed === 1 ? "" : "s"} so far`,
        ready: employmentRecordsRatio >= 1,
        detail: `${relevantConfirmedYears} of ${yearsElapsed} confirmed`,
        percent: Math.round(employmentRecordsRatio * 100),
      },
      {
        key: "travelLog",
        label: "Complete absence travel log (full history required)",
        ready: travelLogReady,
        detail: travelLogReady ? "Confirmed complete" : "Not yet confirmed",
      },
      {
        key: "lifeInUk",
        label: "Life in the UK Test certificate (or equivalent)",
        ready: lifeInUkReady,
        detail: lifeInUkReady ? (visa.lifeInUkTestDate ? `Taken ${visa.lifeInUkTestDate}` : "Taken") : "Not yet taken",
      },
      {
        key: "english",
        label: "English language qualification (B1+ CEFR)",
        ready: englishReady,
        detail: englishReady ? (visa.englishQualificationType || "Confirmed") : "Not yet gathered",
      },
    ];

    const overallPercent = Math.round(
      ((passportReady ? 1 : 0) + employmentRecordsRatio + (travelLogReady ? 1 : 0) + (lifeInUkReady ? 1 : 0) + (englishReady ? 1 : 0)) / 5 * 100,
    );

    return { items, overallPercent, yearsElapsed };
  },
});
