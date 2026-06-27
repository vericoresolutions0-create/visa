import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import {
  Globe, ArrowLeft, CheckCircle2, Briefcase, Users,
  ChevronRight, ShieldCheck, LayoutDashboard, FileSpreadsheet,
} from "lucide-react";

const FEATURES = [
  { icon: Users, title: "One Cohort, One View", desc: "See every relocating employee's readiness in a single dashboard, not a dozen email threads." },
  { icon: ShieldCheck, title: "Consent-First by Design", desc: "An employee's status is only ever visible after they explicitly accept your invite. Nothing is assumed." },
  { icon: LayoutDashboard, title: "A Real Pipeline, Not a Spreadsheet", desc: "Track every employee through Invited → Accepted → In Progress → Ready → Relocated." },
  { icon: FileSpreadsheet, title: "Compliance Export, On Demand", desc: "Export a live readiness report for HR or legal whenever you need one — never stale, never fabricated." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Create Your Organisation", desc: "Sign up and create your company account in under a minute." },
  { step: "02", title: "Invite Your Employees", desc: "Add each relocating employee's email. They get a real invite, not a forced enrollment." },
  { step: "03", title: "They Choose to Connect", desc: "Once they accept and link their relocation checklist, their readiness appears in your dashboard." },
];

export default function BusinessLandingPage() {
  useSeo({ title: "VisaClear for Employers", description: "Track your relocating employees' visa readiness in one dashboard. Consent-first, real data, built for companies moving people abroad." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const myOrg = useQuery(api.organizations.getMyOrganization);

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
          {myOrg ? "Go to Dashboard" : "Get Started"}
        </Button>
      </header>

      <section className="relative overflow-hidden py-24 px-6">
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
              <span className="text-xs font-semibold text-accent tracking-widest uppercase">For Companies Relocating Staff Abroad</span>
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-semibold text-primary leading-tight mb-6">
              Know Exactly Who's<br />Visa-Ready, Today
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              When you relocate employees overseas, one missing document can delay an entire move. See every employee's readiness in one dashboard — with their explicit consent, never without it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="cursor-pointer font-semibold px-8" onClick={() => navigate(ctaTarget)}>
                {myOrg ? "Go to Dashboard" : "Create Your Organisation"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">Built for HR, Not Just IT</p>
            <h2 className="font-serif text-4xl font-semibold text-primary">What you actually get</h2>
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

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">Simple Process</p>
            <h2 className="font-serif text-4xl font-semibold text-primary">From signup to a full cohort view in 3 steps</h2>
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

      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle2 className="w-8 h-8 text-accent mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-semibold text-primary mb-3">What you will never see without consent</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No financial answers. No risk-score breakdown. No document contents. Only an overall readiness percentage and a simple status — and only for employees who explicitly accepted your invite.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-primary rounded-2xl p-12 text-center text-primary-foreground">
            <Briefcase className="w-10 h-10 text-accent mx-auto mb-4" />
            <h2 className="font-serif text-3xl font-semibold mb-3">Ready to see your cohort?</h2>
            <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
              Free to start. No card required.
            </p>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 cursor-pointer font-semibold" onClick={() => navigate(ctaTarget)}>
              {myOrg ? "Go to Dashboard" : "Create Your Organisation"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
