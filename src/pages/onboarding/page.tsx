import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
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

const STEPS = [
  {
    icon: <Globe className="w-8 h-8" />,
    title: "Welcome to VisaClear",
    subtitle: "by Vericore",
    heading: "Your visa approval starts here.",
    body: "We generate precise, personalised document checklists in 60 seconds, built specifically for African, Asian, and LatAm applicants who deserve more than vague agency advice.",
    cta: "Get Started",
    bg: "bg-primary",
    accent: "oklch(0.72 0.13 80)",
  },
  {
    icon: <FileText className="w-8 h-8" />,
    title: "How It Works",
    subtitle: null,
    heading: "Three steps to a stronger application.",
    body: null,
    points: [
      {
        icon: "1",
        label: "Choose your route",
        desc: "Select your home country and destination. We know the exact requirements for your corridor.",
      },
      {
        icon: "2",
        label: "Get your checklist",
        desc: "Every document named precisely — what it is, where to get it, and what embassies actually look for.",
      },
      {
        icon: "3",
        label: "Apply with confidence",
        desc: "Use insider approval tips, track your progress, and set deadline reminders so nothing slips.",
      },
    ],
    cta: "Understood, continue",
    bg: "bg-background",
    accent: "oklch(0.28 0.07 255)",
  },
  {
    icon: <Lock className="w-8 h-8" />,
    title: "Your Privacy Matters",
    subtitle: null,
    heading: "It's all about Privacy.",
    body: "Your data is never sold. Never shared with third parties. Built to GDPR and NDPA standards by a CISA-certified compliance professional. Your refusal letter text and personal documents are processed securely and stay yours.",
    badges: [
      "GDPR-Aligned",
      "NDPA-Aligned",
      "CISA Certified",
      "End-to-end encrypted",
    ],
    cta: "Continue to account setup",
    bg: "bg-background",
    accent: "oklch(0.72 0.13 80)",
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {STEPS.map((_, i) => (
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
                {current.icon}
              </div>
              <div
                className="text-[10px] tracking-widest uppercase font-semibold mb-2"
                style={{ color: "oklch(0.72 0.13 80)" }}
              >
                {current.subtitle}
              </div>
              <h1 className="font-serif text-3xl font-semibold mb-1">
                {current.title}
              </h1>
              <h2 className="font-serif text-xl font-light text-primary-foreground/70 mb-6">
                {current.heading}
              </h2>
              <p className="text-primary-foreground/70 leading-relaxed text-sm mb-8">
                {current.body}
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
                {current.cta} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-6 text-primary">
                {current.icon}
              </div>
              <h2 className="font-serif text-3xl font-semibold text-primary mb-2">
                {current.heading}
              </h2>
              <div className="space-y-3 mt-6 text-left">
                {current.points?.map((p) => (
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
                {current.cta} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6 text-accent">
                {current.icon}
              </div>
              <h2 className="font-serif text-3xl font-semibold text-primary mb-4">
                {current.heading}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {current.body}
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {current.badges?.map((b) => (
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
                    By continuing, you agree to our
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <button
                    onClick={() => navigate("/terms")}
                    className="text-primary underline cursor-pointer"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    onClick={() => navigate("/privacy")}
                    className="text-primary underline cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  . VisaClear is a guidance tool, not legal advice.
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
                {current.cta} <Zap className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={handleComplete}
        className="mt-6 text-xs text-muted-foreground hover:text-primary cursor-pointer underline"
      >
        Skip introduction
      </button>
    </div>
  );
}
