import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMutation, useQuery } from "convex/react";
import { AuthLoading, Unauthenticated } from "convex/react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { ShieldCheck, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { convexErrMsg } from "@/lib/utils.ts";
import {
  RISK_SCORE_QUESTIONS,
  computeRiskScore,
  isAnswersComplete,
  type RiskScoreAnswers,
  type RiskScoreFactor,
} from "@/lib/risk-score.ts";

function AuditQuiz({ destination, visaType, isDemoAuthenticated, onComplete }: { destination: string; visaType: string; isDemoAuthenticated: boolean; onComplete: (factors: RiskScoreFactor[]) => void }) {
  const submitAudit = useMutation(api.checklistAudit.submitAudit);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<RiskScoreAnswers>({});
  const [submitting, setSubmitting] = useState(false);

  const question = RISK_SCORE_QUESTIONS[step];
  const isLast = step === RISK_SCORE_QUESTIONS.length - 1;

  const handleSelect = async (value: string) => {
    const next = { ...answers, [question.category]: value };
    setAnswers(next);
    if (isLast && isAnswersComplete(next)) {
      if (isDemoAuthenticated) {
        onComplete(computeRiskScore(next).factors);
        return;
      }
      setSubmitting(true);
      try {
        await submitAudit({ destination, visaType, answers: next });
      } catch (err) {
        toast.error(convexErrMsg(err) ?? "Could not save your audit. Please try again.");
        return;
      } finally {
        setSubmitting(false);
      }
      onComplete(computeRiskScore(next).factors);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-4">
        {RISK_SCORE_QUESTIONS.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-sm font-semibold text-foreground mb-3">{question.question}</p>
          <div className="space-y-2">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                disabled={submitting}
                onClick={() => { void handleSelect(opt.value); }}
                className="w-full text-left px-3.5 py-2.5 text-sm rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AuditResults({ factors }: { factors: RiskScoreFactor[] }) {
  const flagged = factors.filter((f) => f.earnedPoints / (f.maxPoints || 1) < 0.5);
  const ok = factors.filter((f) => f.earnedPoints / (f.maxPoints || 1) >= 0.5);

  return (
    <div className="space-y-3">
      {flagged.length === 0 ? (
        <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">Nothing major stood out — your answers look solid against common approval factors.</p>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Fix these before you submit ({flagged.length})
          </p>
          {flagged.map((f) => (
            <div key={f.category} className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900 leading-relaxed">{f.feedback}</p>
            </div>
          ))}
        </>
      )}
      {ok.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">{ok.length} other factor{ok.length === 1 ? "" : "s"} looked fine</summary>
          <ul className="mt-2 space-y-1.5 pl-1">
            {ok.map((f) => (
              <li key={f.category} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                <span>{f.selectedLabel}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-[11px] text-muted-foreground pt-1">
        Guidance based on common approval factors — not an official prediction or embassy decision.
      </p>
    </div>
  );
}

export function PreSubmissionAuditCard({ destination, visaType }: { destination: string; visaType: string }) {
  const { isAuthenticated } = useAuth();
  const { isDemoAuthenticated } = useDemoAuth();
  const hasAccess = isAuthenticated || isDemoAuthenticated;
  const previousAudit = useQuery(
    api.checklistAudit.getMyLatestAudit,
    isAuthenticated ? { destination, visaType } : "skip",
  );
  const [started, setStarted] = useState(false);
  const [retaking, setRetaking] = useState(false);
  const [factors, setFactors] = useState<RiskScoreFactor[] | null>(null);

  const displayFactors = factors ?? (!retaking && previousAudit ? computeRiskScore(previousAudit.answers as RiskScoreAnswers).factors : null);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">Pre-Submission Audit</h3>
      </div>

      {displayFactors ? (
        <div className="space-y-3">
          <AuditResults factors={displayFactors} />
          <button
            onClick={() => { setStarted(true); setRetaking(true); setFactors(null); }}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Re-run audit
          </button>
        </div>
      ) : started ? (
        hasAccess ? (
          <AuditQuiz destination={destination} visaType={visaType} isDemoAuthenticated={isDemoAuthenticated} onComplete={setFactors} />
        ) : null
      ) : (
        <>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Answer 7 quick questions about your finances, ties, and history — get specific, actionable flags before you submit, not after a refusal.
          </p>
          {!isDemoAuthenticated && <AuthLoading><Skeleton className="h-9 w-40" /></AuthLoading>}
          {!isDemoAuthenticated && (
            <Unauthenticated>
              <p className="text-xs text-muted-foreground mb-3">Sign in to run your free audit.</p>
            </Unauthenticated>
          )}
          {hasAccess && (
            <Button size="sm" className="cursor-pointer font-semibold" onClick={() => setStarted(true)}>
              Run free audit <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
