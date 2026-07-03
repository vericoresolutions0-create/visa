import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ConvexError } from "convex/values";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { StatsBar } from "@/components/stats-bar.tsx";
import { StarRating } from "@/components/star-rating.tsx";
import {
  Globe, ArrowLeft, CheckCircle2, Shield, Building2, Users,
  Palette, Link2, LayoutDashboard, Zap, ChevronRight,
  Mail, Phone, Lock, TrendingUp, Award,
} from "lucide-react";

type FormState = {
  agencyName: string;
  website: string;
  email: string;
  phone: string;
  country: string;
  volume: string;
  plan: string;
  message: string;
};

const EMPTY_FORM: FormState = {
  agencyName: "",
  website: "",
  email: "",
  phone: "",
  country: "",
  volume: "",
  plan: "agency",
  message: "",
};

export default function WhiteLabelPage() {
  useSeo({ title: "White-Label Solutions", description: "Launch your own visa preparation platform under your brand. VisaClear's white-label solution for immigration agencies and consultants." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const { t } = useTranslation("white-label");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitApplication = useMutation(api.whitelabel.submit);

  const HOW_IT_WORKS = [
    { step: "01", title: t("how.s1.title"), desc: t("how.s1.desc") },
    { step: "02", title: t("how.s2.title"), desc: t("how.s2.desc") },
    { step: "03", title: t("how.s3.title"), desc: t("how.s3.desc") },
  ];

  const FEATURES = [
    { icon: Palette, title: t("features.f1.title"), desc: t("features.f1.desc") },
    { icon: Link2, title: t("features.f2.title"), desc: t("features.f2.desc") },
    { icon: LayoutDashboard, title: t("features.f3.title"), desc: t("features.f3.desc") },
    { icon: Users, title: t("features.f4.title"), desc: t("features.f4.desc") },
    { icon: Shield, title: t("features.f5.title"), desc: t("features.f5.desc") },
    { icon: Zap, title: t("features.f6.title"), desc: t("features.f6.desc") },
  ];

  const PLANS = [
    {
      id: "starter",
      name: t("plans.starter.name"),
      price: 99,
      desc: t("plans.starter.desc"),
      features: [t("plans.starter.f1"), t("plans.starter.f2"), t("plans.starter.f3"), t("plans.starter.f4"), t("plans.starter.f5")],
      highlight: false,
      badge: null as string | null,
      cta: t("plans.starter.cta"),
    },
    {
      id: "agency",
      name: t("plans.agency.name"),
      price: 149,
      desc: t("plans.agency.desc"),
      features: [t("plans.agency.f1"), t("plans.agency.f2"), t("plans.agency.f3"), t("plans.agency.f4"), t("plans.agency.f5"), t("plans.agency.f6")],
      highlight: true,
      badge: t("plans.agency.badge") as string | null,
      cta: t("plans.agency.cta"),
    },
    {
      id: "enterprise",
      name: t("plans.enterprise.name"),
      price: null as number | null,
      desc: t("plans.enterprise.desc"),
      features: [t("plans.enterprise.f1"), t("plans.enterprise.f2"), t("plans.enterprise.f3"), t("plans.enterprise.f4"), t("plans.enterprise.f5"), t("plans.enterprise.f6")],
      highlight: false,
      badge: null as string | null,
      cta: t("plans.enterprise.cta"),
    },
  ];

  const TESTIMONIALS = [
    { name: t("testimonials.t1.name"), role: t("testimonials.t1.role"), quote: t("testimonials.t1.quote"), stars: 5 },
    { name: t("testimonials.t2.name"), role: t("testimonials.t2.role"), quote: t("testimonials.t2.quote"), stars: 5 },
  ];

  const FAQ = [
    { q: t("faq.q1.q"), a: t("faq.q1.a") },
    { q: t("faq.q2.q"), a: t("faq.q2.a") },
    { q: t("faq.q3.q"), a: t("faq.q3.a") },
    { q: t("faq.q4.q"), a: t("faq.q4.a") },
    { q: t("faq.q5.q"), a: t("faq.q5.a") },
  ];

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agencyName || !form.email || !form.plan) {
      toast.error(t("form.error_required"));
      return;
    }
    setSubmitting(true);
    try {
      await submitApplication({
        agencyName: form.agencyName,
        website: form.website || undefined,
        email: form.email,
        phone: form.phone || undefined,
        country: form.country || undefined,
        volume: form.volume || undefined,
        plan: form.plan,
        message: form.message || undefined,
      });
      setSubmitted(true);
      toast.success(t("form.success_toast"));
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error(t("form.error_toast"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
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
        <Button size="sm" onClick={() => document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" })} className="cursor-pointer">
          {t("nav.apply_now")}
        </Button>
      </header>

      {/* Hero */}
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
              <Building2 className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent tracking-widest uppercase">{t("hero.badge")}</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-primary leading-tight mb-6 whitespace-pre-line">
              {t("hero.title")}
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="cursor-pointer font-semibold px-8"
                onClick={() => document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t("hero.cta1")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="cursor-pointer border border-border"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t("hero.cta2")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <StatsBar
        padding="py-10"
        valueSize="text-3xl"
        stats={[
          { value: t("stats.s1.value"), label: t("stats.s1.label") },
          { value: t("stats.s2.value"), label: t("stats.s2.label") },
          { value: t("stats.s3.value"), label: t("stats.s3.label") },
          { value: t("stats.s4.value"), label: t("stats.s4.label") },
        ]}
      />

      {/* How it works */}
      <section id="how-it-works" className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">{t("how.eyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{t("how.title")}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="font-serif text-6xl font-semibold text-accent/20 mb-3">{step.step}</div>
                <h3 className="font-serif text-xl font-semibold text-primary mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">{t("features.eyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{t("features.title")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
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

      {/* Pricing */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">{t("pricing.eyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{t("pricing.title")}</h2>
            <p className="text-muted-foreground mt-3">{t("pricing.subtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  "rounded-2xl p-6 sm:p-8 border relative flex flex-col",
                  plan.highlight
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border/50"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
                <div>
                  <p className={cn("text-sm tracking-widest uppercase font-bold mb-1", plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1.5 mb-3">
                    {plan.price ? (
                      <>
                        <span className={cn("font-serif text-5xl font-semibold", plan.highlight ? "text-primary-foreground" : "text-primary")}>
                          ${plan.price}
                        </span>
                        <span className={cn("text-sm mb-2", plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground")}>{t("pricing.per_month")}</span>
                      </>
                    ) : (
                      <span className={cn("font-serif text-4xl font-semibold", plan.highlight ? "text-primary-foreground" : "text-primary")}>
                        {t("pricing.custom")}
                      </span>
                    )}
                  </div>
                  <p className={cn("text-sm leading-relaxed mb-6", plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {plan.desc}
                  </p>
                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className={cn("w-4 h-4 shrink-0 mt-0.5", plan.highlight ? "text-accent" : "text-accent")} />
                        <span className={plan.highlight ? "text-primary-foreground/85" : "text-foreground"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  className={cn(
                    "mt-auto cursor-pointer font-semibold",
                    plan.highlight && "bg-white text-primary hover:bg-white/90"
                  )}
                  variant={plan.highlight ? "secondary" : "default"}
                  onClick={() => document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" })}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">{t("testimonials.eyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{t("testimonials.title")}</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-3">
              {t("testimonials.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((item) => (
              <div key={item.name} className="bg-background rounded-2xl p-6 sm:p-8 border border-border/50">
                <div className="mb-4">
                  <StarRating count={item.stars} />
                </div>
                <p className="text-foreground leading-relaxed mb-6 italic">"{item.quote}"</p>
                <div>
                  <div className="font-semibold text-primary text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply Form */}
      <section id="apply-form" className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">{t("form.eyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{t("form.title")}</h2>
            <p className="text-muted-foreground mt-3 text-sm">{t("form.subtitle")}</p>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary rounded-2xl p-8 sm:p-12 text-center text-primary-foreground"
            >
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3">{t("submitted.title")}</h3>
              <p className="text-primary-foreground/70 mb-6">
                {t("submitted.body", { email: form.email })}
              </p>
              <Button
                variant="secondary"
                className="bg-white text-primary hover:bg-white/90 cursor-pointer"
                onClick={() => navigate("/")}
              >
                {t("submitted.back")}
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-background border border-border/50 rounded-2xl p-5 sm:p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="agencyName">{t("form.agency_label")}</Label>
                  <Input
                    id="agencyName"
                    placeholder={t("form.agency_placeholder")}
                    value={form.agencyName}
                    onChange={(e) => handleChange("agencyName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">{t("form.website_label")}</Label>
                  <Input
                    id="website"
                    placeholder={t("form.website_placeholder")}
                    value={form.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("form.email_label")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("form.email_placeholder")}
                      className="pl-9"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("form.phone_label")}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder={t("form.phone_placeholder")}
                      className="pl-9"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="country">{t("form.country_label")}</Label>
                  <Input
                    id="country"
                    placeholder={t("form.country_placeholder")}
                    value={form.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="volume">{t("form.volume_label")}</Label>
                  <Input
                    id="volume"
                    placeholder={t("form.volume_placeholder")}
                    value={form.volume}
                    onChange={(e) => handleChange("volume", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("form.plan_label")}</Label>
                <div className="grid grid-cols-3 gap-3">
                  {PLANS.map((plan) => (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() => handleChange("plan", plan.id)}
                      className={cn(
                        "rounded-xl p-3 border text-sm font-semibold transition-all cursor-pointer text-center break-words min-w-0",
                        form.plan === plan.id
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground hover:border-accent/50"
                      )}
                    >
                      {plan.name}
                      {plan.price ? (
                        <div className="text-xs font-normal mt-0.5">${plan.price}/mo</div>
                      ) : (
                        <div className="text-xs font-normal mt-0.5">{t("pricing.custom")}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">{t("form.message_label")}</Label>
                <Textarea
                  id="message"
                  placeholder={t("form.message_placeholder")}
                  rows={4}
                  value={form.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
                <span>{t("form.privacy")}</span>
              </div>

              <Button type="submit" size="lg" disabled={submitting} className="w-full cursor-pointer font-semibold disabled:opacity-60">
                {submitting ? t("form.submitting") : t("form.submit")}
                {!submitting && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-primary text-center mb-8 sm:mb-10">{t("faq.title")}</h2>
          <div className="space-y-4">
            {FAQ.map((faq) => (
              <div key={faq.q} className="bg-background rounded-xl p-6 border border-border/50">
                <h3 className="font-semibold text-primary mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-primary rounded-2xl p-8 sm:p-12 text-center text-primary-foreground">
            <Award className="w-10 h-10 text-accent mx-auto mb-4" />
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold mb-3">{t("cta.title")}</h2>
            <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
              {t("cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 cursor-pointer font-semibold"
                onClick={() => document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t("cta.apply")}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/10 cursor-pointer"
                onClick={() => navigate("/contact")}
              >
                {t("cta.talk")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom trust bar */}
      <div className="border-t border-border/40 px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> {t("trust.gdpr")}</div>
          <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> {t("trust.encrypted")}</div>
          <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> {t("trust.destinations")}</div>
          <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {t("trust.by")}</div>
        </div>
      </div>
    </div>
  );
}
