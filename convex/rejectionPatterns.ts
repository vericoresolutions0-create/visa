import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getCurrentUser } from "./authHelpers.ts";

function corridorKey(origin: string, destination: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${norm(origin)}-${norm(destination)}`;
}

// Called from the rejection analyser action after each successful analysis.
// Stores only pattern intelligence — no userId, no letter content, no PII.
export const logPattern = internalMutation({
  args: {
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
    refusalCodes: v.array(v.string()),
    missingDocumentCategories: v.array(v.string()),
    successProbability: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("rejection_patterns", {
      corridor: corridorKey(args.origin, args.destination),
      origin: args.origin,
      destination: args.destination,
      visaType: args.visaType,
      refusalCodes: args.refusalCodes.filter(Boolean).slice(0, 10),
      missingDocumentCategories: args.missingDocumentCategories.filter(Boolean).slice(0, 10),
      successProbability: Math.min(100, Math.max(0, args.successProbability)),
      analysedAt: new Date().toISOString(),
    });
  },
});

// Admin-only aggregated corridor intelligence view.
export const getCorridorIntelligence = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "admin") return [];

    const patterns = await ctx.db
      .query("rejection_patterns")
      .order("desc")
      .take(2000);

    type Entry = {
      origin: string;
      destination: string;
      visaType: string;
      count: number;
      successProbTotal: number;
      refusalCodeCounts: Record<string, number>;
      missingDocCounts: Record<string, number>;
    };

    const corridorMap: Record<string, Entry> = {};

    for (const p of patterns) {
      const key = `${p.corridor}||${p.visaType}`;
      if (!corridorMap[key]) {
        corridorMap[key] = {
          origin: p.origin,
          destination: p.destination,
          visaType: p.visaType,
          count: 0,
          successProbTotal: 0,
          refusalCodeCounts: {},
          missingDocCounts: {},
        };
      }
      const e = corridorMap[key];
      e.count++;
      e.successProbTotal += p.successProbability;
      for (const code of p.refusalCodes) {
        e.refusalCodeCounts[code] = (e.refusalCodeCounts[code] ?? 0) + 1;
      }
      for (const doc of p.missingDocumentCategories) {
        e.missingDocCounts[doc] = (e.missingDocCounts[doc] ?? 0) + 1;
      }
    }

    return Object.values(corridorMap)
      .map((e) => ({
        origin: e.origin,
        destination: e.destination,
        visaType: e.visaType,
        analysisCount: e.count,
        avgSuccessProbability: Math.round(e.successProbTotal / e.count),
        topRefusalCodes: Object.entries(e.refusalCodeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([code, count]) => ({ code, count })),
        topMissingDocs: Object.entries(e.missingDocCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([doc, count]) => ({ doc, count })),
      }))
      .sort((a, b) => b.analysisCount - a.analysisCount);
  },
});
