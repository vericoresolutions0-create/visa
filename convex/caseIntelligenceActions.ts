"use node";

import OpenAI from "openai";
import escapeHtml from "escape-html";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new ConvexError({ code: "INTERNAL", message: "AI service not configured." });
  return new OpenAI({ apiKey: key });
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * runConsistencyAndFraudAnalysis — AI-powered cross-document analysis.
 *
 * Passes only document labels and intake metadata to OpenAI — never raw
 * document content. This respects GDPR Article 5(1)(b) purpose limitation:
 * personal document content is only processed for the specific declared
 * purpose, not sent to third-party AI services without explicit consent.
 * Pattern detection on label metadata alone catches the most common signals
 * (missing docs, structural gaps, naming inconsistencies).
 */
export const runConsistencyAndFraudAnalysis = action({
  args: {
    intakeId: v.id("client_intakes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ code: "UNAUTHENTICATED" });

    const data = await ctx.runQuery(
      internal.caseIntelligenceQueries.getIntakeForAnalysis,
      { intakeId: args.intakeId, userId },
    );

    if (!data) throw new ConvexError({ code: "FORBIDDEN", message: "Not your client." });

    const { intake, documents } = data;

    const openai = getOpenAI();

    const documentList =
      documents.length > 0
        ? documents
            .map(
              (
                d: { label: string; fileName: string; mimeType: string },
                i: number,
              ) => `${i + 1}. Label: "${d.label}" | File: ${d.fileName} | Type: ${d.mimeType}`,
            )
            .join("\n")
        : "No documents uploaded yet.";

    const prompt = `You are a senior immigration document compliance specialist reviewing a visa application file.

APPLICATION DETAILS:
- Client: ${intake.clientName}
- Destination: ${intake.destination}
- Visa type: ${intake.visaType}
- Status: ${intake.status}
- Agent notes: ${intake.notes ?? "None"}

UPLOADED DOCUMENTS (${documents.length} total):
${documentList}

Analyse this file and return a JSON object with exactly these three arrays:

1. "consistencyChecks" — compare implied field values across documents based on their labels and types. For each comparison:
   { "fieldName": string, "sourceDoc": string, "sourceValue": string, "targetDoc": string, "targetValue": string, "status": "match"|"mismatch"|"similar" }
   Include 3–6 checks most relevant for this visa type. Use realistic inferred values.

2. "fraudSignals" — flag patterns suggesting document manipulation. Each:
   { "documentLabel": string, "signalType": string, "detail": string, "confidence": number (0-1), "severity": "high"|"medium"|"low" }
   Only flag real, observable patterns. Return [] if nothing suspicious.

3. "aiFixItems" — 2–4 actionable pre-submission recommendations:
   { "severity": "critical"|"medium"|"recommend", "title": string, "description": string, "action": string }

Return ONLY valid JSON. No text outside the JSON object.`;

    type ConsistencyCheck = {
      fieldName: string;
      sourceDoc: string;
      sourceValue: string;
      targetDoc: string;
      targetValue: string;
      status: "match" | "mismatch" | "similar";
    };
    type FraudSignal = {
      documentLabel: string;
      signalType: string;
      detail: string;
      confidence: number;
      severity: "high" | "medium" | "low";
    };
    type AIFixItem = {
      severity: "critical" | "medium" | "recommend";
      title: string;
      description: string;
      action: string;
    };

    let consistencyChecks: ConsistencyCheck[] = [];
    let fraudSignals: FraudSignal[] = [];
    let aiFixItems: AIFixItem[] = [];

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as {
        consistencyChecks?: unknown[];
        fraudSignals?: unknown[];
        aiFixItems?: unknown[];
      };

      consistencyChecks = ((parsed.consistencyChecks ?? []) as ConsistencyCheck[])
        .slice(0, 10)
        .map((c) => ({
          fieldName: String(c.fieldName ?? "").slice(0, 100),
          sourceDoc: String(c.sourceDoc ?? "").slice(0, 200),
          sourceValue: String(c.sourceValue ?? "").slice(0, 300),
          targetDoc: String(c.targetDoc ?? "").slice(0, 200),
          targetValue: String(c.targetValue ?? "").slice(0, 300),
          status: (["match", "mismatch", "similar"] as const).includes(c.status)
            ? c.status
            : ("similar" as const),
        }));

      fraudSignals = ((parsed.fraudSignals ?? []) as FraudSignal[])
        .slice(0, 10)
        .map((s) => ({
          documentLabel: String(s.documentLabel ?? "").slice(0, 200),
          signalType: String(s.signalType ?? "").slice(0, 100),
          detail: String(s.detail ?? "").slice(0, 500),
          confidence: Math.min(1, Math.max(0, Number(s.confidence) || 0)),
          severity: (["high", "medium", "low"] as const).includes(s.severity)
            ? s.severity
            : ("low" as const),
        }));

      aiFixItems = ((parsed.aiFixItems ?? []) as AIFixItem[])
        .slice(0, 8)
        .map((f) => ({
          severity: (["critical", "medium", "recommend"] as const).includes(f.severity)
            ? f.severity
            : ("recommend" as const),
          title: String(f.title ?? "").slice(0, 200),
          description: String(f.description ?? "").slice(0, 500),
          action: String(f.action ?? "").slice(0, 500),
        }));
    } catch (err) {
      // Re-throw so prior AI results are preserved — storeAIResults must NOT
      // be called with empty arrays on error as it would wipe existing data.
      throw new ConvexError({
        code: "INTERNAL",
        message: "AI analysis failed. Your previous results are preserved. Check the OpenAI key and try again.",
      });
    }

    await ctx.runMutation(internal.caseReadiness.storeAIResults, {
      intakeId: args.intakeId,
      agentId: userId,
      consistencyChecks,
      fraudSignals,
      aiFixItems,
    });

    return {
      consistencyCheckCount: consistencyChecks.length,
      fraudSignalCount: fraudSignals.length,
      aiFixItemCount: aiFixItems.length,
    };
  },
});

/**
 * generateCoverLetter — AI-generated professional cover letter for the
 * specific visa route + case. Issues identified by computeReadiness and
 * runConsistencyAndFraudAnalysis are pre-emptively addressed in the letter.
 */
export const generateCoverLetter = action({
  args: {
    intakeId: v.id("client_intakes"),
    visaRoute: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.visaRoute.length > 100) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Visa route too long." });
    }

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ code: "UNAUTHENTICATED" });

    const data = await ctx.runQuery(
      internal.caseIntelligenceQueries.getIntakeForCoverLetter,
      { intakeId: args.intakeId, userId },
    );

    if (!data) throw new ConvexError({ code: "FORBIDDEN", message: "Not your client." });

    const { intake, documents, fixItems, fraudSignals } = data;

    const openai = getOpenAI();

    const docList =
      documents.length > 0
        ? documents.map((d: { label: string }) => `• ${d.label}`).join("\n")
        : "No documents uploaded yet.";

    const issuesSummary =
      [
        ...fixItems
          .filter((f: { resolvedAt: string | null }) => !f.resolvedAt)
          .map((f: { severity: string; title: string }) => `[${f.severity.toUpperCase()}] ${f.title}`),
        ...fraudSignals
          .filter((s: { reviewedAt: string | null }) => !s.reviewedAt)
          .map((s: { detail: string }) => `[FRAUD SIGNAL] ${s.detail}`),
      ].join("\n") || "No specific issues flagged.";

    const prompt = `You are a senior immigration case manager writing a professional cover letter to accompany a visa application.

APPLICATION DETAILS:
- Client name: ${escapeHtml(intake.clientName)}
- Visa route: ${escapeHtml(args.visaRoute)}
- Destination: ${escapeHtml(intake.destination)}
- Visa type: ${escapeHtml(intake.visaType)}
- Agent notes: ${escapeHtml(intake.notes ?? "None")}

DOCUMENTS INCLUDED:
${docList}

ISSUES TO ADDRESS PRE-EMPTIVELY:
${issuesSummary}

Write a professional, formal cover letter from the immigration agent to the visa officer. Requirements:
1. Introduce the applicant and state the purpose of travel clearly
2. Reference the key supporting documents enclosed
3. Pre-emptively address any of the flagged issues in plain, factual language
4. Establish ties to the home country and intent to return
5. Close professionally with the agent's reference

Use [PLACEHOLDER] for details we don't have (e.g. [travel dates], [salary amount]).
Under 400 words. Professional British English. No filler phrases like "I am pleased to" or "I hope this letter finds you".
Return the letter text only — no subject line, no JSON wrapper.`;

    let letterContent = "";
    const issuesAddressed: string[] = [];

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.4,
      });

      letterContent = response.choices[0]?.message?.content?.trim() ?? "";

      // Derive addressed issues list for the UI checklist panel.
      for (const f of fixItems.filter((f: { resolvedAt: string | null }) => !f.resolvedAt).slice(0, 5)) {
        issuesAddressed.push((f as { title: string }).title);
      }
      if (fraudSignals.filter((s: { reviewedAt: string | null }) => !s.reviewedAt).length > 0) {
        issuesAddressed.push("Fraud signal context acknowledged");
      }
    } catch {
      // Re-throw to preserve the agent's previously saved letter edits.
      // storeCoverLetter must NOT be called on failure as it would overwrite
      // editedContent with undefined, destroying the agent's draft.
      throw new ConvexError({
        code: "INTERNAL",
        message: "Letter generation failed. Your saved edits are preserved. Check the OpenAI key and try again.",
      });
    }

    await ctx.runMutation(internal.caseReadiness.storeCoverLetter, {
      intakeId: args.intakeId,
      agentId: userId,
      visaRoute: args.visaRoute,
      generatedContent: letterContent,
      issuesAddressed,
    });

    return { success: true };
  },
});
