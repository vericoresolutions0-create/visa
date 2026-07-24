import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

const PAID_PLANS = ["pro", "expert"] as const;
const EXPIRY_WINDOW_DAYS = 60;
const EMBASSY_UPDATE_WINDOW_DAYS = 7;
const STALE_CHECKLIST_DAYS = 14;

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Real applicant IDs the digest should even look at — no point building
// content for a free user who'd never receive it (this list itself gates
// the paid feature, same as every other paid-only email in this app).
export const getPaidUserIdsForDigest = internalQuery({
  args: {},
  handler: async (ctx) => {
    const results = await Promise.all(
      PAID_PLANS.map((plan) => ctx.db.query("users").withIndex("by_plan", (q) => q.eq("plan", plan)).take(2000)),
    );
    return results.flat().map((u) => ({ userId: u._id, email: u.email, name: u.name }));
  },
});

// Everything the weekly digest could say for one user. Returns null when
// there's genuinely nothing to report — the founder's explicit rule from
// the original mockup was "skip sending entirely" rather than a filler
// "nothing new this week!" email, so the caller (applicantDigestDispatch.ts)
// only sends when this comes back non-null.
export const buildDigestForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const [documents, allChecklists] = await Promise.all([
      ctx.db.query("vault_documents").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(200),
      ctx.db.query("saved_checklists").withIndex("by_user", (q) => q.eq("userId", args.userId)).take(200),
    ]);
    // Filtered in memory rather than via by_user_archived: `archived` is an
    // optional boolean, unset (not `false`) on every checklist created
    // before archiving existed, and an index equality match against
    // `undefined` is not a reliable way to mean "field absent" — this is
    // unambiguous and the list is already capped at 200.
    const checklists = allChecklists.filter((c) => c.archived !== true);

    const now = new Date().toISOString();
    const expiryCutoff = daysFromNow(EXPIRY_WINDOW_DAYS);
    const expiringDocs = documents
      .filter((d) => d.expiryDate && d.expiryDate >= now.slice(0, 10) && d.expiryDate <= expiryCutoff.slice(0, 10))
      .map((d) => ({ label: d.label, expiryDate: d.expiryDate! }))
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    const staleCutoff = daysAgo(STALE_CHECKLIST_DAYS);
    const staleChecklists = checklists
      .filter((c) => c.progress < 100 && c.savedAt <= staleCutoff)
      .map((c) => ({ destination: c.destination, visaType: c.visaType, progress: c.progress }));

    // Real embassy updates for destinations this user actually has an open
    // checklist for — never a generic "something changed somewhere" line.
    const destinations = Array.from(new Set(checklists.filter((c) => c.progress < 100).map((c) => c.destination)));
    const embassyChangeCutoff = daysAgo(EMBASSY_UPDATE_WINDOW_DAYS);
    const embassyUpdates: { destination: string; summary: string | null }[] = [];
    for (const destination of destinations) {
      const snapshot = await ctx.db
        .query("embassy_page_snapshots")
        .withIndex("by_destination", (q) => q.eq("destination", destination))
        .first();
      if (snapshot?.changedAt && snapshot.changedAt >= embassyChangeCutoff) {
        embassyUpdates.push({ destination, summary: snapshot.aiSummary ?? null });
      }
    }

    if (expiringDocs.length === 0 && staleChecklists.length === 0 && embassyUpdates.length === 0) {
      return null;
    }
    return { expiringDocs, staleChecklists, embassyUpdates };
  },
});

