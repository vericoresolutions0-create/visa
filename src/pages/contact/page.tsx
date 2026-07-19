import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { convexErrMsg } from "@/lib/utils.ts";
import {
  Globe, ArrowLeft, Mail, Briefcase,
  Shield, Clock, CheckCircle2,
} from "lucide-react";

export default function ContactPage() {
  useSeo({ title: "Contact Us", description: "Get in touch with the VisaClear team. We're here to help with questions about your visa checklist, premium plans, or white-label solutions." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const { t } = useTranslation("contact");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const submitMessage = useMutation(api.contact.submit);

  const CONTACT_METHODS = [
    {
      icon: Mail,
      label: t("info.email.label"),
      value: "support@visaclear.app",
      hint: t("info.email.hint"),
      action: "mailto:support@visaclear.app",
      actionLabel: t("info.email.action"),
    },
    {
      icon: Briefcase,
      label: t("info.agent.label"),
      value: "hello@visaclear.app",
      hint: t("info.agent.hint"),
      action: "mailto:hello@visaclear.app",
      actionLabel: t("info.agent.action"),
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error(t("form.error_required"));
      return;
    }
    setSubmitting(true);
    try {
      await submitMessage({ name: form.name, email: form.email, subject: form.subject || undefined, message: form.message });
      setSent(true);
      toast.success(t("form.success_toast"));
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("form.error_toast"));
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
          <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-2">{t("hero.eyebrow")}</p>
          <h1 className="font-serif text-5xl font-semibold text-primary mb-4">{t("hero.title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact info */}
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-primary mb-6">{t("info.title")}</h2>
              <div className="space-y-5">
                {CONTACT_METHODS.map((c) => (
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
              <h3 className="font-serif text-lg font-semibold mb-2">{t("response.title")}</h3>
              <ul className="space-y-2 text-sm text-primary-foreground/70">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />{t("response.whatsapp")}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />{t("response.email")}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />{t("response.expert")}</li>
              </ul>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl text-xs text-muted-foreground">
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
              <span>{t("privacy_note")}</span>
            </div>
          </div>

          {/* Form */}
          <div>
            <h2 className="font-serif text-2xl font-semibold text-primary mb-6">{t("form.title")}</h2>
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary rounded-2xl p-10 text-center text-primary-foreground"
              >
                <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold mb-2">{t("form.sent.title")}</h3>
                <p className="text-primary-foreground/70 text-sm">
                  {t("form.sent.body", { email: form.email })}
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t("form.name_label")}</Label>
                    <Input id="name" placeholder={t("form.name_placeholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t("form.email_label")}</Label>
                    <Input id="email" type="email" placeholder={t("form.email_placeholder")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">{t("form.subject_label")}</Label>
                  <Input id="subject" placeholder={t("form.subject_placeholder")} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">{t("form.message_label")}</Label>
                  <Textarea id="message" placeholder={t("form.message_placeholder")} rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                </div>
                <Button type="submit" size="lg" className="w-full cursor-pointer font-semibold" disabled={submitting}>
                  {submitting ? t("form.sending") : t("form.submit")}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
