import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Globe, ArrowLeft, ArrowRight, TrendingUp, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import { AVAILABLE_DESTINATIONS, VISA_TYPES } from "@/lib/visa-data.ts";
import { RISK_SCORE_QUESTIONS, type RiskScoreAnswers } from "@/lib/risk-score.ts";
import { trackEvent } from "@/hooks/use-analytics.ts";
import { cn } from "@/lib/utils.ts";

const TOTAL_STEPS = RISK_SCORE_QUESTIONS.length + 1; // +1 for destination/visa-type step

export default function RiskScorePage() {
  useSeo({
    title: "Visa Approval Risk Score",
    description: "Answer 8 quick questions and get a free, instant estimate of your visa approval likelihood — plus the top factors you can improve before you apply.",
  });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const { t } = useTranslation("risk-score");
  const translateCountry = useCountryName();
  const submitRiskScore = useMutation(api.riskScore.submitRiskScore);

  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState("");
  const [visaType, setVisaType] = useState("");
  const [answers, setAnswers] = useState<RiskScoreAnswers>({});
  const [submitting, setSubmitting] = useState(false);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const sortedDestinations = useMemo(
    () => [...AVAILABLE_DESTINATIONS].sort((a, b) => a.localeCompare(b)),
    [],
  );

  const canAdvanceFromIntro = Boolean(destination && visaType);

  const handleSelectOption = (category: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [category]: value }));
    setTimeout(() => {
      if (step < TOTAL_STEPS - 1) {
        setStep((s) => s + 1);
      }
    }, 80);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { resultId } = await submitRiskScore({ destination, visaType, answers });
      trackEvent("risk_score_completed", { destination, visaType });
      navigate(`/risk-score/${resultId}`);
    } catch (err) {
      const message =
        err instanceof ConvexError
          ? (err.data as { message: string }).message
          : t("quiz.error");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Scroll to top on each quiz step change so the question is always visible.
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }, [step]);

  const isLastQuestion = step === TOTAL_STEPS - 1;
  const currentQuestion = step > 0 ? RISK_SCORE_QUESTIONS[step - 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <TrendingUp className="w-3.5 h-3.5 text-accent" /> {t("header.label")}
        </div>
      </header>

      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <main className="max-w-xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="font-serif text-3xl font-semibold text-primary mb-3">
                {t("intro.title")}
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                {t("intro.subtitle")}
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">{t("intro.destination_label")}</label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-3.5 py-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">{t("intro.destination_placeholder")}</option>
                    {sortedDestinations.map((d) => (
                      <option key={d} value={d}>{DESTINATION_FLAGS[d] ?? "🌍"} {translateCountry(d)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">{t("intro.visa_label")}</label>
                  <select
                    value={visaType}
                    onChange={(e) => setVisaType(e.target.value)}
                    className="w-full px-3.5 py-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">{t("intro.visa_placeholder")}</option>
                    {VISA_TYPES.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <Button
                  size="lg"
                  className="w-full cursor-pointer font-semibold"
                  disabled={!canAdvanceFromIntro}
                  onClick={() => setStep(1)}
                >
                  {t("intro.cta")} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ) : currentQuestion ? (
            <motion.div
              key={currentQuestion.category}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {t("quiz.step_label", { step, total: RISK_SCORE_QUESTIONS.length })}
              </p>
              <h2 className="font-serif text-2xl font-semibold text-primary mb-6">
                {currentQuestion.question}
              </h2>

              <div className="space-y-2.5">
                {currentQuestion.options.map((option) => {
                  const selected = answers[currentQuestion.category] === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelectOption(currentQuestion.category, option.value)}
                      className={cn(
                        "w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer",
                        selected
                          ? "border-accent bg-accent/8 text-primary"
                          : "border-border bg-card hover:border-accent/40",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {isLastQuestion && answers[currentQuestion.category] && (
                <Button
                  size="lg"
                  className="w-full mt-6 cursor-pointer font-semibold"
                  disabled={submitting}
                  onClick={() => { void handleSubmit(); }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("quiz.see_score")}
                </Button>
              )}

              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {t("quiz.previous")}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
