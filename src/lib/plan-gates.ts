/**
 * Plan gating rules for VisaClear.
 *
 * Free  : 3 checklist saves / month, 6 destinations, no PDF, no AI, no reminders,
 *         no vault, no country watch
 * Pro   : unlimited checklists/trips, all destinations, PDF, reminders, document
 *         vault, multi-trip manager, country watch (5 countries), AI assistant
 *         (10 questions/month)
 * Expert: everything in Pro + AI Rejection Analyser, unlimited AI assistant,
 *         country watch (10 countries), success probability score
 *
 * Server-side enforcement lives alongside the real data each limit governs
 * (convex/checklists.ts, convex/vault.ts, convex/countryWatch.ts,
 * convex/ai/assistant.ts) — these helpers exist so the UI can match that
 * behavior instead of guessing, but the backend is the actual source of truth.
 */

export type Plan = "free" | "pro" | "expert";

export const FREE_DESTINATION_LIMIT = 6;
export const FREE_CHECKLIST_MONTHLY_LIMIT = 3;
export const COUNTRY_WATCH_LIMIT: Record<Plan, number> = { free: 0, pro: 5, expert: 10 };
export const AI_ASSISTANT_MONTHLY_LIMIT: Record<Plan, number | null> = {
  free: 0,
  pro: 10,
  expert: null,
};

export function canSaveChecklist(_plan: Plan | null | undefined): boolean {
  // Every plan can save — free is capped at FREE_CHECKLIST_MONTHLY_LIMIT/month,
  // enforced server-side in convex/checklists.ts:saveChecklist.
  return true;
}

export function canDownloadPDF(plan: Plan | null | undefined): boolean {
  return plan === "pro" || plan === "expert";
}

export function canUseAI(plan: Plan | null | undefined): boolean {
  return plan === "pro" || plan === "expert";
}

export function canUseRejectionAnalyser(plan: Plan | null | undefined): boolean {
  return plan === "expert";
}

export function canUseSuccessProbabilityScore(plan: Plan | null | undefined): boolean {
  return plan === "expert";
}

export function canSetReminders(plan: Plan | null | undefined): boolean {
  return plan === "pro" || plan === "expert";
}

export function canUseDocumentVault(plan: Plan | null | undefined): boolean {
  return plan === "pro" || plan === "expert";
}

export function canUseMultiTripManager(plan: Plan | null | undefined): boolean {
  return plan === "pro" || plan === "expert";
}

export function canUseCountryWatch(plan: Plan | null | undefined): boolean {
  return plan === "pro" || plan === "expert";
}

export function canAccessDestination(
  plan: Plan | null | undefined,
  destinationIndex: number
): boolean {
  if (plan === "pro" || plan === "expert") return true;
  return destinationIndex < FREE_DESTINATION_LIMIT;
}

export function getPlanLabel(plan: Plan | null | undefined): string {
  if (plan === "expert") return "Expert";
  if (plan === "pro") return "Pro";
  return "Free";
}
