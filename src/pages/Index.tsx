import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useTranslation } from "react-i18next";
import LocaleSwitcher from "@/components/ui/locale-switcher.tsx";
import { PartnerWelcomeBanner } from "@/components/partner-welcome-banner.tsx";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import {
  Shield,
  Globe,
  FileText,
  Clock,
  CheckCircle,
  ChevronRight,
  Star,
  Lock,
  Award,
  Users,
  Camera,
  TrendingUp,
  HelpCircle,
  Sparkles,
  LayoutGrid,
} from "lucide-react";

const DESTINATIONS = ["United Kingdom", "United States", "Canada", "Germany", "Poland"].map((name) => ({
  name,
  flag: DESTINATION_FLAGS[name],
}));

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

export default function Index() {
  useSeo({
    title: "VisaClear by Vericore",
    description:
      "Stop getting your visa rejected. Get a precise, personalised visa document checklist in 60 seconds. Built for African, Asian, and LatAm applicants.",
    canonical: "https://visaclear.app",
  });
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const translateCountry = useCountryName();

  const STATS = [
    { value: t("stats.visa_types_value"), label: t("stats.visa_types_label") },
    { value: t("stats.destinations_value"), label: t("stats.destinations_label") },
    { value: t("stats.security_value"), label: t("stats.security_label") },
    { value: t("stats.gdpr_value"), label: t("stats.gdpr_label") },
  ];

  const WHY_CARDS = [
    { icon: <CheckCircle className="w-5 h-5" />, title: t("why.card1.title"), desc: t("why.card1.desc") },
    { icon: <Shield className="w-5 h-5" />, title: t("why.card2.title"), desc: t("why.card2.desc") },
    { icon: <Users className="w-5 h-5" />, title: t("why.card3.title"), desc: t("why.card3.desc") },
  ];

  const HOW_STEPS = [
    { n: "01", title: t("how.step1.title"), desc: t("how.step1.desc") },
    { n: "02", title: t("how.step2.title"), desc: t("how.step2.desc") },
    { n: "03", title: t("how.step3.title"), desc: t("how.step3.desc") },
  ];

  const FEATURES = [
    { icon: <FileText className="w-5 h-5" />, title: t("features.f1.title"), desc: t("features.f1.desc") },
    { icon: <Clock className="w-5 h-5" />, title: t("features.f2.title"), desc: t("features.f2.desc") },
    { icon: <Shield className="w-5 h-5" />, title: t("features.f3.title"), desc: t("features.f3.desc") },
    { icon: <Lock className="w-5 h-5" />, title: t("features.f4.title"), desc: t("features.f4.desc") },
  ];

  const WHY_VISACLEAR = [
    { icon: FileText, headline: t("testimonials.t1.headline"), text: t("testimonials.t1.text") },
    { icon: HelpCircle, headline: t("testimonials.t2.headline"), text: t("testimonials.t2.text") },
    { icon: Sparkles, headline: t("testimonials.t3.headline"), text: t("testimonials.t3.text") },
  ];

  const TRUST_ITEMS = [
    { icon: <Shield className="w-5 h-5" />, label: t("trust.gdpr.label"), sub: t("trust.gdpr.sub") },
    { icon: <Lock className="w-5 h-5" />, label: t("trust.ndpa.label"), sub: t("trust.ndpa.sub") },
    { icon: <Award className="w-5 h-5" />, label: t("trust.cisa.label"), sub: t("trust.cisa.sub") },
  ];

  const FOOTER_LINKS = [
    { label: t("footer.links.checklist"), path: "/checklist", color: "bg-blue-950/60 text-blue-200 hover:bg-blue-900/70 border-blue-800/40" },
    { label: t("footer.links.dashboard"), path: "/login", color: "bg-blue-950/60 text-blue-200 hover:bg-blue-900/70 border-blue-800/40" },
    { label: t("footer.links.profile_settings"), path: "/settings/profile", color: "bg-blue-950/60 text-blue-200 hover:bg-blue-900/70 border-blue-800/40" },
    { label: t("footer.links.rejection_analyser"), path: "/rejection-analyser", color: "bg-amber-950/60 text-amber-300 hover:bg-amber-900/70 border-amber-700/40" },
    { label: t("footer.links.photo_checker"), path: "/passport-photo", color: "bg-amber-950/60 text-amber-300 hover:bg-amber-900/70 border-amber-700/40" },
    { label: t("footer.links.agents"), path: "/agents", color: "bg-purple-950/60 text-purple-300 hover:bg-purple-900/70 border-purple-700/40" },
    { label: t("footer.links.pricing"), path: "/pricing", color: "bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/70 border-emerald-700/40" },
    { label: t("footer.links.checkout"), path: "/payment?plan=pro&billing=yearly", color: "bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/70 border-emerald-700/40" },
    { label: t("footer.links.white_label"), path: "/white-label", color: "bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/70 border-indigo-700/40" },
    { label: t("footer.links.for_employers"), path: "/business", color: "bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/70 border-indigo-700/40" },
    { label: t("footer.links.blog"), path: "/blog", color: "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 border-slate-600/40" },
    { label: t("footer.links.community"), path: "/community", color: "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 border-slate-600/40" },
    { label: t("footer.links.wall_of_fame"), path: "/wall-of-fame", color: "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 border-slate-600/40" },
    { label: t("footer.links.about"), path: "/about", color: "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 border-slate-600/40" },
    { label: t("footer.links.contact"), path: "/contact", color: "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 border-slate-600/40" },
    { label: t("footer.links.privacy_policy"), path: "/privacy", color: "bg-muted/50 text-muted-foreground hover:bg-muted border-border/40" },
    { label: t("footer.links.terms"), path: "/terms", color: "bg-muted/50 text-muted-foreground hover:bg-muted border-border/40" },
    { label: t("footer.links.security"), path: "/security", color: "bg-muted/50 text-muted-foreground hover:bg-muted border-border/40" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 md:pb-0">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-serif text-xl font-semibold tracking-wide text-primary">
                VisaClear
              </span>
              <span className="text-[10px] text-muted-foreground font-sans ml-2 tracking-widest uppercase">
                by Vericore
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden xl:flex items-center gap-1">
              {[
                { label: t("nav.checklist"), path: "/checklist" },
                { label: t("nav.photo"), path: "/passport-photo" },
                { label: t("nav.pricing"), path: "/pricing" },
                { label: t("nav.blog"), path: "/blog" },
                { label: t("nav.about"), path: "/about" },
                { label: "Menu", path: "/menu" },
              ].map((l) => (
                <button
                  key={l.label}
                  onClick={() => navigate(l.path)}
                  className="text-xs text-muted-foreground hover:text-primary px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer font-semibold tracking-wide font-sans"
                >
                  {l.label}
                </button>
              ))}
            </nav>
            <LocaleSwitcher />
            <Button
              onClick={() => navigate("/agents")}
              variant="secondary"
              className="cursor-pointer font-semibold hidden md:inline-flex"
              size="sm"
            >
              {t("nav.agents")}
            </Button>
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="cursor-pointer font-bold hidden lg:flex border-primary/20 hover:border-primary/40"
              size="sm"
            >
              {t("nav.sign_in")}
            </Button>
            <Button
              onClick={() => navigate("/checklist")}
              className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              size="sm"
            >
              <span className="hidden sm:inline">{t("nav.get_checklist_full")}</span>
              <span className="sm:hidden">{t("nav.get_checklist_short")}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-md flex items-center justify-around px-2 py-2">
        {[
          {
            label: t("mobile_nav.checklist"),
            path: "/checklist",
            icon: <FileText className="w-5 h-5" />,
          },
          {
            label: t("mobile_nav.photo"),
            path: "/passport-photo",
            icon: <Camera className="w-5 h-5" />,
          },
          {
            label: t("mobile_nav.agents"),
            path: "/agents",
            icon: <Users className="w-5 h-5" />,
          },
          {
            label: "Menu",
            path: "/menu",
            icon: <LayoutGrid className="w-5 h-5" />,
          },
          {
            label: t("mobile_nav.dashboard"),
            path: "/login",
            icon: <Shield className="w-5 h-5" />,
          },
        ].map((l) => (
          <button
            key={l.label}
            onClick={() => navigate(l.path)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {l.icon}
            <span className="text-[10px] font-semibold">{l.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-[0.06]"
            style={{
              background:
                "radial-gradient(ellipse, oklch(0.28 0.07 255), transparent 70%)",
            }}
          />
          <div
            className="absolute top-20 right-0 w-64 h-64 rounded-full opacity-[0.04]"
            style={{
              background:
                "radial-gradient(ellipse, oklch(0.72 0.13 80), transparent 70%)",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-28 xl:py-36 text-center">
          <PartnerWelcomeBanner />

          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="show"
          >
            <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/5 rounded-full px-4 py-1.5 mb-8 shadow-sm">
              <Award className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent tracking-[0.22em] uppercase">
                {t("hero.trust_badge")}
              </span>
            </div>
          </motion.div>

          <motion.h1
            className="font-serif text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-semibold text-primary leading-[1.06] text-balance mb-6"
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="show"
          >
            {t("hero.title1")}
            <br />
            <span className="italic" style={{ color: "oklch(0.72 0.13 80)" }}>
              {t("hero.title2")}
            </span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 text-balance leading-relaxed"
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="show"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.p
            className="text-sm text-muted-foreground mb-10 font-medium tracking-wide"
            variants={fadeUp}
            custom={2.5}
            initial="hidden"
            animate="show"
          >
            <Lock className="w-3 h-3 inline mr-1 text-accent" />
            <em>{t("hero.privacy")}</em> {t("hero.privacy_suffix")}
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="show"
          >
            <Button
              size="lg"
              className="cursor-pointer px-10 py-6 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
              onClick={() => navigate("/checklist")}
            >
              {t("hero.cta_primary")}
              <ChevronRight className="w-5 h-5 ml-1.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="cursor-pointer px-8 py-6 text-base font-semibold border-border hover:border-accent/50 hover:bg-accent/5"
              onClick={() => navigate("/pricing")}
            >
              {t("hero.cta_secondary")}
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={3.1}
            initial="hidden"
            animate="show"
          >
            <button
              onClick={() => navigate("/risk-score")}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              <TrendingUp className="w-4 h-4" />
              {t("hero.risk_score_cta")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>

          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground"
            variants={fadeUp}
            custom={3.2}
            initial="hidden"
            animate="show"
          >
            <span className="rounded-full border border-border bg-card/80 px-3 py-1.5">{t("hero.pill_free")}</span>
            <span className="rounded-full border border-border bg-card/80 px-3 py-1.5">{t("hero.pill_confidence")}</span>
            <span className="rounded-full border border-border bg-card/80 px-3 py-1.5">{t("hero.pill_expert")}</span>
          </motion.div>

          {/* Destination pills */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 mt-12"
            variants={fadeUp}
            custom={4}
            initial="hidden"
            animate="show"
          >
            {DESTINATIONS.map((d) => (
              <button
                key={d.name}
                onClick={() => navigate("/checklist")}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer text-sm font-medium shadow-sm"
              >
                <span className="text-base">{d.flag}</span>
                <span className="text-foreground/80">{translateCountry(d.name)}</span>
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-border/60 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center"
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <div
                className="font-serif text-3xl font-semibold text-primary-foreground mb-1"
                style={{ color: "oklch(0.72 0.13 80)" }}
              >
                {s.value}
              </div>
              <div className="text-xs text-primary-foreground/60 tracking-widest uppercase">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Why it feels different ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-16 md:pb-24">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {WHY_CARDS.map((item, i) => (
            <motion.div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-accent/40 hover:shadow-md transition-all"
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">{item.icon}</div>
              <h3 className="font-semibold text-primary text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-24">
        <motion.div
          className="text-center mb-8 md:mb-16"
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <p className="text-xs tracking-widest uppercase text-accent font-medium mb-3">
            {t("how.label")}
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">
            {t("how.title")}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {HOW_STEPS.map((item, i) => (
            <motion.div
              key={item.n}
              className="relative bg-card border border-border rounded-xl p-8 group hover:border-accent/40 hover:shadow-md transition-all"
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <div className="font-serif text-5xl font-semibold text-border group-hover:text-accent/30 transition-colors mb-4 select-none">
                {item.n}
              </div>
              <h3 className="font-semibold text-primary text-lg mb-2">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-24">
          <motion.div
            className="text-center mb-8 md:mb-16"
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <p
              className="text-xs tracking-widest uppercase font-medium mb-3"
              style={{ color: "oklch(0.72 0.13 80)" }}
            >
              {t("features.label")}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary-foreground">
              {t("features.title")}
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="flex gap-5 bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/8 transition-all"
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background: "oklch(0.72 0.13 80 / 15%)",
                    color: "oklch(0.72 0.13 80)",
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-primary-foreground/60 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Applicants Choose VisaClear ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-24">
        <motion.div
          className="text-center mb-8 md:mb-16"
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <p className="text-xs tracking-widest uppercase text-accent font-medium mb-3">
            {t("testimonials.label")}
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">
            {t("testimonials.title")}
          </h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {WHY_VISACLEAR.map((w, i) => (
            <motion.div
              key={w.headline}
              className="bg-card border border-border rounded-xl p-8 flex flex-col"
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <div className="mb-4 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <w.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-primary mb-2">{w.headline}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{w.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  {item.icon}
                </div>
                <div className="font-semibold text-sm text-primary">
                  {item.label}
                </div>
                <div className="text-xs text-muted-foreground">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-24 text-center">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <p className="text-xs tracking-widest uppercase text-accent font-medium mb-4">
            {t("cta.label")}
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-primary mb-4 text-balance">
            {t("cta.title")}
          </h2>
          <p className="text-muted-foreground mb-10 text-balance">
            {t("cta.subtitle")}
          </p>
          <Button
            size="lg"
            className="cursor-pointer px-12 py-6 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg"
            onClick={() => navigate("/checklist")}
          >
            {t("cta.button")}
            <ChevronRight className="w-5 h-5 ml-1.5" />
          </Button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <button onClick={() => navigate("/")} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">
                  VisaClear
                </span>
                <span className="text-[10px] text-muted-foreground ml-2 tracking-widest uppercase">
                  by Vericore
                </span>
              </div>
            </button>
            <div className="text-center">
              <p className="text-xs text-muted-foreground italic mb-1">
                &ldquo;{t("footer.tagline")}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Vericore Ltd. {t("footer.rights")}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {FOOTER_LINKS.map((l) => (
                <button
                  key={l.label}
                  onClick={() => navigate(l.path)}
                  className={`cursor-pointer px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${l.color}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground/60 mt-6 max-w-2xl mx-auto">
            {t("footer.disclaimer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
