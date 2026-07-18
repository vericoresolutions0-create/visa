import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { api } from "@/convex/_generated/api.js";
import {
  AGENT_PLANS,
  SPECIALISATIONS,
  LANGUAGES_LIST,
  getAgentPlan,
  getAgentPlanPrice,
  type AgentPlanId,
  type BillingCycle,
} from "@/lib/agent-plans.ts";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";
import {
  ArrowLeft,
  Globe,
  Shield,
  CheckCircle2,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  BadgeCheck,
  CreditCard,
  ChevronRight,
} from "lucide-react";

export default function AgentRegisterPage() {
  const { t } = useTranslation("agents");
  useSeo({
    title: "Agent Registration",
    description: "Register your visa professional profile on VisaClear and start building trust with applicants.",
  });

  const navigate = useNavigate();
  const goBack = useSmartBack("/agents");
  const { isDemoAuthenticated } = useDemoAuth();
  const { isAuthenticated } = useAuth();
  const canContinue = isDemoAuthenticated || isAuthenticated;
  const [params] = useSearchParams();
  const initialPlan = getAgentPlan(params.get("plan"));
  const [step, setStep] = useState(1);
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<AgentPlanId>(
    initialPlan.id,
  );
  const selectedPlan = getAgentPlan(selectedPlanId);
  const selectedPrice = getAgentPlanPrice(selectedPlan, billing);
  const checkoutPath = `/payment?product=agent&plan=${selectedPlan.id}&billing=${billing}`;

  const upsertAgentProfile = useMutation(api.agents.upsertProfile);
  const myProfile = useQuery(api.agents.getMyProfile, {});
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    bio: "",
    yearsExperience: 1,
    specialisations: [] as string[],
    languages: [] as string[],
    region: "" as "" | "global" | "europe",
    credentialType: "",
    credentialNumber: "",
    credentialVerifyUrl: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  // This page is reachable by an agent who already has a live profile (e.g.
  // the onboarding screen's "back to signup" button). Without pre-filling
  // from their real data, re-submitting this form silently overwrites their
  // existing profile with a blank one — any field left untouched here gets
  // wiped, since upsertProfile patches with exactly what it's given. Hydrate
  // once when the real profile arrives; the `hydrated` guard stops this from
  // clobbering the agent's own in-progress edits if the query re-fires later.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (hydrated || myProfile === undefined) return;
    setHydrated(true);
    if (!myProfile) return;
    setProfile({
      fullName: myProfile.fullName,
      email: myProfile.email,
      phone: myProfile.phone ?? "",
      country: myProfile.country,
      bio: myProfile.bio,
      yearsExperience: myProfile.yearsExperience,
      specialisations: myProfile.specialisations,
      languages: myProfile.languages,
      region: myProfile.region ?? "",
      credentialType: myProfile.credentialType ?? "",
      credentialNumber: myProfile.credentialNumber ?? "",
      credentialVerifyUrl: myProfile.credentialVerifyUrl ?? "",
    });
  }, [myProfile, hydrated]);

  const toggleProfileItem = (key: "specialisations" | "languages", item: string) => {
    setProfile((prev) => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter((x) => x !== item)
        : [...prev[key], item],
    }));
  };

  const handleContinueToReview = async () => {
    if (!profile.fullName || !profile.email || !profile.country || !profile.bio || profile.specialisations.length === 0) {
      toast.error(t("register.toast_required"));
      return;
    }
    setSavingProfile(true);
    try {
      await upsertAgentProfile({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone || undefined,
        country: profile.country,
        bio: profile.bio,
        yearsExperience: profile.yearsExperience,
        specialisations: profile.specialisations,
        languages: profile.languages,
        region: (profile.region as "global" | "europe") || undefined,
        credentialType: profile.credentialType.trim() || undefined,
        credentialNumber: profile.credentialNumber.trim() || undefined,
        credentialVerifyUrl: profile.credentialVerifyUrl.trim() || undefined,
      });
      setStep(3);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("register.toast_error"));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">{t("register.header_tag")}</span>
              </div>
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <BadgeCheck className="w-3.5 h-3.5 text-accent" /> {t("register.verified_partner")}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8 items-start">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm lg:sticky lg:top-24"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-accent mb-4">
              <Shield className="w-3.5 h-3.5" /> {t("register.eyebrow")}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-primary mb-4">{t("register.h1")}</h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
              {t("register.subtitle")}
            </p>

            <div className="space-y-3">
              {[
                t("register.feature1"),
                t("register.feature2"),
                t("register.feature3"),
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-background/80 p-4">
                  <CheckCircle2 className="w-4 h-4 text-accent mt-0.5" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background/80 p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="eyebrow">{t("register.partner_plan_label")}</p>
                  <h2 className="font-serif text-2xl font-semibold text-primary">{t("register.monetize_title")}</h2>
                </div>
                <div className="flex rounded-full border border-border bg-card p-1 text-xs font-semibold">
                  {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => setBilling(cycle)}
                      className={cn(
                        "rounded-full px-3 py-1.5 capitalize transition-colors cursor-pointer",
                        billing === cycle
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-primary",
                      )}
                    >
                      {cycle}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                {AGENT_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all cursor-pointer",
                      selectedPlanId === plan.id
                        ? "border-primary bg-primary/8 shadow-sm"
                        : "border-border bg-card hover:border-primary/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-foreground">{plan.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{plan.audience}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary">${getAgentPlanPrice(plan, billing)}</div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                className="mt-4 w-full cursor-pointer"
                onClick={() => navigate(checkoutPath)}
              >
                {t("register.activate", { plan: selectedPlan.name })}
                <CreditCard className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl border border-border bg-gradient-to-br from-primary/8 via-card to-accent/8 p-6 md:p-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="eyebrow">{t("register.step_of", { step })}</p>
                <h2 className="font-serif text-2xl font-semibold text-primary">{t("register.create_account")}</h2>
              </div>
              <div className="hidden sm:block rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                {selectedPlan.name}
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  {t("register.step1_body")}
                </div>
                <AuthAccessPanel returnPath="/agents/register" hideDemoOption />
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <Button variant="ghost" onClick={() => navigate("/login")} className="cursor-pointer">{t("register.already_account")}</Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canContinue}
                    className="cursor-pointer"
                  >
                    {canContinue ? t("register.continue_profile") : t("register.sign_in_above")}
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"><Briefcase className="w-4 h-4 text-accent" /> {t("register.business_profile")}</div>
                  <p className="text-xs text-muted-foreground">{t("register.business_profile_body")}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm">{t("register.full_name")}
                    <input
                      value={profile.fullName}
                      onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5"
                      placeholder={t("register.full_name_placeholder")}
                    />
                  </label>
                  <label className="text-sm">{t("register.email")}
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5"
                      placeholder={t("register.email_placeholder")}
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm">{t("register.phone")}
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5"
                      placeholder={t("register.phone_placeholder")}
                    />
                  </label>
                  <label className="text-sm">{t("register.country")}
                    <input
                      value={profile.country}
                      onChange={(e) => setProfile((prev) => ({ ...prev, country: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5"
                      placeholder={t("register.country_placeholder")}
                    />
                  </label>
                </div>
                <label className="text-sm block">
                  <div className="flex items-center justify-between">
                    <span>{t("register.bio")}</span>
                    <span className="text-[11px] text-muted-foreground">{profile.bio.length}/1000</span>
                  </div>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                    maxLength={1000}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 min-h-[90px]"
                    placeholder={t("register.bio_placeholder")}
                  />
                </label>
                <label className="text-sm block">{t("register.years_exp")}
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={profile.yearsExperience}
                    onChange={(e) => setProfile((prev) => ({ ...prev, yearsExperience: Math.min(60, parseInt(e.target.value) || 1) }))}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5"
                  />
                </label>
                <div>
                  <p className="text-sm mb-2">{t("register.specialisations")}</p>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALISATIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleProfileItem("specialisations", s)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer",
                          profile.specialisations.includes(s)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm mb-2">{t("register.languages")}</p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES_LIST.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => toggleProfileItem("languages", l)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer",
                          profile.languages.includes(l)
                            ? "bg-accent/15 text-accent border-accent/30"
                            : "border-border text-muted-foreground hover:border-accent/30",
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm mb-2">Market focus</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Helps applicants find you in EU/global searches and drives lead marketplace routing.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        { value: "global", label: "Global", desc: "You work with applicants worldwide" },
                        { value: "europe", label: "Europe / EU", desc: "You specialise in EU/Schengen routes" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setProfile((prev) => ({ ...prev, region: opt.value }))}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all cursor-pointer",
                          profile.region === opt.value
                            ? "border-primary bg-primary/8 shadow-sm"
                            : "border-border hover:border-primary/30",
                        )}
                      >
                        <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Credentials — optional, shown to clients for trust */}
                <div>
                  <p className="text-sm font-medium mb-1">Professional credentials <span className="text-muted-foreground font-normal text-xs">(optional)</span></p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Adding your OISC, RCIC, Bar number, or similar reference gives clients a way to verify your registration independently.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm">Credential type
                      <input
                        value={profile.credentialType}
                        onChange={(e) => setProfile((prev) => ({ ...prev, credentialType: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5"
                        placeholder="e.g. OISC Level 1, RCIC, Bar Membership"
                        maxLength={100}
                      />
                    </label>
                    <label className="text-sm">Reference number
                      <input
                        value={profile.credentialNumber}
                        onChange={(e) => setProfile((prev) => ({ ...prev, credentialNumber: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5"
                        placeholder="e.g. F201912345"
                        maxLength={100}
                      />
                    </label>
                  </div>
                  <label className="text-sm mt-3 block">Verification URL
                    <input
                      type="url"
                      value={profile.credentialVerifyUrl}
                      onChange={(e) => setProfile((prev) => ({ ...prev, credentialVerifyUrl: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5"
                      placeholder="https://oisc.homeoffice.gov.uk/Reg/..."
                      maxLength={500}
                    />
                    <span className="text-[11px] text-muted-foreground">Link to your public listing on the regulator's website.</span>
                  </label>
                </div>
                <div className="flex justify-between gap-3">
                  <Button variant="secondary" onClick={() => setStep(1)} className="cursor-pointer">{t("register.back")}</Button>
                  <Button
                    onClick={() => { void handleContinueToReview(); }}
                    disabled={savingProfile}
                    className="cursor-pointer"
                  >
                    {savingProfile ? t("register.saving") : t("register.continue")}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-accent" /> {t("register.verification_by_team")}</div>
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-accent" /> {t("register.direct_contact")}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" /> {t("register.local_expertise")}</div>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">{t("register.selected_plan")}</p>
                      <h3 className="mt-1 font-serif text-2xl font-semibold text-primary">{selectedPlan.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{selectedPlan.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-semibold text-primary">${selectedPrice}</div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background/80 p-4 text-sm text-muted-foreground">
                  {t("register.review_note")}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <Button variant="secondary" onClick={() => setStep(2)} className="cursor-pointer">{t("register.back")}</Button>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="secondary" onClick={() => navigate("/agents/onboarding")} className="cursor-pointer">{t("register.preview_onboarding")}</Button>
                    <Button onClick={() => navigate(checkoutPath)} className="cursor-pointer">
                      {t("register.continue_checkout")} <ChevronRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        </div>
      </main>
    </div>
  );
}
