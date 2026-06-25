import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { useSeo } from "@/hooks/use-seo.ts";
import {
  Globe, ArrowLeft, CheckCircle2, Shield, Building2, Users,
  Palette, Link2, LayoutDashboard, Zap, Star, ChevronRight,
  Mail, Phone, Lock, TrendingUp, Award,
} from "lucide-react";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Apply for a Licence",
    desc: "Fill in the short form below with your agency name, website, and expected monthly client volume.",
  },
  {
    step: "02",
    title: "We Configure Your Brand",
    desc: "We apply your logo, brand colours, and custom domain. Turnaround is 2-3 business days.",
  },
  {
    step: "03",
    title: "Launch to Your Clients",
    desc: "Share your branded URL with clients. They use the full VisaClear engine under your name.",
  },
];

const FEATURES = [
  { icon: Palette, title: "Your Logo, Your Colours", desc: "Full brand replacement. Your clients never see VisaClear or Vericore branding." },
  { icon: Link2, title: "Custom Domain", desc: "Deploy on your own domain, e.g. visas.youragency.com or tools.yourfirm.co." },
  { icon: LayoutDashboard, title: "Agent Dashboard", desc: "Track all your clients, their checklist progress, and document status from one place." },
  { icon: Users, title: "Unlimited Client Accounts", desc: "Add as many clients as you need. No per-seat charges for your end users." },
  { icon: Shield, title: "GDPR & NDPA Compliant", desc: "Full compliance documentation included. Safe for UK, EU, and African applicants." },
  { icon: Zap, title: "All Pro Features Included", desc: "AI assistant, PDF exports, rejection analyser, passport photo checker, and reminders." },
];

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 99,
    desc: "Perfect for boutique agencies with up to 50 clients per month.",
    features: [
      "Up to 50 clients/month",
      "Custom logo and colours",
      "Subdomain (agency.visaclear.com)",
      "Basic agent dashboard",
      "Email support",
    ],
    highlight: false,
    badge: null,
    cta: "Apply for Starter",
  },
  {
    id: "agency",
    name: "Agency",
    price: 149,
    desc: "For established agencies handling high volumes across multiple destinations.",
    features: [
      "Unlimited clients",
      "Custom domain (your own URL)",
      "Full white-label (zero VisaClear branding)",
      "Advanced agent dashboard",
      "Rejection analyser for your clients",
      "Priority support from Vericore team",
    ],
    highlight: true,
    badge: "Most Popular",
    cta: "Apply for Agency",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    desc: "For banks, universities, and large organisations with custom requirements.",
    features: [
      "Everything in Agency",
      "Custom AI training on your country list",
      "Data licensing agreement",
      "Dedicated account manager",
      "SLA and uptime guarantee",
      "API access for system integration",
    ],
    highlight: false,
    badge: null,
    cta: "Contact Us",
  },
];

const TESTIMONIALS = [
  {
    name: "Adaeze O.",
    role: "Director, Prime Visa Consult, Lagos",
    quote: "We went from spending 3 hours per client on document prep to 20 minutes. Our approval rate went up significantly in the first quarter.",
    stars: 5,
  },
  {
    name: "James K.",
    role: "Founder, ClearPath Immigration, Nairobi",
    quote: "The white-label setup took three days. Clients think we built this ourselves. It has completely changed how we present our services.",
    stars: 5,
  },
];

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
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agencyName || !form.email || !form.plan) {
      toast.error("Please fill in your agency name, email, and preferred plan.");
      return;
    }
    // In production this would send to a Convex mutation / email
    setSubmitted(true);
    toast.success("Application received. We will contact you within 24 hours.");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif font-semibold text-primary">VisaClear</span>
            <span className="text-xs text-muted-foreground tracking-widest uppercase">by Vericore</span>
          </button>
        </div>
        <Button size="sm" onClick={() => document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" })} className="cursor-pointer">
          Apply Now
        </Button>
      </header>

      {/* Hero */}
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
              <Building2 className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-accent tracking-widest uppercase">For Agencies and Institutions</span>
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-semibold text-primary leading-tight mb-6">
              Power Your Agency<br />with VisaClear, Invisibly
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Give your clients a premium AI-powered visa toolkit under your own brand, your own domain, and your own name. No coding. No infrastructure. Just results.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="cursor-pointer font-semibold px-8"
                onClick={() => document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" })}
              >
                Apply for a Licence
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="cursor-pointer border border-border"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                See How It Works
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-primary py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "24+", label: "Destination countries" },
            { value: "5 visa types", label: "Per destination" },
            { value: "2-3 days", label: "Setup turnaround" },
            { value: "100%", label: "Your branding" },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-serif text-3xl font-semibold text-accent mb-1">{s.value}</div>
              <div className="text-xs text-primary-foreground/60 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">Simple Process</p>
            <h2 className="font-serif text-4xl font-semibold text-primary">From application to live in 3 steps</h2>
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
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">Everything Included</p>
            <h2 className="font-serif text-4xl font-semibold text-primary">What your licence gives you</h2>
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
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">Licence Pricing</p>
            <h2 className="font-serif text-4xl font-semibold text-primary">Straightforward monthly licences</h2>
            <p className="text-muted-foreground mt-3">No setup fees. Cancel anytime. Billed monthly.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  "rounded-2xl p-8 border relative flex flex-col",
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
                        <span className={cn("text-sm mb-2", plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground")}>/month</span>
                      </>
                    ) : (
                      <span className={cn("font-serif text-4xl font-semibold", plan.highlight ? "text-primary-foreground" : "text-primary")}>
                        Custom
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
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">Agency Stories</p>
            <h2 className="font-serif text-4xl font-semibold text-primary">Agencies already using VisaClear</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-background rounded-2xl p-8 border border-border/50">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div>
                  <div className="font-semibold text-primary text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply Form */}
      <section id="apply-form" className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">Get Started</p>
            <h2 className="font-serif text-4xl font-semibold text-primary">Apply for Your Licence</h2>
            <p className="text-muted-foreground mt-3 text-sm">We review every application personally. You will hear from us within 24 hours.</p>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary rounded-2xl p-12 text-center text-primary-foreground"
            >
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-serif text-2xl font-semibold mb-3">Application Received</h3>
              <p className="text-primary-foreground/70 mb-6">
                Thank you. A member of the Vericore team will review your application and contact you at {form.email} within 24 hours.
              </p>
              <Button
                variant="secondary"
                className="bg-white text-primary hover:bg-white/90 cursor-pointer"
                onClick={() => navigate("/")}
              >
                Back to VisaClear
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-background border border-border/50 rounded-2xl p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="agencyName">Agency / Company Name *</Label>
                  <Input
                    id="agencyName"
                    placeholder="Prime Visa Consult"
                    value={form.agencyName}
                    onChange={(e) => handleChange("agencyName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    placeholder="https://youragency.com"
                    value={form.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Business Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="director@youragency.com"
                      className="pl-9"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+234 800 000 0000"
                      className="pl-9"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country of Operation</Label>
                  <Input
                    id="country"
                    placeholder="Nigeria, Kenya, Ghana..."
                    value={form.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="volume">Estimated Clients per Month</Label>
                  <Input
                    id="volume"
                    placeholder="e.g. 30-50"
                    value={form.volume}
                    onChange={(e) => handleChange("volume", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Plan *</Label>
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
                        <div className="text-xs font-normal mt-0.5">Custom</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Anything else we should know?</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your agency, the countries you focus on, or any special requirements..."
                  rows={4}
                  value={form.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
                <span>
                  Your information is kept strictly confidential and will only be used to process your licence application. We will never share your details with third parties. Covered under GDPR and NDPA.
                </span>
              </div>

              <Button type="submit" size="lg" className="w-full cursor-pointer font-semibold">
                Submit Application
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl font-semibold text-primary text-center mb-10">Common Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "Do my clients know this is built on VisaClear?",
                a: "No. On the Agency and Enterprise plans, all VisaClear and Vericore branding is removed. Your clients see only your brand.",
              },
              {
                q: "How does the custom domain work?",
                a: "You point a DNS record from your domain to our servers. We handle the SSL certificate and routing. Typical setup time is under an hour once your licence is active.",
              },
              {
                q: "Can I add more destination countries?",
                a: "Yes. Enterprise plans include custom country requests. Starter and Agency plans use the full 24+ destination library already built into VisaClear.",
              },
              {
                q: "What happens if I cancel?",
                a: "You can cancel at any time. Your branded instance stays live until the end of the billing period. No penalties.",
              },
              {
                q: "Do you offer a trial?",
                a: "We offer a 7-day free trial for the Agency plan. Apply using the form above and mention this in your message.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-background rounded-xl p-6 border border-border/50">
                <h3 className="font-semibold text-primary mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-primary rounded-2xl p-12 text-center text-primary-foreground">
            <Award className="w-10 h-10 text-accent mx-auto mb-4" />
            <h2 className="font-serif text-3xl font-semibold mb-3">Ready to upgrade your agency?</h2>
            <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
              One agency at $149/month. Better than chasing 18 individual subscribers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 cursor-pointer font-semibold"
                onClick={() => document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" })}
              >
                Apply for a Licence
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/10 cursor-pointer"
                onClick={() => navigate("/contact")}
              >
                Talk to Us First
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom trust bar */}
      <div className="border-t border-border/40 px-6 py-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> GDPR and NDPA Compliant</div>
          <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> 256-bit Encrypted</div>
          <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> 24+ Destination Countries</div>
          <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Built by Vericore</div>
        </div>
      </div>
    </div>
  );
}
