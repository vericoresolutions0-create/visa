import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { useState } from "react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ConvexError } from "convex/values";
import {
  Globe, ArrowLeft, Mail, Phone,
  Shield, Clock, CheckCircle2,
} from "lucide-react";

export default function ContactPage() {
  useSeo({ title: "Contact Us", description: "Get in touch with the VisaClear team. We're here to help with questions about your visa checklist, premium plans, or white-label solutions." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const submitMessage = useMutation(api.contact.submit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }
    setSubmitting(true);
    try {
      await submitMessage({ name: form.name, email: form.email, subject: form.subject || undefined, message: form.message });
      setSent(true);
      toast.success("Message sent. We will reply within 24 hours.");
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

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

      <div className="max-w-5xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
          <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">Get in Touch</p>
          <h1 className="font-serif text-5xl font-semibold text-primary mb-4">Contact Vericore</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Whether you have a question about your application, a problem with the tool, or want to discuss a white-label licence, we are here.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact info */}
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-primary mb-6">Ways to Reach Us</h2>
              <div className="space-y-5">
                {[
                  {
                    icon: Mail,
                    label: "Email Support",
                    value: "vericoresolutions0@gmail.com",
                    hint: "For detailed questions, documents, or account issues.",
                    action: "mailto:vericoresolutions0@gmail.com",
                    actionLabel: "Send Email",
                  },
                  {
                    icon: Phone,
                    label: "Agent Enquiries",
                    value: "vericoresolutions0@gmail.com",
                    hint: "For white-label licences, partnerships, and B2B pricing.",
                    action: "mailto:vericoresolutions0@gmail.com",
                    actionLabel: "Email Agency Team",
                  },
                ].map((c) => (
                  <div key={c.label} className="flex gap-4 p-5 rounded-xl border border-border/50 bg-muted/20">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <c.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">{c.label}</div>
                      <div className="font-semibold text-primary text-sm">{c.value}</div>
                      <div className="text-xs text-muted-foreground mt-1 mb-3">{c.hint}</div>
                      <a
                        href={c.action}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        {c.actionLabel} →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-primary rounded-2xl text-primary-foreground">
              <Clock className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-serif text-lg font-semibold mb-2">Response Times</h3>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />WhatsApp: within 2 hours</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />Email support: within 24 hours</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />Expert plan users: priority queue</li>
              </ul>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl text-xs text-muted-foreground">
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
              <span>All communications are encrypted and handled in line with GDPR and NDPA principles. We never share your data with third parties.</span>
            </div>
          </div>

          {/* Form */}
          <div>
            <h2 className="font-serif text-2xl font-semibold text-primary mb-6">Send a Message</h2>
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary rounded-2xl p-10 text-center text-primary-foreground"
              >
                <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold mb-2">Message Sent</h3>
                <p className="text-primary-foreground/70 text-sm">
                  We will reply to {form.email} within 24 hours.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input id="name" placeholder="John Smith" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" placeholder="example@gmail.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="e.g. Question about my checklist" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea id="message" placeholder="Tell us how we can help..." rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                </div>
                <Button type="submit" size="lg" className="w-full cursor-pointer font-semibold" disabled={submitting}>
                  {submitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
