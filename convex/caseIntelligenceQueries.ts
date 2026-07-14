// Internal queries used exclusively by caseIntelligenceActions.ts.
// Must be in a separate file because "use node" files cannot export queries.

import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const getIntakeForAnalysis = internalQuery({
  args: {
    intakeId: v.id("client_intakes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const intake = await ctx.db.get(args.intakeId);
    if (!intake || intake.agentId !== args.userId) return null;

    const user = await ctx.db.get(args.userId);
    if (!user?.agentPlan) return null;

    const documents = await ctx.db
      .query("client_documents")
      .withIndex("by_intake", (q) => q.eq("intakeId", args.intakeId))
      .take(30);

    return {
      intake: {
        _id: intake._id,
        clientName: intake.clientName,
        destination: intake.destination,
        visaType: intake.visaType,
        status: intake.status,
        notes: intake.notes ?? null,
      },
      documents: documents.map((d) => ({
        label: d.label,
        fileName: d.fileName,
        mimeType: d.mimeType,
      })),
    };
  },
});

export const getIntakeForCoverLetter = internalQuery({
  args: {
    intakeId: v.id("client_intakes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const intake = await ctx.db.get(args.intakeId);
    if (!intake || intake.agentId !== args.userId) return null;

    const user = await ctx.db.get(args.userId);
    if (!user?.agentPlan) return null;

    const [documents, fixItems, fraudSignals] = await Promise.all([
      ctx.db
        .query("client_documents")
        .withIndex("by_intake", (q) => q.eq("intakeId", args.intakeId))
        .take(30),
      ctx.db
        .query("case_fix_items")
        .withIndex("by_intake", (q) => q.eq("intakeId", args.intakeId))
        .take(30),
      ctx.db
        .query("fraud_signals")
        .withIndex("by_intake", (q) => q.eq("intakeId", args.intakeId))
        .take(10),
    ]);

    return {
      intake: {
        _id: intake._id,
        clientName: intake.clientName,
        destination: intake.destination,
        visaType: intake.visaType,
        status: intake.status,
        notes: intake.notes ?? null,
      },
      documents: documents.map((d) => ({ label: d.label })),
      fixItems: fixItems.map((f) => ({
        severity: f.severity,
        title: f.title,
        resolvedAt: f.resolvedAt ?? null,
      })),
      fraudSignals: fraudSignals.map((s) => ({
        detail: s.detail,
        reviewedAt: s.reviewedAt ?? null,
      })),
    };
  },
});
