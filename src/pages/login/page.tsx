import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Globe, Shield, CheckCircle2, Lock, FileText, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useSeo } from "@/hooks/use-seo.ts";

const FEATURES = [
  { icon: FileText, text: "Personalised visa checklists in 60 seconds" },
  { icon: Zap, text: "AI rejection analyser — know exactly what to fix" },
  { icon: Shield, text: "Passport photo checker against embassy standards" },
  { icon: CheckCircle2, text: "Deadline reminders so nothing slips through" },
];

export default function LoginPage() {
  useSeo({
    title: "Sign in to VisaClear",
    description:
      "Access your VisaClear dashboard. Sign in with Google or email to manage your visa checklists, reminders, and documents.",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { isDemoAuthenticated } = useDemoAuth();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const { t } = useTranslation("login");
  const isSignup = location.pathname === "/signup";

  if (isDemoAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">{t("active.title")}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t("active.body")}</p>
          <Button size="lg" className="w-full cursor-pointer font-bold" onClick={() => navigate(returnTo)}>
            {t("active.cta")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel — brand & features ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-shrink-0 bg-[#0f2040] flex-col justify-between p-10 xl:p-14">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 cursor-pointer group">
          <div className="w-9 h-9 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-serif text-xl font-bold text-white">VisaClear</span>
            <span className="text-[10px] text-white/40 ml-2 tracking-widest uppercase">by Vericore</span>
          </div>
        </button>

        <div>
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
            Your visa, cleared.<br />
            <span className="text-blue-300">No guesswork.</span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed mb-10">
            Built for applicants who've been refused before — and for those who refuse to be.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-blue-300" />
                </div>
                <p className="text-sm font-medium text-white/80">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-6 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/40">
            <Shield className="w-3.5 h-3.5" />
            GDPR-Aligned
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/40">
            <Lock className="w-3.5 h-3.5" />
            End-to-end encrypted
          </div>
        </div>
      </div>

      {/* ── Right panel — auth form ── */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-8 h-8 rounded-md bg-[#0f2040] flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <span className="font-serif text-lg font-bold text-primary">VisaClear</span>
            </button>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Secure
            </span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 lg:py-0">
          <div className="w-full max-w-md">
            {/* Heading */}
            <div className="mb-8">
              <p className="text-xs font-bold tracking-widest uppercase text-blue-600 mb-3">
                {isSignup ? t("signup.eyebrow") : t("login.eyebrow")}
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-3 leading-tight">
                {isSignup ? t("signup.title") : t("login.title")}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                {isSignup ? t("signup.subtitle") : t("login.subtitle")}
              </p>
            </div>

            <AuthAccessPanel returnPath={returnTo} initialMode={isSignup ? "signUp" : "signIn"} />

            <p className="text-center text-xs text-muted-foreground mt-6">
              Protected by Convex Auth · End-to-end encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
