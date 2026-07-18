import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.js";
import { getCurrentUserOrThrow } from "./authHelpers.ts";
import { getChecklist, type VisaType } from "../src/lib/visa-data.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}


// ── Public mutations ───────────────────────────────────────────────────────────

/**
 * computeReadinessImpl — generates CRITICAL fix items for any required
 * document label that is not represented in the uploaded set, plus
 * structural MEDIUM/RECOMMEND items based on intake state.
 *
 * All fix items for this intake are replaced on every run so the list is
 * always current and never accumulates stale rows.
 */
// Shared by computeReadiness (agent-invoked from the frontend, which passes
// requiredDocLabels sourced from its own checklist data) and
// recomputeReadinessForUpload (called server-side from clientIntakes.ts's
// recordDocument, which has no frontend to source that list from — see the
// getChecklist-based lookup on that path below). Keeping this as a plain
// function called directly, not a second Convex mutation, means the upload
// path's recompute happens atomically in the same transaction as the
// document insert rather than a separate round trip.
async function computeReadinessImpl(
  ctx: MutationCtx,
  intake: Doc<"client_intakes">,
  agentId: Id<"users">,
  requiredDocLabels: string[],
) {
    // All uploaded documents for this intake.
    const documents = await ctx.db
      .query("client_documents")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .take(50);

    const uploadedCount = documents.length;
    const requiredCount = requiredDocLabels.length;

    // Score: ratio of uploaded to required. Capped at 100 even if more docs
    // than strictly required are uploaded. Always 100 if no required docs are
    // specified (visa type with no checklist data) — a visa type with zero
    // requirements is trivially "ready" regardless of how many (zero or more)
    // documents have been uploaded.
    const score =
      requiredCount > 0
        ? Math.min(100, Math.round((uploadedCount / requiredCount) * 100))
        : 100;

    // Determine which required doc categories are missing via fuzzy label match.
    const uploadedNorm = documents.map((d) => d.label.toLowerCase().trim());
    const missingLabels = requiredDocLabels.filter((req) => {
      const reqNorm = req.toLowerCase().trim();
      return !uploadedNorm.some((u) => u.includes(reqNorm) || reqNorm.includes(u));
    });

    // Delete existing fix items (non-AI-generated) for this intake.
    const existingFixes = await ctx.db
      .query("case_fix_items")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .take(100);
    for (const fix of existingFixes) {
      if (fix.category !== "consistency" && fix.category !== "fraud" && fix.category !== "ai_suggestion") {
        await ctx.db.delete(fix._id);
      }
    }

    // Generate new fix items.
    const fixItems: {
      severity: "critical" | "medium" | "recommend";
      category: "missing_document" | "stale_intake" | "no_documents" | "consistency" | "fraud" | "ai_suggestion";
      title: string;
      description: string;
      action: string;
    }[] = [];

    // CRITICAL — each missing required document.
    for (const label of missingLabels) {
      fixItems.push({
        severity: "critical",
        category: "missing_document",
        title: `Missing required document: ${label}`,
        description: `This document is required for ${intake.destination} ${intake.visaType} applications but has not been uploaded yet.`,
        action: `Ask the client to upload their ${label} through the client portal link.`,
      });
    }

    // MEDIUM — intake has been waiting more than 7 days with no documents.
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(intake.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (intake.status === "awaiting_documents" && daysSinceCreated >= 7 && uploadedCount === 0) {
      fixItems.push({
        severity: "medium",
        category: "stale_intake",
        title: `No documents received in ${daysSinceCreated} days`,
        description: "The client has not uploaded any documents since the intake was created.",
        action:
          "Follow up with the client via WhatsApp or email. Resend the client portal upload link.",
      });
    } else if (intake.status === "awaiting_documents" && daysSinceCreated >= 5 && uploadedCount === 0) {
      fixItems.push({
        severity: "medium",
        category: "stale_intake",
        title: "Client yet to start uploading documents",
        description: `Intake created ${daysSinceCreated} days ago with no documents uploaded.`,
        action: "Send a gentle reminder via WhatsApp. Check the client portal link is correct.",
      });
    }

    // RECOMMEND — no documents at all uploaded yet.
    if (uploadedCount === 0 && intake.status === "awaiting_documents") {
      fixItems.push({
        severity: "recommend",
        category: "no_documents",
        title: "Send the client portal upload link",
        description: "The client has not yet received or used their upload link.",
        action:
          "Use the WhatsApp or copy-link buttons on the client card to share the upload portal.",
      });
    }

    // RECOMMEND — no agent notes added.
    if (!intake.notes) {
      fixItems.push({
        severity: "recommend",
        category: "ai_suggestion",
        title: "Add internal case notes",
        description: "No notes have been recorded for this client yet.",
        action:
          "Add notes about any special circumstances, agreed timelines, or client concerns.",
      });
    }

    // Insert all new fix items.
    for (const item of fixItems) {
      await ctx.db.insert("case_fix_items", {
        agentId,
        intakeId: intake._id,
        ...item,
      });
    }

    // Count by severity (include AI-generated fix items that were preserved above).
    const allFixes = await ctx.db
      .query("case_fix_items")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .take(100);
    const criticalCount = allFixes.filter((f) => f.severity === "critical" && !f.resolvedAt).length;
    const mediumCount = allFixes.filter((f) => f.severity === "medium" && !f.resolvedAt).length;
    const recommendCount = allFixes.filter((f) => f.severity === "recommend" && !f.resolvedAt).length;

    // Current fraud signal count.
    const fraudSignals = await ctx.db
      .query("fraud_signals")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .take(20);
    const fraudSignalCount = fraudSignals.filter((s) => !s.reviewedAt).length;

    // Upsert the readiness row.
    const existing = await ctx.db
      .query("case_readiness")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .unique();

    const readinessData = {
      agentId,
      intakeId: intake._id,
      score,
      uploadedCount,
      requiredCount,
      criticalCount,
      mediumCount,
      recommendCount,
      fraudSignalCount,
      computedAt: now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, readinessData);
    } else {
      await ctx.db.insert("case_readiness", readinessData);
    }

    return { score, uploadedCount, requiredCount, criticalCount, mediumCount, recommendCount, fraudSignalCount };
}

export const computeReadiness = mutation({
  args: {
    intakeId: v.id("client_intakes"),
    // Required doc labels from getChecklist(destination, visaType).items
    // .filter(i => i.required).map(i => i.title) — passed from frontend to
    // avoid duplicating checklist data in the backend.
    requiredDocLabels: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);
    if (!agent.agentPlan) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Active agent plan required." });
    }

    const intake = await ctx.db.get(args.intakeId);
    if (!intake || intake.agentId !== agent._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your client." });
    }

    return await computeReadinessImpl(ctx, intake, agent._id, args.requiredDocLabels);
  },
});

// Called directly (same transaction, not scheduled) from clientIntakes.ts's
// recordDocument whenever a client uploads a document through the unauthenticated
// portal link — that path has no frontend checklist to source requiredDocLabels
// from the way the agent-invoked computeReadiness above does, so it derives the
// same list itself from the shared checklist data. Without this, the readiness
// score/critical-count badge stayed stale after a client fixed exactly the gap
// the agent was waiting on, until the agent happened to reopen the panel and
// click "Compute" again.
export async function recomputeReadinessForUpload(ctx: MutationCtx, intake: Doc<"client_intakes">) {
  const checklist = getChecklist(intake.destination, intake.visaType as VisaType);
  const requiredDocLabels = checklist?.items.filter((i) => i.required).map((i) => i.title) ?? [];
  await computeReadinessImpl(ctx, intake, intake.agentId, requiredDocLabels);
}

/**
 * resolveFixItem — agent marks a fix item as done. Syncs the readiness row
 * counts so the client card badge reflects the change immediately.
 */
export const resolveFixItem = mutation({
  args: { fixItemId: v.id("case_fix_items") },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);
    if (!agent.agentPlan) throw new ConvexError({ code: "FORBIDDEN" });

    const fix = await ctx.db.get(args.fixItemId);
    if (!fix || fix.agentId !== agent._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your fix item." });
    }

    await ctx.db.patch(args.fixItemId, { resolvedAt: now() });

    // Reads after writes in the same mutation see the updated state, so querying
    // now gives us the correct post-patch counts for the badge.
    const allFixes = await ctx.db
      .query("case_fix_items")
      .withIndex("by_intake", (q) => q.eq("intakeId", fix.intakeId))
      .take(200);
    const readiness = await ctx.db
      .query("case_readiness")
      .withIndex("by_intake", (q) => q.eq("intakeId", fix.intakeId))
      .unique();
    if (readiness) {
      await ctx.db.patch(readiness._id, {
        criticalCount:  allFixes.filter((f) => f.severity === "critical"  && !f.resolvedAt).length,
        mediumCount:    allFixes.filter((f) => f.severity === "medium"    && !f.resolvedAt).length,
        recommendCount: allFixes.filter((f) => f.severity === "recommend" && !f.resolvedAt).length,
      });
    }
  },
});

/**
 * unresolveFixItem — agent reverses a resolution. Syncs the readiness row
 * counts so the client card badge reflects the change immediately.
 */
export const unresolveFixItem = mutation({
  args: { fixItemId: v.id("case_fix_items") },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);
    if (!agent.agentPlan) throw new ConvexError({ code: "FORBIDDEN" });

    const fix = await ctx.db.get(args.fixItemId);
    if (!fix || fix.agentId !== agent._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your fix item." });
    }

    await ctx.db.patch(args.fixItemId, { resolvedAt: undefined });

    // Reads after writes in the same mutation see the updated state.
    const allFixes = await ctx.db
      .query("case_fix_items")
      .withIndex("by_intake", (q) => q.eq("intakeId", fix.intakeId))
      .take(200);
    const readiness = await ctx.db
      .query("case_readiness")
      .withIndex("by_intake", (q) => q.eq("intakeId", fix.intakeId))
      .unique();
    if (readiness) {
      await ctx.db.patch(readiness._id, {
        criticalCount:  allFixes.filter((f) => f.severity === "critical"  && !f.resolvedAt).length,
        mediumCount:    allFixes.filter((f) => f.severity === "medium"    && !f.resolvedAt).length,
        recommendCount: allFixes.filter((f) => f.severity === "recommend" && !f.resolvedAt).length,
      });
    }
  },
});

/**
 * reviewFraudSignal — agent marks a fraud signal as reviewed. Syncs the
 * fraudSignalCount on the readiness row so the badge updates immediately.
 */
export const reviewFraudSignal = mutation({
  args: { signalId: v.id("fraud_signals") },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);
    if (!agent.agentPlan) throw new ConvexError({ code: "FORBIDDEN" });

    const signal = await ctx.db.get(args.signalId);
    if (!signal || signal.agentId !== agent._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your signal." });
    }

    await ctx.db.patch(args.signalId, { reviewedAt: now() });

    // Reads after writes in the same mutation see the updated state.
    const allSignals = await ctx.db
      .query("fraud_signals")
      .withIndex("by_intake", (q) => q.eq("intakeId", signal.intakeId))
      .take(100);
    const readiness = await ctx.db
      .query("case_readiness")
      .withIndex("by_intake", (q) => q.eq("intakeId", signal.intakeId))
      .unique();
    if (readiness) {
      await ctx.db.patch(readiness._id, {
        fraudSignalCount: allSignals.filter((s) => !s.reviewedAt).length,
      });
    }
  },
});

/**
 * saveCoverLetter — agent saves their edited version of the AI-generated cover
 * letter. Only stores the edit; the generated content is immutable once created
 * so the agent can always revert to the original.
 */
export const saveCoverLetter = mutation({
  args: {
    intakeId: v.id("client_intakes"),
    editedContent: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);
    if (!agent.agentPlan) throw new ConvexError({ code: "FORBIDDEN" });

    const intake = await ctx.db.get(args.intakeId);
    if (!intake || intake.agentId !== agent._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your client." });
    }

    if (args.editedContent.length > 20000) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Cover letter too long." });
    }

    const existing = await ctx.db
      .query("cover_letters")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .unique();

    if (!existing) {
      throw new ConvexError({ code: "NOT_FOUND", message: "No cover letter found for this intake. Generate one first." });
    }

    await ctx.db.patch(existing._id, {
      editedContent: args.editedContent,
      updatedAt: now(),
    });
  },
});

// ── Public queries ─────────────────────────────────────────────────────────────

/**
 * getIntakeReadiness — full case intelligence data for a single intake.
 * Returns readiness score, fix items, consistency checks, fraud signals,
 * and cover letter. All tenant-isolated: verifies agentId === current user.
 */
export const getIntakeReadiness = query({
  args: { intakeId: v.id("client_intakes") },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);
    if (!agent.agentPlan) return null;

    const intake = await ctx.db.get(args.intakeId);
    if (!intake || intake.agentId !== agent._id) return null;

    const [readiness, fixItems, consistencyChecks, fraudSignals, coverLetter] = await Promise.all([
      ctx.db
        .query("case_readiness")
        .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
        .unique(),
      ctx.db
        .query("case_fix_items")
        .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
        .take(50),
      ctx.db
        .query("document_consistency_checks")
        .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
        .take(30),
      ctx.db
        .query("fraud_signals")
        .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
        .take(20),
      ctx.db
        .query("cover_letters")
        .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
        .unique(),
    ]);

    return {
      readiness,
      fixItems,
      consistencyChecks,
      fraudSignals,
      coverLetter,
    };
  },
});

/**
 * getAgentReadinessSummary — lightweight query returning readiness scores for
 * all of the agent's active intakes. Used to show % badges on every client card
 * in the pipeline without loading full case intelligence data.
 */
export const getAgentReadinessSummary = query({
  args: {},
  handler: async (ctx) => {
    const agent = await getCurrentUserOrThrow(ctx);
    if (!agent.agentPlan) return [];

    const rows = await ctx.db
      .query("case_readiness")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .take(200);

    return rows.map((r) => ({
      intakeId: r.intakeId,
      score: r.score,
      criticalCount: r.criticalCount,
      mediumCount: r.mediumCount,
      fraudSignalCount: r.fraudSignalCount,
      computedAt: r.computedAt,
    }));
  },
});

// ── Internal mutations (called by AI action) ──────────────────────────────────

/**
 * storeAIResults — called by caseIntelligenceActions to persist AI analysis
 * results after running. Internal only — never exposed to the client.
 */
export const storeAIResults = internalMutation({
  args: {
    intakeId: v.id("client_intakes"),
    agentId: v.id("users"),
    consistencyChecks: v.array(
      v.object({
        fieldName: v.string(),
        sourceDoc: v.string(),
        sourceValue: v.string(),
        targetDoc: v.string(),
        targetValue: v.string(),
        status: v.union(v.literal("match"), v.literal("mismatch"), v.literal("similar")),
      }),
    ),
    fraudSignals: v.array(
      v.object({
        documentLabel: v.string(),
        signalType: v.string(),
        detail: v.string(),
        confidence: v.number(),
        severity: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
      }),
    ),
    aiFixItems: v.array(
      v.object({
        severity: v.union(v.literal("critical"), v.literal("medium"), v.literal("recommend")),
        title: v.string(),
        description: v.string(),
        action: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const ts = now();

    // Replace existing AI-generated consistency checks for this intake.
    const oldChecks = await ctx.db
      .query("document_consistency_checks")
      .withIndex("by_intake", (q) => q.eq("intakeId", args.intakeId))
      .take(50);
    for (const c of oldChecks) await ctx.db.delete(c._id);

    for (const check of args.consistencyChecks) {
      await ctx.db.insert("document_consistency_checks", {
        agentId: args.agentId,
        intakeId: args.intakeId,
        ...check,
        generatedAt: ts,
      });
    }

    // Replace existing fraud signals.
    const oldSignals = await ctx.db
      .query("fraud_signals")
      .withIndex("by_intake", (q) => q.eq("intakeId", args.intakeId))
      .take(30);
    for (const s of oldSignals) await ctx.db.delete(s._id);

    for (const signal of args.fraudSignals) {
      await ctx.db.insert("fraud_signals", {
        agentId: args.agentId,
        intakeId: args.intakeId,
        ...signal,
        generatedAt: ts,
      });
    }

    // Replace existing AI-sourced fix items (keep document-gap items).
    const oldAiFixes = await ctx.db
      .query("case_fix_items")
      .withIndex("by_intake", (q) => q.eq("intakeId", args.intakeId))
      .take(100);
    for (const f of oldAiFixes) {
      if (
        f.category === "consistency" ||
        f.category === "fraud" ||
        f.category === "ai_suggestion"
      ) {
        await ctx.db.delete(f._id);
      }
    }

    for (const item of args.aiFixItems) {
      await ctx.db.insert("case_fix_items", {
        agentId: args.agentId,
        intakeId: args.intakeId,
        category:
          item.severity === "critical" &&
          item.title.toLowerCase().includes("fraud")
            ? "fraud"
            : item.title.toLowerCase().includes("mismatch") ||
                item.title.toLowerCase().includes("inconsistency")
              ? "consistency"
              : "ai_suggestion",
        ...item,
      });
    }

    // Recount all fix items (including newly inserted AI items) and update readiness row.
    const allFixes = await ctx.db
      .query("case_fix_items")
      .withIndex("by_intake", (q) => q.eq("intakeId", args.intakeId))
      .take(200);
    const criticalCount = allFixes.filter((f) => f.severity === "critical" && !f.resolvedAt).length;
    const mediumCount = allFixes.filter((f) => f.severity === "medium" && !f.resolvedAt).length;
    const recommendCount = allFixes.filter((f) => f.severity === "recommend" && !f.resolvedAt).length;

    const readiness = await ctx.db
      .query("case_readiness")
      .withIndex("by_intake", (q) => q.eq("intakeId", args.intakeId))
      .unique();
    if (readiness) {
      await ctx.db.patch(readiness._id, {
        aiAnalysisRunAt: ts,
        fraudSignalCount: args.fraudSignals.length,
        criticalCount,
        mediumCount,
        recommendCount,
      });
    }
  },
});

/**
 * storeCoverLetter — called by generateCoverLetter action to persist the
 * AI-generated letter. Internal only.
 */
export const storeCoverLetter = internalMutation({
  args: {
    intakeId: v.id("client_intakes"),
    agentId: v.id("users"),
    visaRoute: v.string(),
    generatedContent: v.string(),
    issuesAddressed: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cover_letters")
      .withIndex("by_intake", (q) => q.eq("intakeId", args.intakeId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        visaRoute: args.visaRoute,
        generatedContent: args.generatedContent,
        issuesAddressed: args.issuesAddressed,
        generatedAt: now(),
        editedContent: undefined,
        updatedAt: undefined,
      });
    } else {
      await ctx.db.insert("cover_letters", {
        agentId: args.agentId,
        intakeId: args.intakeId,
        visaRoute: args.visaRoute,
        generatedContent: args.generatedContent,
        issuesAddressed: args.issuesAddressed,
        generatedAt: now(),
      });
    }
  },
});

// ── Admin: platform-wide stats ─────────────────────────────────────────────────

/**
 * getAdminCaseIntelligenceStats — returns aggregate case intelligence stats
 * for the admin overview panel. Admin-only: enforced by checking users.role.
 */
export const getAdminCaseIntelligenceStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin only." });
    }

    const [readinessRows, fraudRows] = await Promise.all([
      ctx.db.query("case_readiness").take(500),
      ctx.db.query("fraud_signals").take(500),
    ]);

    const totalChecks = readinessRows.length;
    const avgScore =
      totalChecks > 0
        ? Math.round(readinessRows.reduce((sum, r) => sum + r.score, 0) / totalChecks)
        : 0;
    const criticalCases = readinessRows.filter((r) => r.criticalCount > 0).length;
    const totalFraudSignals = fraudRows.filter((s) => !s.reviewedAt).length;
    const highFraudSignals = fraudRows.filter(
      (s) => s.severity === "high" && !s.reviewedAt,
    ).length;

    return {
      totalChecks,
      avgScore,
      criticalCases,
      totalFraudSignals,
      highFraudSignals,
    };
  },
});
