import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useTranslation } from "react-i18next";
import LocaleSwitcher from "@/components/ui/locale-switcher.tsx";
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
} from "lucide-react";

const STATS = [
  { value: "50+", label: "Visa Types" },
  { value: "10+", label: "Destinations" },
  { value: "CISA", label: "Certified Security" },
  { value: "GDPR", label: "Compliant" },
];

const FEATURES = [
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Exact Document Lists",
    desc: "Every document is named clearly, with no vague guidance. We tell you what it is, where to get it, and what embassies look for."
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Processing Times & Fees",
    desc: "Know exactly how long to wait and how much to budget before you step into any embassy.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Insider Approval Tips",
    desc: "We surface the details embassies rarely explain, from what bank statements must show to what home ties really mean in practice."
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "GDPR & NDPA Compliant",
    desc: "Your data is never sold, never shared. Built to the highest data protection standards by a CISA-certified compliance professional.",
  },
];

const TESTIMONIALS = [
  {
    name: "Amara O.",
    route: "Nigeria → United Kingdom",
    text: "Rejected twice before. This checklist showed me exactly what I was missing. Got my UK visa in 3 weeks.",
    stars: 5,
  },
  {
    name: "Kwame A.",
    route: "Ghana → Canada",
    text: "The tip about showing ties to home country changed everything. My interviewer literally mentioned it as the reason for approval.",
    stars: 5,
  },
  {
    name: "Priya S.",
    route: "India → Germany",
    text: "Nobody told me about the Fintiba blocked account before this. The detail level here is unmatched.",
    stars: 5,
  },
];

const DESTINATIONS = [
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Poland", flag: "🇵🇱" },
];

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
  });
  const navigate = useNavigate();
  const { t } = useTranslation("common");

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
              onClick={() => navigate("/agents/dashboard")}
              variant="secondary"
              className="cursor-pointer font-semibold hidden md:inline-flex"
              size="sm"
            >
              {t("nav.agents")}
            </Button>
            <Button
              onClick={() => navigate("/login")}
              variant="secondary"
              className="cursor-pointer font-medium hidden lg:flex"
              size="sm"
            >
              {t("nav.dashboard")}
            </Button>
            <Button
              onClick={() => navigate("/checklist")}
              className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              size="sm"
            >
              <span className="hidden sm:inline">Get My Checklist</span>
              <span className="sm:hidden">Checklist</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-md flex items-center justify-around px-2 py-2">
        {[
          {
            label: "Checklist",
            path: "/checklist",
            icon: <FileText className="w-5 h-5" />,
          },
          {
            label: "Photo",
            path: "/passport-photo",
            icon: <Camera className="w-5 h-5" />,
          },
          {
            label: "Agents",
            path: "/agents/dashboard",
            icon: <Users className="w-5 h-5" />,
          },
          {
            label: "Pricing",
            path: "/pricing",
            icon: <Star className="w-5 h-5" />,
          },
          {
            label: "Dashboard",
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
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="show"
          >
            <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/5 rounded-full px-4 py-1.5 mb-8 shadow-sm">
              <Award className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent tracking-[0.22em] uppercase">
                Trusted visa guidance, not guesswork
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
            Know the safest visa path
            <br />
            <span className="italic" style={{ color: "oklch(0.72 0.13 80)" }}>
              before you commit time, money, or hope.
            </span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 text-balance leading-relaxed"
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="show"
          >
            VisaClear helps you choose the right route, understand the documents that matter, and move forward with confidence instead of guesswork.
          </motion.p>

          <motion.p
            className="text-sm text-muted-foreground mb-10 font-medium tracking-wide"
            variants={fadeUp}
            custom={2.5}
            initial="hidden"
            animate="show"
          >
            <Lock className="w-3 h-3 inline mr-1 text-accent" />
            <em>{t("hero.privacy")}</em> Your data stays yours, always.
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
              Start with your free checklist
              <ChevronRight className="w-5 h-5 ml-1.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="cursor-pointer px-8 py-6 text-base font-semibold border-border hover:border-accent/50 hover:bg-accent/5"
              onClick={() => navigate("/pricing")}
            >
              See pricing
            </Button>
          </motion.div>

          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground"
            variants={fadeUp}
            custom={3.2}
            initial="hidden"
            animate="show"
          >
            <span className="rounded-full border border-border bg-card/80 px-3 py-1.5">Free to start</span>
            <span className="rounded-full border border-border bg-card/80 px-3 py-1.5">Confidence-led next steps</span>
            <span className="rounded-full border border-border bg-card/80 px-3 py-1.5">Expert help when complexity rises</span>
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
                <span className="text-foreground/80">{d.name}</span>
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
          {[
            {
              icon: <CheckCircle className="w-5 h-5" />,
              title: "Clear first step",
              desc: "We help you choose the safest route before you spend more money on the wrong path."
            },
            {
              icon: <Shield className="w-5 h-5" />,
              title: "Documents that actually matter",
              desc: "Every checklist is precise, document-focused, and easy to act on from day one."
            },
            {
              icon: <Users className="w-5 h-5" />,
              title: "Expert support when needed",
              desc: "If your case is complex, you can move into expert support without losing your progress."
            },
          ].map((item, i) => (
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
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          className="text-center mb-16"
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <p className="text-xs tracking-widest uppercase text-accent font-medium mb-3">
            Simple Process
          </p>
          <h2 className="font-serif text-4xl font-semibold text-primary">
            A smarter path, in three clear moves
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: "01",
              title: "Select Your Countries",
              desc: "Tell us where you are from and where you want to go. We cover a growing range of destinations and visa routes.",
            },
            {
              n: "02",
              title: "Choose Your Visa Type",
              desc: "Choose the route that fits your trip, from tourist and student to work, family, or transit, and we’ll guide you through the relevant checklist."
            },
            {
              n: "03",
              title: "Receive Your Checklist",
              desc: "Every document listed precisely, with where to get it, what it must contain, and insider approval tips.",
            },
          ].map((item, i) => (
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
        <div className="max-w-6xl mx-auto px-6 py-24">
          <motion.div
            className="text-center mb-16"
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
              Why VisaClear
            </p>
            <h2 className="font-serif text-4xl font-semibold text-primary-foreground">
              Built different. Built trusted.
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

      {/* ── Testimonials ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          className="text-center mb-16"
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <p className="text-xs tracking-widest uppercase text-accent font-medium mb-3">
            Real Results
          </p>
          <h2 className="font-serif text-4xl font-semibold text-primary">
            Real people. Real approvals.
          </h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              className="bg-card border border-border rounded-xl p-8 flex flex-col"
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground/80 text-sm leading-relaxed mb-6 flex-1">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="border-t border-border pt-4">
                <div className="font-semibold text-sm text-primary">
                  {t.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t.route}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {[
              {
                icon: <Shield className="w-5 h-5" />,
                label: "GDPR Compliant",
                sub: "EU Data Protection Standard",
              },
              {
                icon: <Lock className="w-5 h-5" />,
                label: "NDPA Compliant",
                sub: "Nigerian Data Protection Act",
              },
              {
                icon: <Award className="w-5 h-5" />,
                label: "CISA Certified",
                sub: "Information Security Auditor",
              },
            ].map((item) => (
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
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <p className="text-xs tracking-widest uppercase text-accent font-medium mb-4">
            Ready to Apply
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-primary mb-4 text-balance">
            Your visa approval starts with the right preparation.
          </h2>
          <p className="text-muted-foreground mb-10 text-balance">
            Get your complete, personalised checklist in 60 seconds. Free to
            start. No account required.
          </p>
          <Button
            size="lg"
            className="cursor-pointer px-12 py-6 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg"
            onClick={() => navigate("/checklist")}
          >
            Get My Free Checklist
            <ChevronRight className="w-5 h-5 ml-1.5" />
          </Button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-10">
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
                &copy; {new Date().getFullYear()} Vericore Ltd. All rights
                reserved.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                {
                  label: "Checklist",
                  path: "/checklist",
                  color:
                    "bg-blue-950/60 text-blue-200 hover:bg-blue-900/70 border-blue-800/40",
                },
                {
                  label: "Dashboard",
                  path: "/login",
                  color:
                    "bg-blue-950/60 text-blue-200 hover:bg-blue-900/70 border-blue-800/40",
                },
                {
                  label: "Profile Settings",
                  path: "/settings/profile",
                  color:
                    "bg-blue-950/60 text-blue-200 hover:bg-blue-900/70 border-blue-800/40",
                },
                {
                  label: "Rejection Analyser",
                  path: "/rejection-analyser",
                  color:
                    "bg-amber-950/60 text-amber-300 hover:bg-amber-900/70 border-amber-700/40",
                },
                {
                  label: "Photo Checker",
                  path: "/passport-photo",
                  color:
                    "bg-amber-950/60 text-amber-300 hover:bg-amber-900/70 border-amber-700/40",
                },
                {
                  label: "Agents",
                  path: "/agents/dashboard",
                  color:
                    "bg-purple-950/60 text-purple-300 hover:bg-purple-900/70 border-purple-700/40",
                },
                {
                  label: "Pricing",
                  path: "/pricing",
                  color:
                    "bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/70 border-emerald-700/40",
                },
                {
                  label: "Checkout",
                  path: "/payment?plan=pro&billing=yearly",
                  color:
                    "bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/70 border-emerald-700/40",
                },
                {
                  label: "White-Label",
                  path: "/white-label",
                  color:
                    "bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/70 border-indigo-700/40",
                },
                {
                  label: "Blog",
                  path: "/blog",
                  color:
                    "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 border-slate-600/40",
                },
                {
                  label: "About",
                  path: "/about",
                  color:
                    "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 border-slate-600/40",
                },
                {
                  label: "Contact",
                  path: "/contact",
                  color:
                    "bg-slate-800/60 text-slate-300 hover:bg-slate-700/70 border-slate-600/40",
                },
                {
                  label: "Privacy Policy",
                  path: "/privacy",
                  color:
                    "bg-muted/50 text-muted-foreground hover:bg-muted border-border/40",
                },
                {
                  label: "Terms of Service",
                  path: "/terms",
                  color:
                    "bg-muted/50 text-muted-foreground hover:bg-muted border-border/40",
                },
              ].map((l) => (
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
            This tool is a guide only and does not constitute legal or
            immigration advice. Always verify requirements directly with the
            relevant embassy or consulate before submitting any application.
          </p>
        </div>
      </footer>
    </div>
  );
}
