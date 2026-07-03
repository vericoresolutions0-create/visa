import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { Button } from "@/components/ui/button.tsx";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import {
  Globe,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Lock,
  Award,
  Zap,
  FileText,
  Bell,
  Users,
  MessageSquare,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { StarRating } from "@/components/star-rating.tsx";

// ─── Plan data ───────────────────────────────────────────────────────────────
type BillingCycle = "monthly" | "yearly";

// ─── Component ───────────────────────────────────────────────────────────────
export default function PricingPage() {
  useSeo({
    title: "Pricing",
    description:
      "Choose a VisaClear plan. Free checklist for everyone. Pro and Expert plans unlock AI tools, PDF export, rejection analysis, and more.",
  });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const { t } = useTranslation("pricing");
  const translateCountry = useCountryName();
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  const PLANS = [
    {
      id: "free",
      name: t("plans.free.name"),
      badge: null,
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: t("plans.free.description"),
      cta: t("plans.free.cta"),
      ctaVariant: "secondary" as const,
      highlight: false,
      features: [
        { text: t("plans.free.f1"), included: true },
        { text: t("plans.free.f2"), included: true },
        { text: t("features_shared.f3"), included: true },
        { text: t("features_shared.f4"), included: true },
        { text: t("features_shared.f5"), included: true },
        { text: t("plans.free.f6"), included: false },
        { text: t("plans.free.f7"), included: false },
        { text: t("plans.free.f8"), included: false },
        { text: t("features_shared.f9"), included: false },
        { text: t("plans.free.f10"), included: false },
      ],
    },
    {
      id: "pro",
      name: t("plans.pro.name"),
      badge: t("plans.pro.badge"),
      monthlyPrice: 9,
      yearlyPrice: 79,
      description: t("plans.pro.description"),
      cta: t("plans.pro.cta"),
      ctaVariant: "default" as const,
      highlight: true,
      features: [
        { text: t("plans.pro.f1"), included: true },
        { text: t("plans.pro.f2"), included: true },
        { text: t("features_shared.f3"), included: true },
        { text: t("features_shared.f4"), included: true },
        { text: t("features_shared.f5"), included: true },
        { text: t("plans.pro.f6"), included: true },
        { text: t("plans.pro.f7"), included: true },
        { text: t("plans.pro.f8"), included: true },
        { text: t("features_shared.f9"), included: false },
        { text: t("plans.pro.f10"), included: false },
      ],
    },
    {
      id: "expert",
      name: t("plans.expert.name"),
      badge: t("plans.expert.badge"),
      monthlyPrice: 19,
      yearlyPrice: 149,
      description: t("plans.expert.description"),
      cta: t("plans.expert.cta"),
      ctaVariant: "default" as const,
      highlight: false,
      features: [
        { text: t("plans.expert.f1"), included: true },
        { text: t("plans.expert.f2"), included: true },
        { text: t("features_shared.f3"), included: true },
        { text: t("features_shared.f4"), included: true },
        { text: t("features_shared.f5"), included: true },
        { text: t("plans.expert.f6"), included: true },
        { text: t("plans.expert.f7"), included: true },
        { text: t("plans.expert.f8"), included: true },
        { text: t("features_shared.f9"), included: true },
        { text: t("plans.expert.f10"), included: true },
      ],
    },
  ];

  const FEATURE_HIGHLIGHTS = [
    { icon: <FileText className="w-5 h-5" />, title: t("highlights.h1.title"), desc: t("highlights.h1.desc") },
    { icon: <Bell className="w-5 h-5" />, title: t("highlights.h2.title"), desc: t("highlights.h2.desc") },
    { icon: <Zap className="w-5 h-5" />, title: t("highlights.h3.title"), desc: t("highlights.h3.desc") },
    { icon: <Users className="w-5 h-5" />, title: t("highlights.h4.title"), desc: t("highlights.h4.desc") },
    { icon: <MessageSquare className="w-5 h-5" />, title: t("highlights.h5.title"), desc: t("highlights.h5.desc") },
    { icon: <Shield className="w-5 h-5" />, title: t("highlights.h6.title"), desc: t("highlights.h6.desc") },
  ];

  const TESTIMONIALS = [
    { name: "Amara O.", origin: "Nigeria → UK", text: t("testimonials.t1.text"), stars: 5 },
    { name: "Kwame A.", origin: "Ghana → Germany", text: t("testimonials.t2.text"), stars: 5 },
    { name: "Blessing E.", origin: "Nigeria (living in Poland) → Schengen", text: t("testimonials.t3.text"), stars: 5 },
  ];

  const FAQ_ITEMS = [
    { q: t("faq.q1.q"), a: t("faq.q1.a") },
    { q: t("faq.q2.q"), a: t("faq.q2.a") },
    { q: t("faq.q3.q"), a: t("faq.q3.a") },
    { q: t("faq.q4.q"), a: t("faq.q4.a") },
    { q: t("faq.q5.q"), a: t("faq.q5.a") },
  ];

  const TRUST_BAR = [
    { icon: <Shield className="w-3.5 h-3.5" />, label: t("trust.gdpr") },
    { icon: <Lock className="w-3.5 h-3.5" />, label: t("trust.ndpa") },
    { icon: <Award className="w-3.5 h-3.5" />, label: t("trust.cisa") },
  ];

  const handlePlanCTA = (planId: string) => {
    if (planId === "free") {
      navigate("/checklist");
      return;
    }
    navigate(`/payment?plan=${planId}&billing=${billing}`);
  };

  const getPrice = (plan: (typeof PLANS)[number]) =>
    billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

  const getSuffix = (plan: (typeof PLANS)[number]) => {
    if (plan.monthlyPrice === 0) return "";
    return billing === "yearly" ? "/yr" : "/mo";
  };

  const getYearlySavings = (plan: (typeof PLANS)[number]) => {
    if (plan.monthlyPrice === 0) return 0;
    return Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">
                  VisaClear
                </span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">
                  by Vericore
                </span>
              </div>
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/checklist")}
            className="cursor-pointer"
          >
            {t("nav.try_free")}
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/5 text-accent rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase mb-6">
            <Zap className="w-3 h-3" />
            {t("hero.badge")}
          </div>
          <h1 className="font-serif text-5xl font-semibold text-primary mb-4 text-balance">
            {t("hero.title1")}
            <br />
            {t("hero.title2")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "text-sm font-medium transition-colors cursor-pointer",
                billing === "monthly"
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {t("billing.monthly")}
            </button>
            <button
              onClick={() =>
                setBilling(billing === "monthly" ? "yearly" : "monthly")
              }
              className={cn(
                "w-12 h-6 rounded-full transition-colors cursor-pointer relative",
                billing === "yearly" ? "bg-primary" : "bg-muted",
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all",
                  billing === "yearly" ? "left-6" : "left-0.5",
                )}
              />
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={cn(
                "text-sm font-medium transition-colors cursor-pointer flex items-center gap-2",
                billing === "yearly"
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {t("billing.yearly")}
              <span className="text-[11px] font-bold text-accent bg-accent/10 rounded-full px-2 py-0.5">
                {t("billing.save_badge")}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={cn(
                "rounded-2xl border p-7 flex flex-col",
                plan.highlight
                  ? "bg-primary text-primary-foreground border-primary shadow-2xl shadow-primary/20 relative"
                  : "bg-card border-border",
              )}
            >
              {plan.badge && (
                <div
                  className={cn(
                    "absolute -top-3.5 left-1/2 -translate-x-1/2 text-[11px] font-bold tracking-widest uppercase rounded-full px-4 py-1.5",
                    plan.highlight
                      ? "bg-accent text-white"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <p
                  className={cn(
                    "text-sm tracking-widest uppercase font-bold mb-1",
                    plan.highlight
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground",
                  )}
                >
                  {plan.name}
                </p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span
                    className={cn(
                      "font-serif text-5xl font-semibold",
                      plan.highlight
                        ? "text-primary-foreground"
                        : "text-primary",
                    )}
                  >
                    ${getPrice(plan)}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span
                      className={cn(
                        "text-sm mb-2",
                        plan.highlight
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground",
                      )}
                    >
                      {getSuffix(plan)}
                    </span>
                  )}
                </div>
                {plan.monthlyPrice > 0 && billing === "yearly" && (
                  <p
                    className={cn(
                      "text-xs",
                      plan.highlight
                        ? "text-primary-foreground/50"
                        : "text-muted-foreground",
                    )}
                  >
                    ~${Math.round(plan.yearlyPrice / 12)}/{t("billing.save_suffix", { percent: getYearlySavings(plan) })}
                  </p>
                )}
                {plan.monthlyPrice > 0 && billing === "monthly" && (
                  <p
                    className={cn(
                      "text-xs",
                      plan.highlight
                        ? "text-primary-foreground/50"
                        : "text-muted-foreground",
                    )}
                  >
                    {t("billing.per_year_if_monthly", { amount: `$${plan.monthlyPrice * 12}` })}
                  </p>
                )}
                <p
                  className={cn(
                    "text-sm mt-3 leading-relaxed",
                    plan.highlight
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className={cn(
                        "w-4 h-4 shrink-0 mt-0.5",
                        f.included
                          ? plan.highlight
                            ? "text-accent"
                            : "text-accent"
                          : plan.highlight
                            ? "text-primary-foreground/20"
                            : "text-muted-foreground/25",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm",
                        f.included
                          ? plan.highlight
                            ? "text-primary-foreground"
                            : "text-foreground"
                          : plan.highlight
                            ? "text-primary-foreground/35 line-through"
                            : "text-muted-foreground/50 line-through",
                      )}
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlight ? "secondary" : plan.ctaVariant}
                className={cn(
                  "w-full cursor-pointer font-semibold",
                  plan.highlight && "bg-white text-primary hover:bg-white/90",
                )}
                onClick={() => handlePlanCTA(plan.id)}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Feature highlights */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">
              {t("highlights.title")}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t("highlights.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURE_HIGHLIGHTS.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center mb-4 text-primary">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Agent monetization */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_0.85fr] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent mb-4">
                <Briefcase className="w-3.5 h-3.5" /> {t("agents.badge")}
              </div>
              <h2 className="font-serif text-3xl font-semibold text-primary mb-3">
                {t("agents.title")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {t("agents.desc")}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              {[
                [t("agents.tier1.label"), "$29/mo"],
                [t("agents.tier2.label"), "$79/mo"],
                [t("agents.tier3.label"), "$149/mo"],
              ].map(([label, price]) => (
                <div key={label} className="rounded-xl border border-border bg-background/80 p-4">
                  <div className="text-sm font-semibold text-foreground">{label}</div>
                  <div className="mt-1 text-xl font-semibold text-primary">{price}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button className="cursor-pointer" onClick={() => navigate("/agents/register")}>
              {t("agents.register_cta")}
            </Button>
            <Button
              variant="secondary"
              className="cursor-pointer"
              onClick={() => navigate("/payment?product=agent&plan=agent_featured&billing=monthly")}
            >
              {t("agents.featured_cta")}
            </Button>
          </div>
        </motion.section>

        {/* Testimonials */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <p className="text-xs tracking-widest uppercase text-accent font-medium mb-3">
              {t("testimonials.label")}
            </p>
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">
              {t("testimonials.title")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {t("testimonials.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="mb-4">
                  <StarRating count={t.stars} className="w-4 h-4 text-accent fill-current" />
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-5 italic">{`"${t.text}"`}</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.origin.split(" → ").map(translateCountry).join(" → ")}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20">
          <h2 className="font-serif text-3xl font-semibold text-primary text-center mb-10">
            {t("faq.title")}
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <div
                key={item.q}
                className="bg-card border border-border rounded-xl p-5"
              >
                <p className="font-semibold text-sm text-foreground mb-2">
                  {item.q}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary rounded-2xl p-10 text-center text-primary-foreground"
        >
          <h2 className="font-serif text-3xl font-semibold mb-3">
            {t("final_cta.title")}
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
            {t("final_cta.subtitle")}
          </p>
          <Button
            size="lg"
            className="bg-white text-primary hover:bg-white/90 cursor-pointer font-semibold px-8"
            onClick={() => navigate("/checklist")}
          >
            {t("final_cta.button")}
          </Button>
        </motion.div>

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
          {TRUST_BAR.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className="text-accent">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">
          &ldquo;{t("footer.tagline")}&rdquo;
        </p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Vericore Ltd. · {t("footer.disclaimer")}
        </p>
      </footer>
    </div>
  );
}
