"use node";

import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import * as crypto from "crypto";
import { EMBASSY_MONITOR_URLS } from "../src/lib/embassy-monitor-urls.ts";
import { getOpenAIClient } from "./openaiClient.ts";

// Strip HTML tags and normalise whitespace so the hash is stable across
// cosmetic reloads (session tokens, date headers, nav banners).
function extractTextFingerprint(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30_000);
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// Real, exact-match sentence diffing — no invented content. Short fragments
// (nav labels, single words) are dropped since they're rarely meaningful and
// would otherwise dominate the diff with cosmetic noise.
function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

function diffSentences(oldText: string, newText: string): { added: string[]; removed: string[] } {
  const oldSentences = splitIntoSentences(oldText);
  const newSentences = splitIntoSentences(newText);
  const oldSet = new Set(oldSentences);
  const newSet = new Set(newSentences);
  return {
    added: newSentences.filter((s) => !oldSet.has(s)).slice(0, 20),
    removed: oldSentences.filter((s) => !newSet.has(s)).slice(0, 20),
  };
}

// Summarizes a REAL detected diff — grounded strictly in the added/removed
// sentences actually found on the page, nothing else. Told explicitly to
// call out cosmetic/irrelevant noise rather than manufacture significance.
// Returns null (never throws) on any failure so a flaky AI call never blocks
// the underlying hash-diff monitoring, which is the real source of truth.
async function summarizeChange(
  destination: string,
  added: string[],
  removed: string[],
): Promise<{ summary: string; severity: "critical" | "notable" } | null> {
  if (added.length === 0 && removed.length === 0) return null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const openai = getOpenAIClient(apiKey);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `You are analyzing a REAL detected change on ${destination}'s official government visa/immigration webpage. ` +
            `You are given the exact sentences added and removed between the previous and current version of the page — ` +
            `nothing else. Write a short, factual, plain-English summary (2-4 sentences) of what actually changed and why ` +
            `an immigration applicant or admin might care. Do not invent or assume anything beyond the given text. If the ` +
            `change looks like navigation, cosmetic wording, or unrelated noise rather than a substantive policy/fee/` +
            `document change, say so plainly instead of overstating it. Classify severity: "critical" if it involves fees, ` +
            `eligibility requirements, required documents, or processing rules; "notable" for everything else meaningful. ` +
            `Return a JSON object with exactly these keys: {"summary": string, "severity": "critical" | "notable"}.`,
        },
        { role: "user", content: JSON.stringify({ added, removed }) },
      ],
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    if (!parsed.summary || typeof parsed.summary !== "string") return null;
    return { summary: parsed.summary, severity: parsed.severity === "critical" ? "critical" : "notable" };
  } catch (err) {
    console.error(`summarizeChange failed for ${destination}`, err);
    return null;
  }
}

async function checkOneDestination(
  ctx: ActionCtx,
  destination: string,
  url: string,
  checkedAt: string,
  stored: Record<string, { contentHash: string; textSnapshot?: string }>,
) {
  let newText = "";
  let newHash = "";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "VisaClear-EmbassyMonitor/1.0 (+https://visaclear.app)",
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      console.error(`checkOneDestination: ${destination} (${url}) returned HTTP ${res.status} — skipping this run, lastCheckedAt stays frozen.`);
      return;
    }
    const html = await res.text();
    newText = extractTextFingerprint(html);
    newHash = sha256(newText);
  } catch (err) {
    // Timeout or network error — skip this destination for this run.
    // lastCheckedAt intentionally stays frozen at its last real success
    // (never updated to "now" on a failure) so systemHealth.ts's per-destination
    // staleness check can actually detect a destination that's been silently
    // failing for weeks, instead of every run looking identical to a fresh one.
    console.error(`checkOneDestination: ${destination} (${url}) failed — ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  const prev = stored[destination];
  const changed = !!prev && prev.contentHash !== newHash;

  let aiResult: { summary: string; severity: "critical" | "notable" } | null = null;
  let added: string[] = [];
  let removed: string[] = [];
  if (changed && prev.textSnapshot) {
    ({ added, removed } = diffSentences(prev.textSnapshot, newText));
    aiResult = await summarizeChange(destination, added, removed);
  }

  await ctx.runMutation(internal.embassyData.saveSnapshot, {
    destination,
    url,
    contentHash: newHash,
    lastCheckedAt: checkedAt,
    changed,
    previousHash: changed ? prev.contentHash : undefined,
    textSnapshot: newText,
    aiSummary: aiResult?.summary,
    aiSeverity: aiResult?.severity,
    aiChangeAdded: aiResult ? added : undefined,
    aiChangeRemoved: aiResult ? removed : undefined,
  });
}

// How many government pages to fetch concurrently. Kept well below the full
// destination count (~190+) so a run doesn't open that many sockets at once
// from a single action invocation — batches run one after another instead.
const CONCURRENCY = 20;

// Weekly cron action — fetches each monitored embassy page, hashes its text
// fingerprint, and alerts admin if the content changed since last check.
// Fetch-errors are silently skipped — intermittent failures on gov sites
// shouldn't trigger false-positive alerts. Runs in concurrency-limited
// batches (see CONCURRENCY) rather than one giant Promise.all, since the
// monitored list now spans most of the world, not just 24 destinations.
export const checkEmbassyPages = internalAction({
  args: {},
  handler: async (ctx) => {
    const checkedAt = new Date().toISOString();

    // Read all stored snapshots in one query before any fetches start.
    const stored: Record<string, { contentHash: string; textSnapshot?: string }> = await ctx.runQuery(
      internal.embassyData.getAllSnapshots,
      {},
    );

    const destinations = Object.keys(EMBASSY_MONITOR_URLS);

    for (let i = 0; i < destinations.length; i += CONCURRENCY) {
      const batch = destinations.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map((destination) => {
          const url = EMBASSY_MONITOR_URLS[destination];
          if (!url) return Promise.resolve();
          return checkOneDestination(ctx, destination, url, checkedAt, stored);
        }),
      );
    }
  },
});
