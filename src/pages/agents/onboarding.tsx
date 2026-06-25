import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import {
  ArrowLeft,
  Globe,
  Shield,
  CheckCircle2,
  Briefcase,
  Bell,
  LayoutDashboard,
  BadgeCheck,
  CreditCard,
} from "lucide-react";

export default function AgentOnboardingPage() {
  useSeo({
    title: "Agent Onboarding",
    description: "Guide your agency through the partner onboarding flow on VisaClear.",
  });

  const navigate = useNavigate();

  const steps = [
    {
      title: "Create your agent account",
      text: "Use Google or email/password to create a partner account. This is your secure business entry point.",
    },
    {
      title: "Verify your profile",
      text: "Our review team checks your agency details, experience, and trust signals before publishing you live.",
    },
    {
      title: "Launch your dashboard",
      text: "Once approved, your dashboard becomes the place to manage enquiries, follow-ups, and partner visibility.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">Partner Onboarding</span>
              </div>
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-primary">
            <BadgeCheck className="w-3.5 h-3.5 text-accent" /> Verify · Launch · Grow
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="grid lg:grid-cols-[1fr_0.95fr] gap-8 items-start">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent mb-4">
              <Shield className="w-3.5 h-3.5" /> Agent onboarding
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary mb-3">The right partner journey, from signup to verified dashboard.</h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">This is the trusted path for professionals who want to grow with VisaClear: register, verify, then manage applicants from a serious partner workspace.</p>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-border bg-background/80 p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">0{index + 1}</div>
                  <div>
                    <div className="font-semibold text-foreground text-sm mb-1">{step.title}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="rounded-3xl border border-border bg-gradient-to-br from-primary/8 via-card to-accent/8 p-6 md:p-8 shadow-sm space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-accent font-semibold mb-2"><CheckCircle2 className="w-4 h-4" /> Verification status</div>
              <h2 className="font-serif text-2xl font-semibold text-primary mb-1">Pending review</h2>
              <p className="text-sm text-muted-foreground">Your partner profile will be reviewed and approved before you go live to applicants.</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Briefcase className="w-4 h-4 text-accent" /> What you get after verification</div>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc ml-4">
                <li>Verified partner badge and trust signal</li>
                <li>Applicant enquiries and profile visibility</li>
                <li>Dashboard tools for follow-up and business growth</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Bell className="w-4 h-4 text-accent" /> Why this partner model works</div>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc ml-4">
                <li>Applicants find verified professionals instead of random listings.</li>
                <li>Agencies collect better leads and reduce wasted time on low-intent enquiries.</li>
                <li>Premium placement and white-label options create real commercial growth.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Bell className="w-4 h-4 text-accent" /> Suggested next steps</div>
              <p className="text-xs text-muted-foreground">Complete your account details, upload your agency information, and prepare your business profile for approval.</p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate("/payment?product=agent&plan=agent_listing&billing=monthly")} className="cursor-pointer">
                  <CreditCard className="w-4 h-4 mr-2" /> Activate listing
                </Button>
                <Button onClick={() => navigate("/agents/dashboard")} className="cursor-pointer">Preview dashboard</Button>
                <Button variant="secondary" onClick={() => navigate("/agents/register")} className="cursor-pointer">Back to sign-up</Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3 text-sm text-muted-foreground">
              <LayoutDashboard className="w-4 h-4 text-accent" />
              This onboarding flow is intentionally different from the regular applicant dashboard because the agent product is a revenue-facing partner workspace.
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
