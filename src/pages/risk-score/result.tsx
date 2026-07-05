import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Globe, ArrowLeft, TrendingUp, TrendingDown, Share2, Copy,
  AlertTriangle, CheckCircle2, ArrowRight,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { trackEvent } from "@/hooks/use-analytics.ts";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.js";

function scoreColor(score: number): string {
  if (score >= 65) return "text-green-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

export default function RiskScoreResultPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack("/risk-score");
  const { t } = useTranslation("risk-score");
  const [linkCopied, setLinkCopied] = useState(false);

  function scoreLabel(score: number): string {
    if (score >= 65) return t("result.strong");
    if (score >= 40) return t("result.moderate");
    return t("result.at_risk");
  }

  const result = useQuery(
    api.riskScore.getRiskScoreResult,
    resultId ? { resultId: resultId as Id<"risk_score_results"> } : "skip",
  );

  useSeo({
    title: result ? `${result.displayScore}% Approval Likelihood — ${result.destination}` : "Visa Approval Risk Score",
    description: result
      ? `My estimated approval likelihood for a ${result.destination} ${result.visaType} visa is ${result.displayScore}%. Get your own free score on VisaClear.`
      : "Get your free, instant visa approval likelihood estimate.",
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      trackEvent("share_link_copied", { feature: "risk_score" });
      toast.success(t("result.copy_success"));
      setTimeout(() => setLinkCopied(false), 3000);
    }).catch(() => toast.error(t("result.copy_error")));
  };

  const handleNativeShare = async () => {
    if (!result) return;
    const shareData = {
      title: "My VisaClear Risk Score",
      text: `My estimated approval likelihood for a ${result.destination} ${result.visaType} visa is ${result.displayScore}%.`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        trackEvent("share_link_copied", { feature: "risk_score_native" });
      } catch {
        // user cancelled — not an error
      }
    } else {
      handleCopyLink();
    }
  };

  if (result === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-10 w-2/3 mx-auto" />
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-primary mb-2">{t("result.not_found")}</p>
          <Button onClick={() => navigate("/risk-score")} className="cursor-pointer">{t("result.take_quiz")}</Button>
        </div>
      </div>
    );
  }

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
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-3xl p-8 text-center shadow-sm"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            {result.destination} · {result.visaType} visa
          </p>
          <p className={cn("font-serif text-6xl font-bold mt-3", scoreColor(result.displayScore))}>
            {result.displayScore}%
          </p>
          <p className={cn("text-sm font-semibold mt-2", scoreColor(result.displayScore))}>
            {scoreLabel(result.displayScore)} {t("result.likelihood")}
          </p>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            {t("result.disclaimer")}
          </p>
        </motion.div>

        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => { void handleNativeShare(); }}>
            <Share2 className="w-4 h-4" /> {t("result.share")}
          </Button>
          <Button variant="outline" className="flex-1 cursor-pointer" onClick={handleCopyLink}>
            <Copy className="w-4 h-4" /> {linkCopied ? t("result.copied") : t("result.copy")}
          </Button>
        </div>

        <div className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-primary mb-4">
            {t("result.factors_title")}
          </h2>
          <div className="space-y-3">
            {result.topWeakFactors.map((factor) => {
              const ratio = factor.earnedPoints / (factor.maxPoints || 1);
              const isStrength = ratio >= 0.7;
              return (
                <div key={factor.category} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                  {isStrength ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : ratio >= 0.4 ? (
                    <TrendingDown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{factor.selectedLabel}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{factor.feedback}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 bg-accent/8 border border-accent/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <p className="text-sm font-semibold text-primary">{t("result.cta_title")}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            {t("result.cta_subtitle")}
          </p>
          <Button
            className="w-full cursor-pointer font-semibold"
            onClick={() => navigate(`/checklist?to=${encodeURIComponent(result.destination)}&type=${result.visaType}`)}
          >
            {t("result.cta_button")} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <button
          onClick={() => navigate("/risk-score")}
          className="block mx-auto mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {t("result.retake")}
        </button>
      </main>
    </div>
  );
}
