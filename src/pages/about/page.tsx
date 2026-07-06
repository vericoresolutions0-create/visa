import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button.tsx";
import { Globe, ArrowLeft, Shield, Target, Users, Award, TrendingUp, Heart, FileText, HelpCircle, Sparkles } from "lucide-react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { StatsBar } from "@/components/stats-bar.tsx";

export default function AboutPage() {
  useSeo({ title: "About Us", description: "VisaClear is built by immigration technology specialists and compliance professionals, helping applicants from Africa, Asia, and LatAm get their visa right the first time." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const { t } = useTranslation("about");

  const TEAM = [
    { name: t("team.name"), role: t("team.role"), desc: t("team.desc") },
  ];

  const VALUES = [
    { icon: Shield, title: t("values.v1.title"), desc: t("values.v1.desc") },
    { icon: Target, title: t("values.v2.title"), desc: t("values.v2.desc") },
    { icon: Heart, title: t("values.v3.title"), desc: t("values.v3.desc") },
    { icon: TrendingUp, title: t("values.v4.title"), desc: t("values.v4.desc") },
  ];

  const STATS = [
    { value: t("stats.s1.value"), label: t("stats.s1.label") },
    { value: t("stats.s2.value"), label: t("stats.s2.label") },
    { value: t("stats.s3.value"), label: t("stats.s3.label") },
    { value: t("stats.s4.value"), label: t("stats.s4.label") },
  ];

  const WHY_VISACLEAR = [
    { icon: FileText, headline: t("why.w1.headline"), text: t("why.w1.text") },
    { icon: HelpCircle, headline: t("why.w2.headline"), text: t("why.w2.text") },
    { icon: Sparkles, headline: t("why.w3.headline"), text: t("why.w3.text") },
  ];

  const COMPLIANCE_ITEMS = [
    { icon: Shield, title: t("compliance.c1.title"), desc: t("compliance.c1.desc") },
    { icon: Shield, title: t("compliance.c2.title"), desc: t("compliance.c2.desc") },
    { icon: Award, title: t("compliance.c3.title"), desc: t("compliance.c3.desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center gap-3 sticky top-0 z-40 bg-background/95 backdrop-blur">
        <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <Globe className="w-5 h-5 text-accent" />
          <span className="font-serif font-semibold text-primary">VisaClear</span>
          <span className="text-xs text-muted-foreground tracking-widest uppercase">by Vericore</span>
        </button>
      </header>

      {/* Hero */}
      <section className="py-24 px-4 sm:px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
          <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">{t("hero.eyebrow")}</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-primary leading-tight mb-6">
            {t("hero.title1")}<br />{t("hero.title2")}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t("hero.subtitle")}
          </p>
        </motion.div>
      </section>

      <StatsBar stats={STATS} />

      {/* Mission */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">{t("mission.eyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary mb-5">{t("mission.title")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("mission.p1")}
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {t("mission.p2")}
            </p>
            <Button onClick={() => navigate("/checklist")} className="cursor-pointer font-semibold">
              {t("mission.cta")}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {VALUES.map((v) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-5 rounded-2xl border border-border/50 bg-muted/20"
              >
                <v.icon className="w-6 h-6 text-accent mb-3" />
                <h3 className="font-semibold text-primary text-sm mb-1">{v.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why VisaClear */}
      <section className="py-20 px-4 sm:px-6 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">{t("why.eyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{t("why.title")}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {WHY_VISACLEAR.map((w) => (
              <motion.div
                key={w.headline}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-background rounded-2xl p-6 border border-border/50"
              >
                <w.icon className="w-5 h-5 text-accent mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{w.headline}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{w.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">{t("team.eyebrow")}</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary mb-10">{t("team.title")}</h2>
          {TEAM.map((member) => (
            <div key={member.name} className="bg-background rounded-2xl p-8 border border-border/50 text-left">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-primary mb-1">{member.name}</h3>
              <p className="text-xs text-accent font-semibold uppercase tracking-widest mb-3">{member.role}</p>
              <p className="text-muted-foreground leading-relaxed">{member.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">{t("compliance.eyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{t("compliance.title")}</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {COMPLIANCE_ITEMS.map((c) => (
              <div key={c.title} className="text-center p-6 rounded-2xl border border-border/50">
                <c.icon className="w-8 h-8 text-accent mx-auto mb-4" />
                <h3 className="font-semibold text-primary mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-primary rounded-2xl p-12 text-center text-primary-foreground">
            <h2 className="font-serif text-3xl font-semibold mb-3">{t("cta.title")}</h2>
            <p className="text-primary-foreground/70 mb-8">{t("cta.subtitle")}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 cursor-pointer font-semibold"
                onClick={() => navigate("/checklist")}
              >
                {t("cta.primary")}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/10 cursor-pointer"
                onClick={() => navigate("/contact")}
              >
                {t("cta.secondary")}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
