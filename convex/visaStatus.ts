import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getCurrentUserOrThrow } from "./authHelpers.ts";

// ── Jurisdiction rules ──────────────────────────────────────────────────────
// Each entry defines how absence is measured and the qualifying period.
export const JURISDICTIONS = {
  uk_ilr: {
    label: "UK — Indefinite Leave to Remain",
    hostCountry: "United Kingdom",
    qualifyingYears: 5,
    absenceRule: "rolling_year",   // max 180 days in any rolling 12-month period
    maxDaysPerYear: 180,
    warningDays: 150,
    flagName: "🇬🇧",
  },
  eu_ltr: {
    label: "EU — Long-Term Residency (Directive 2003/109/EC)",
    hostCountry: "EU Member State",
    qualifyingYears: 5,
    absenceRule: "eu_ltr",         // max 6 consecutive months OR 10 months total over 5 years
    maxConsecutiveDays: 182,
    maxTotalDays: 304,             // ~10 months
    warningConsecutiveDays: 150,
    warningTotalDays: 270,
    flagName: "🇪🇺",
  },
  de_nbe: {
    label: "Germany — Niederlassungserlaubnis",
    hostCountry: "Germany",
    qualifyingYears: 5,
    absenceRule: "eu_ltr",
    maxConsecutiveDays: 182,
    maxTotalDays: 304,
    warningConsecutiveDays: 150,
    warningTotalDays: 270,
    flagName: "🇩🇪",
  },
  fr_cr: {
    label: "France — Carte de résident",
    hostCountry: "France",
    qualifyingYears: 5,
    absenceRule: "eu_ltr",
    maxConsecutiveDays: 182,
    maxTotalDays: 304,
    warningConsecutiveDays: 150,
    warningTotalDays: 270,
    flagName: "🇫🇷",
  },
  nl_vvotd: {
    label: "Netherlands — Verblijfsvergunning voor onbepaalde tijd",
    hostCountry: "Netherlands",
    qualifyingYears: 5,
    absenceRule: "eu_ltr",
    maxConsecutiveDays: 182,
    maxTotalDays: 304,
    warningConsecutiveDays: 150,
    warningTotalDays: 270,
    flagName: "🇳🇱",
  },
  pl_kp: {
    label: "Poland — Karta Pobytu (Temporary)",
    hostCountry: "Poland",
    qualifyingYears: 5,
    absenceRule: "eu_ltr",
    maxConsecutiveDays: 182,
    maxTotalDays: 304,
    warningConsecutiveDays: 150,
    warningTotalDays: 270,
    flagName: "🇵🇱",
  },
  pl_perm: {
    label: "Poland — Zezwolenie na pobyt stały (Permanent)",
    hostCountry: "Poland",
    qualifyingYears: 5,
    absenceRule: "eu_ltr",
    maxConsecutiveDays: 182,
    maxTotalDays: 304,
    warningConsecutiveDays: 150,
    warningTotalDays: 270,
    flagName: "🇵🇱",
  },
  lt_lgl: {
    label: "Lithuania — Leidimas gyventi",
    hostCountry: "Lithuania",
    qualifyingYears: 5,
    absenceRule: "eu_ltr",
    maxConsecutiveDays: 182,
    maxTotalDays: 304,
    warningConsecutiveDays: 150,
    warningTotalDays: 270,
    flagName: "🇱🇹",
  },
  be_ts: {
    label: "Belgium — Titre de séjour",
    hostCountry: "Belgium",
    qualifyingYears: 5,
    absenceRule: "eu_ltr",
    maxConsecutiveDays: 182,
    maxTotalDays: 304,
    warningConsecutiveDays: 150,
    warningTotalDays: 270,
    flagName: "🇧🇪",
  },
  at_nb: {
    label: "Austria — Niederlassungsbewilligung",
    hostCountry: "Austria",
    qualifyingYears: 5,
    absenceRule: "eu_ltr",
    maxConsecutiveDays: 182,
    maxTotalDays: 304,
    warningConsecutiveDays: 150,
    warningTotalDays: 270,
    flagName: "🇦🇹",
  },
  se_ut: {
    label: "Sweden — Uppehållstillstånd",
    hostCountry: "Sweden",
    qualifyingYears: 5,
    absenceRule: "eu_ltr",
    maxConsecutiveDays: 182,
    maxTotalDays: 304,
    warningConsecutiveDays: 150,
    warningTotalDays: 270,
    flagName: "🇸🇪",
  },
  ie_stamp4: {
    label: "Ireland — Stamp 4 (Permission to Remain)",
    hostCountry: "Ireland",
    qualifyingYears: 5,
    absenceRule: "rolling_year",
    maxDaysPerYear: 180,
    warningDays: 150,
    flagName: "🇮🇪",
  },
  other: {
    label: "Other jurisdiction",
    hostCountry: "",
    qualifyingYears: 5,
    absenceRule: "rolling_year",
    maxDaysPerYear: 180,
    warningDays: 150,
    flagName: "🌍",
  },
} as const;

export type JurisdictionKey = keyof typeof JURISDICTIONS;

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
