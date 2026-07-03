import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import {
  Globe, ArrowLeft, CheckCircle2, Briefcase, Users,
  ChevronRight, ShieldCheck, LayoutDashboard, FileSpreadsheet,
} from "lucide-react";

export default function BusinessLandingPage() {
  const { t } = useTranslation("business");
  useSeo({ title: "VisaClear for Employers", description: "Track your relocating employees' visa readiness in one dashboard. Consent-first, real data, built for companies moving people abroad." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const myOrg = useQuery(api.organizations.getMyOrganization);

  const FEATURES = [
    { icon: Users, title: t("features.0.title"), desc: t("features.0.desc") },
    { icon: ShieldCheck, title: t("features.1.title"), desc: t("features.1.desc") },
    { icon: LayoutDashboard, title: t("features.2.title"), desc: t("features.2.desc") },
    { icon: FileSpreadsheet, title: t("features.3.title"), desc: t("features.3.desc") },
  ];

  const HOW_IT_WORKS = [
    { step: "01", title: t("steps.0.title"), desc: t("steps.0.desc") },
    { step: "02", title: t("steps.1.title"), desc: t("steps.1.desc") },
    { step: "03", title: t("steps.2.title"), desc: t("steps.2.desc") },
  ];

  const ctaTarget = myOrg ? "/business/dashboard" : "/business/onboarding";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif font-semibold text-primary">VisaClear</span>
            <span className="text-xs text-muted-foreground tracking-widest uppercase">by Vericore</span>
          </button>
        </div>
        <Button size="sm" onClick={() => navigate(ctaTarget)} className="cursor-pointer">
          {myOrg ? t("header.cta_go") : t("header.cta_start")}
        </Button>
      </header>

      <section className="relative overflow-hidden py-16 md:py-24 px-4 sm:px-6">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.72 0.13 80) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.25 0.05 260) 0%, transparent 50%)",
          }}
        />
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6">
              <Briefcase className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent tracking-widest uppercase">{t("hero.eyebrow")}</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-primary leading-tight mb-6">
              {t("hero.title").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="cursor-pointer font-semibold px-8" onClick={() => navigate(ctaTarget)}>
                {myOrg ? t("hero.cta_dashboard") : t("hero.cta_org")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">{t("features.eyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{t("features.title")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-background rounded-2xl p-6 border border-border/50"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-semibold text-primary mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">{t("steps.eyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{t("steps.title")}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <motion.div key={step.step} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <div className="font-serif text-6xl font-semibold text-accent/20 mb-3">{step.step}</div>
                <h3 className="font-serif text-xl font-semibold text-primary mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle2 className="w-8 h-8 text-accent mx-auto mb-4" />
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-primary mb-3">{t("consent.title")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("consent.body")}
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-primary rounded-2xl p-8 sm:p-12 text-center text-primary-foreground">
            <Briefcase className="w-10 h-10 text-accent mx-auto mb-4" />
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold mb-3">{t("cta.title")}</h2>
            <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
              {t("cta.subtitle")}
            </p>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 cursor-pointer font-semibold" onClick={() => navigate(ctaTarget)}>
              {myOrg ? t("cta.go") : t("cta.create")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
