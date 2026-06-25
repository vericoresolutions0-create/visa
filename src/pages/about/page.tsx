import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Globe, ArrowLeft, Shield, Target, Users, Award, TrendingUp, Heart, Quote } from "lucide-react";
import { useSeo } from "@/hooks/use-seo.ts";

const TEAM = [
  {
    name: "Vericore Team",
    role: "Product, Engineering and Compliance",
    desc: "We are a small team of immigration technology specialists, compliance professionals, and software engineers passionate about making visa applications fairer and more accessible for applicants from Africa, Asia, and Latin America.",
  },
];

const VALUES = [
  { icon: Shield, title: "Compliance First", desc: "We build on top of GDPR and NDPA frameworks. Privacy and data protection are not afterthoughts , they are foundations." },
  { icon: Target, title: "Precision Over Volume", desc: "We would rather give one applicant exactly the right documents than give ten applicants a generic guess." },
  { icon: Heart, title: "Built for the Overlooked", desc: "Most visa tools are built for Western applicants. We built VisaClear specifically for African, Asian, and LatAm applicants who deserve better." },
  { icon: TrendingUp, title: "Continuously Updated", desc: "Visa requirements change constantly. Our team reviews and updates destination data regularly to keep checklists accurate." },
];

const STATS = [
  { value: "24+", label: "Destination countries covered" },
  { value: "5", label: "Visa types per destination" },
  { value: "100%", label: "Privacy compliant" },
  { value: "60s", label: "Average checklist generation time" },
];

const TESTIMONIALS = [
  {
    name: "Chidi O.",
    country: "Nigeria",
    text: "I applied for a UK visitor visa twice before and was rejected both times. After using VisaClear, I understood exactly what I was missing. Third attempt was approved.",
  },
  {
    name: "Amara D.",
    country: "Ghana",
    text: "The Schengen checklist was so detailed. Every document listed, where to get it, and what the officer is actually looking for. I used it for my Germany application and got approved in 12 days.",
  },
  {
    name: "Priya S.",
    country: "India",
    text: "As a freelancer, proving ties to my home country was always my problem area. The tips in the checklist helped me understand how to document my business properly. My Canada application was approved.",
  },
];

export default function AboutPage() {
  useSeo({ title: "About Us", description: "VisaClear is built by immigration technology specialists and compliance professionals, helping applicants from Africa, Asia, and LatAm get their visa right the first time." });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center gap-3 sticky top-0 z-40 bg-background/95 backdrop-blur">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <Globe className="w-5 h-5 text-accent" />
          <span className="font-serif font-semibold text-primary">VisaClear</span>
          <span className="text-xs text-muted-foreground tracking-widest uppercase">by Vericore</span>
        </button>
      </header>

      {/* Hero */}
      <section className="py-24 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
          <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">About Vericore</p>
          <h1 className="font-serif text-5xl font-semibold text-primary leading-tight mb-6">
            We built the tool we<br />wish existed before our visa rejections.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            VisaClear is built by Vericore, a compliance and immigration technology company. We started because too many good applicants were being rejected over missing or incorrect documents that no one had clearly explained to them.
          </p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-primary py-14 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-serif text-4xl font-semibold text-accent mb-1">{s.value}</div>
              <div className="text-xs text-primary-foreground/60 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">Our Mission</p>
            <h2 className="font-serif text-4xl font-semibold text-primary mb-5">Democratise access to accurate immigration information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For too long, applicants from Nigeria, Ghana, Kenya, India, and similar countries have been forced to rely on expensive agents or vague advice just to understand what documents to prepare.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              VisaClear gives every applicant a precise, personalised checklist in 60 seconds. No agent required. No guessing. Just clarity.
            </p>
            <Button onClick={() => navigate("/checklist")} className="cursor-pointer font-semibold">
              Generate Your Free Checklist
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

      {/* Testimonials */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">Real Applicants</p>
            <h2 className="font-serif text-4xl font-semibold text-primary">What applicants say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-background rounded-2xl p-6 border border-border/50"
              >
                <Quote className="w-5 h-5 text-accent/50 mb-4" />
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">{t.text}</p>
                <div className="flex items-center gap-2 pt-4 border-t border-border/40">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm font-serif">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.country}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">The Team</p>
          <h2 className="font-serif text-4xl font-semibold text-primary mb-10">Who builds VisaClear</h2>
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
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">Compliance and Trust</p>
            <h2 className="font-serif text-4xl font-semibold text-primary">Built with compliance at the core</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "GDPR Compliant", desc: "Full compliance with European data protection law for UK and EU applicants." },
              { icon: Shield, title: "NDPA Compliant", desc: "Nigeria Data Protection Act compliance for all Nigerian users and partners." },
              { icon: Award, title: "Verified Disclaimer", desc: "All checklists include a live-data disclaimer so users always verify with official embassy sources." },
            ].map((c) => (
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
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-primary rounded-2xl p-12 text-center text-primary-foreground">
            <h2 className="font-serif text-3xl font-semibold mb-3">Ready to start your visa journey?</h2>
            <p className="text-primary-foreground/70 mb-8">Generate your free personalised checklist in 60 seconds.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 cursor-pointer font-semibold"
                onClick={() => navigate("/checklist")}
              >
                Get My Free Checklist
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-primary-foreground border border-primary-foreground/30 hover:bg-primary-foreground/10 cursor-pointer"
                onClick={() => navigate("/contact")}
              >
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
