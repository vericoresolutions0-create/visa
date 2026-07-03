import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Globe,
  CheckCircle2,
  ArrowRight,
  Shield,
  FileText,
  Zap,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { cn } from "@/lib/utils.ts";

const STEP_COUNT = 3;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("onboarding");
  const [step, setStep] = useState(0);

  const isLast = step === STEP_COUNT - 1;

  const handleComplete = () => {
    localStorage.setItem("vc_onboarded", "1");
    navigate("/signup");
  };

  const markOnboarded = () => {
    localStorage.setItem("vc_onboarded", "1");
  };

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const POINTS = [
    { icon: "1", label: t("step1.p1.label"), desc: t("step1.p1.desc") },
    { icon: "2", label: t("step1.p2.label"), desc: t("step1.p2.desc") },
    { icon: "3", label: t("step1.p3.label"), desc: t("step1.p3.desc") },
  ];

  const BADGES = [
    t("step2.badge1"),
    t("step2.badge2"),
    t("step2.badge3"),
    t("step2.badge4"),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === step
                ? "w-8 bg-primary"
                : i < step
                  ? "w-3 bg-primary/40"
                  : "w-3 bg-border",
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3, ease: "easeOut" as const }}
          className="w-full max-w-md"
        >
          {step === 0 && (
            <div className="bg-primary rounded-3xl p-8 text-primary-foreground text-center shadow-2xl">
              <div
                className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6"
                style={{ color: "oklch(0.72 0.13 80)" }}
              >
                <Globe className="w-8 h-8" />
              </div>
              <div
                className="text-[10px] tracking-widest uppercase font-semibold mb-2"
                style={{ color: "oklch(0.72 0.13 80)" }}
              >
                {t("step0.subtitle")}
              </div>
              <h1 className="font-serif text-3xl font-semibold mb-1">
                {t("step0.title")}
              </h1>
              <h2 className="font-serif text-xl font-light text-primary-foreground/70 mb-6">
                {t("step0.heading")}
              </h2>
              <p className="text-primary-foreground/70 leading-relaxed text-sm mb-8">
                {t("step0.body")}
              </p>
              <Button
                size="lg"
                className="w-full cursor-pointer font-semibold py-6 text-sm"
                style={{
                  background: "oklch(0.72 0.13 80)",
                  color: "oklch(0.18 0.04 80)",
                }}
                onClick={handleNext}
              >
                {t("step0.cta")} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-6 text-primary">
                <FileText className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-3xl font-semibold text-primary mb-2">
                {t("step1.heading")}
              </h2>
              <div className="space-y-3 mt-6 text-left">
                {POINTS.map((p) => (
                  <div
                    key={p.icon}
                    className="flex gap-4 p-4 bg-card border border-border rounded-xl"
                  >
                    <div
                      className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm"
                      style={{
                        background: "oklch(0.72 0.13 80)",
                        color: "oklch(0.18 0.04 80)",
                      }}
                    >
                      {p.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {p.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {p.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                className="w-full mt-6 cursor-pointer font-semibold py-6"
                onClick={handleNext}
              >
                {t("step1.cta")} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6 text-accent">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-3xl font-semibold text-primary mb-4">
                {t("step2.heading")}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {t("step2.body")}
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {BADGES.map((b) => (
                  <div
                    key={b}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-xs font-semibold text-primary"
                  >
                    <CheckCircle2 className="w-3 h-3 text-accent" /> {b}
                  </div>
                ))}
              </div>
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-accent" />
                  <span className="font-semibold text-sm text-primary">
                    {t("step2.terms_prefix")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <button
                    onClick={() => navigate("/terms")}
                    className="text-primary underline cursor-pointer"
                  >
                    {t("step2.terms_link")}
                  </button>{" "}
                  {t("step2.terms_and")}{" "}
                  <button
                    onClick={() => navigate("/privacy")}
                    className="text-primary underline cursor-pointer"
                  >
                    {t("step2.privacy_link")}
                  </button>
                  {". "}{t("step2.disclaimer")}
                </p>
              </div>

              <AuthAccessPanel
                returnPath="/dashboard"
                onAuthStart={markOnboarded}
              />

              <Button
                size="lg"
                variant="ghost"
                className="w-full cursor-pointer font-semibold py-6 mt-4"
                onClick={handleNext}
              >
                {t("step2.cta")} <Zap className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={handleComplete}
        className="mt-6 text-xs text-muted-foreground hover:text-primary cursor-pointer underline"
      >
        {t("skip")}
      </button>
    </div>
  );
}
