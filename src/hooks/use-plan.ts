import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { canSaveChecklist, canDownloadPDF, canUseAI, canUseRejectionAnalyser, canSetReminders, type Plan } from "@/lib/plan-gates.ts";

/**
 * Central hook for plan gating throughout the app.
 * Reads the user's plan from the backend (Convex database).
 * 
 * Note: Plan values are set in the database on the backend after payment verification.
 * Until Hercules Commerce is connected, admin users can manually set plans via the Admin panel.
 */
export function usePlan() {
  const currentUser = useQuery(api.users.getCurrentUser, {});

  const plan: Plan = (currentUser?.plan as Plan) ?? "free";
  const isLoading = currentUser === undefined;

  const isTrialActive = (() => {
    if (!currentUser?.trialStartedAt) return false;
    const trialStart = new Date(currentUser.trialStartedAt);
    const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return new Date() < trialEnd;
  })();

  // During active trial, user gets Pro access
  const effectivePlan: Plan = isTrialActive ? "pro" : plan;

  return {
    plan: effectivePlan,
    rawPlan: plan,
    isLoading,
    isTrialActive,
    isFree: effectivePlan === "free",
    isPro: effectivePlan === "pro" || effectivePlan === "expert",
    isExpert: effectivePlan === "expert",
    canSaveChecklist: canSaveChecklist(effectivePlan),
    canDownloadPDF: canDownloadPDF(effectivePlan),
    canUseAI: canUseAI(effectivePlan),
    canUseRejectionAnalyser: canUseRejectionAnalyser(effectivePlan),
    canSetReminders: canSetReminders(effectivePlan),
  };
}
