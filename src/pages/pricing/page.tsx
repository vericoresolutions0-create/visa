import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useSeo } from "@/hooks/use-seo.ts";
import { Button } from "@/components/ui/button.tsx";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
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

const PLANS = [
  {
    id: "free",
    name: "Free",
    badge: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For anyone starting their visa journey",
    cta: "Get Started Free",
    ctaVariant: "secondary" as const,
    highlight: false,
    features: [
      { text: "3 checklists per month", included: true },
      { text: "All 24 destination countries", included: true },
      { text: "Document guidance & tips", included: true },
      { text: "Official embassy links", included: true },
      { text: "Mobile friendly", included: true },
      { text: "PDF export", included: false },
      { text: "Save & resume checklists", included: false },
      { text: "Deadline reminders", included: false },
      { text: "AI rejection analyser", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Most Popular",
    monthlyPrice: 9,
    yearlyPrice: 79,
    description: "For serious applicants who cannot afford a rejection",
    cta: "Continue to Checkout",
    ctaVariant: "default" as const,
    highlight: true,
    features: [
      { text: "Unlimited checklists", included: true },
      { text: "All 24 destination countries", included: true },
      { text: "Document guidance & tips", included: true },
      { text: "Official embassy links", included: true },
      { text: "Mobile friendly", included: true },
      { text: "PDF export", included: true },
      { text: "Save & resume checklists", included: true },
      { text: "Deadline reminders & alerts", included: true },
      { text: "AI rejection analyser", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    id: "expert",
    name: "Expert",
    badge: "Best Value",
    monthlyPrice: 19,
    yearlyPrice: 149,
    description: "Full power for complex or high-stakes applications",
    cta: "Continue to Checkout",
    ctaVariant: "default" as const,
    highlight: false,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "All 24 destination countries", included: true },
      { text: "Document guidance & tips", included: true },
      { text: "Official embassy links", included: true },
      { text: "Mobile friendly", included: true },
      { text: "PDF export", included: true },
      { text: "Save & resume checklists", included: true },
      { text: "Deadline reminders & alerts", included: true },
      { text: "AI rejection analyser", included: true },
      { text: "Priority support (24h response)", included: true },
    ],
  },
];

const FEATURE_HIGHLIGHTS = [
  {
    icon: <FileText className="w-5 h-5" />,
    title: "See what went wrong in a refusal",
    desc: "Our rejection analyser reviews your refusal letter and suggests a practical recovery plan before you spend more on a second attempt."
  },
  {
    icon: <Bell className="w-5 h-5" />,
    title: "Stay on top of deadlines",
    desc: "Biometric appointments, document expiry dates, and submission windows are easier to manage with reminders you can set once.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Get clear answers as you go",
    desc: "Ask about document rules, interview questions, wait times, or what a refusal letter may mean for your next step.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Find a verified agent when you need one",
    desc: "Our marketplace connects you with vetted immigration agents who specialise in your origin-destination route. No guesswork, no scams.",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Get support when it matters",
    desc: "Expert plan holders get priority email help from the Vericore team, with faster replies when your case is more complex.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Your data stays private",
    desc: "Your information is protected. We do not sell your data or share it with third parties.",
  },
];

const TESTIMONIALS = [
  {
    name: "Amara O.",
    origin: "Nigeria → UK",
    text: "Got my UK Student visa approved first attempt. The checklist caught two documents I completely forgot about.",
    stars: 5,
  },
  {
    name: "Kwame A.",
    origin: "Ghana → Germany",
    text: "The Sperrkonto tip alone saved my German student visa application. No other free tool told me that.",
    stars: 5,
  },
  {
    name: "Blessing E.",
    origin: "Nigeria (living in Poland) → Schengen",
    text: "As a Nigerian in Poland the specific Polish resident checklist was a game changer. Zero guesswork.",
    stars: 5,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function PricingPage() {
  useSeo({
    title: "Pricing",
    description:
      "Choose a VisaClear plan. Free checklist for everyone. Pro and Expert plans unlock AI tools, PDF export, rejection analysis, and more.",
  });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const [billing, setBilling] = useState<BillingCycle>("monthly");

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
            Try Free
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
            Simple, honest pricing
          </div>
          <h1 className="font-serif text-5xl font-semibold text-primary mb-4 text-balance">
            Start with the right checklist.
            <br />
            Upgrade only when you need more support.
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Start free, understand your best route, and upgrade only when you want reminders, document support, or specialist help.
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
              Monthly
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
              Yearly
              <span className="text-[11px] font-bold text-accent bg-accent/10 rounded-full px-2 py-0.5">
                Save up to 35%
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
                    ~${Math.round(plan.yearlyPrice / 12)}/month billed annually
                    · Save {getYearlySavings(plan)}%
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
                    ${plan.monthlyPrice * 12}/year if paid monthly
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
              Everything you need to apply with confidence
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Built specifically for applicants from Africa, Asia, and Latin
              America, the nationalities most affected by rejection.
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
                <Briefcase className="w-3.5 h-3.5" /> For agents and agencies
              </div>
              <h2 className="font-serif text-3xl font-semibold text-primary mb-3">
                Turn verified expertise into a paid partner channel.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Visa professionals can list their agency, upgrade to featured placement, or move into a white-label workspace built around applicant conversion.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
              {[
                ["Verified Listing", "$29/mo"],
                ["Featured Placement", "$79/mo"],
                ["Agency White-Label", "$149/mo"],
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
              Register as an agent
            </Button>
            <Button
              variant="secondary"
              className="cursor-pointer"
              onClick={() => navigate("/payment?product=agent&plan=agent_featured&billing=monthly")}
            >
              Activate featured placement
            </Button>
          </div>
        </motion.section>

        {/* Testimonials */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <p className="text-xs tracking-widest uppercase text-accent font-medium mb-3">
              Illustrative Examples
            </p>
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">
              What an applicant's experience can look like
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Sample scenarios based on common applicant situations — not verified customer quotes.
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
                  <p className="text-xs text-muted-foreground">{t.origin}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20">
          <h2 className="font-serif text-3xl font-semibold text-primary text-center mb-10">
            Common questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Is the free plan really free?",
                a: "Yes. No credit card required. You get 3 full checklists every month with document tips and embassy links at no cost.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Absolutely. Cancel before your next billing date and you won't be charged again. No questions asked.",
              },
              {
                q: "How accurate is the checklist data?",
                a: "Our team manually researches and updates requirements from official embassy websites. We recommend always double-checking the official portal before submitting.",
              },
              {
                q: "Does VisaClear guarantee visa approval?",
                a: "No tool or person can guarantee visa approval. VisaClear is a guidance tool that significantly reduces your chance of rejection due to missing or incorrect documents.",
              },
              {
                q: "What countries are covered?",
                a: "We currently have full checklist data for UK, USA, Canada, Germany, Poland, France, Australia, Netherlands, and Ireland. We are expanding rapidly.",
              },
            ].map((item) => (
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
            Start free. Upgrade when you're ready.
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
            No credit card. No pressure. Just a better chance at the visa you
            need.
          </p>
          <Button
            size="lg"
            className="bg-white text-primary hover:bg-white/90 cursor-pointer font-semibold px-8"
            onClick={() => navigate("/checklist")}
          >
            Build My Free Checklist
          </Button>
        </motion.div>

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
          {[
            {
              icon: <Shield className="w-3.5 h-3.5" />,
              label: "GDPR-Aligned",
            },
            { icon: <Lock className="w-3.5 h-3.5" />, label: "NDPA-Aligned" },
            {
              icon: <Award className="w-3.5 h-3.5" />,
              label: "CISA Certified",
            },
          ].map((t) => (
            <div
              key={t.label}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className="text-accent">{t.icon}</span>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">
          &ldquo;It&apos;s all about Privacy.&rdquo;
        </p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Vericore Ltd. · VisaClear is a
          guidance tool, not legal advice.
        </p>
      </footer>
    </div>
  );
}
