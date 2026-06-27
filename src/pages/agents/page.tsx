import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { ConvexError } from "convex/values";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Globe, ArrowLeft, Users, Star, MapPin, ChevronRight,
  Plus, Check, Shield, LogIn, MessageCircle,
  Languages, Briefcase, Phone, BadgeCheck, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { AGENT_PLANS, SPECIALISATIONS, LANGUAGES_LIST } from "@/lib/agent-plans.ts";

const DEST_COUNTRIES = ["Nigeria", "Ghana", "Kenya", "Pakistan", "India", "Philippines", "Bangladesh", "Brazil", "Mexico", "Nigeria (living in Poland)"];

// ─── Agent Card ───────────────────────────────────────────────────────────────
type AgentProfile = {
  _id: string;
  fullName: string;
  email: string;
  country: string;
  bio: string;
  specialisations: string[];
  yearsExperience: number;
  languages: string[];
  verified: boolean;
  rating?: number;
  reviewCount?: number;
  phone?: string;
};

function toWhatsAppNumber(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function AgentCard({ agent }: { agent: AgentProfile }) {
  const [contacted, setContacted] = useState(false);
  const [sending, setSending] = useState(false);
  const contactAgent = useMutation(api.agents.contactAgent);

  const handleContact = async () => {
    setSending(true);
    try {
      await contactAgent({ agentProfileId: agent._id as Id<"agent_profiles"> });
      setContacted(true);
      toast.success(`Your enquiry was sent to ${agent.fullName}.`);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to send enquiry. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  const whatsappHref = agent.phone
    ? `https://wa.me/${toWhatsAppNumber(agent.phone)}?text=${encodeURIComponent(
        `Hi ${agent.fullName}, I found your profile on VisaClear and I'd like to ask about your visa services.`,
      )}`
    : null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-lg font-serif">
          {agent.fullName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-foreground">{agent.fullName}</span>
            {agent.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold border border-accent/20">
                <Check className="w-2.5 h-2.5" /> Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <MapPin className="w-3 h-3" />
            {agent.country}
            {agent.rating && (
              <>
                <span className="mx-1">·</span>
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>{agent.rating.toFixed(1)}</span>
                {agent.reviewCount && <span>({agent.reviewCount})</span>}
              </>
            )}
            <span className="mx-1">·</span>
            <Briefcase className="w-3 h-3" />
            {agent.yearsExperience}y exp
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{agent.bio}</p>
          {/* Specialisations */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {agent.specialisations.slice(0, 4).map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary font-medium border border-primary/15">
                {s}
              </span>
            ))}
          </div>
          {/* Languages */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Languages className="w-3 h-3" />
            {agent.languages.join(", ")}
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => { void handleContact(); }}
          disabled={contacted || sending}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
            contacted
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {contacted ? <><Check className="w-3.5 h-3.5 inline mr-1" /> Enquiry Sent</> : sending ? "Sending…" : "Contact Agent"}
        </button>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 text-xs font-medium text-[#1f9e54] hover:bg-[#25D366]/20 transition-colors cursor-pointer"
            title="Message on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>
        )}
        {agent.phone && (
          <a
            href={`tel:${agent.phone}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
            title="Call"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Register Agent form ──────────────────────────────────────────────────────
function RegisterAgentForm({ onClose }: { onClose: () => void }) {
  const upsert = useMutation(api.agents.upsertProfile);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", country: "", bio: "",
    yearsExperience: 1, specialisations: [] as string[], languages: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const handleSave = async () => {
    if (!form.fullName || !form.email || !form.country || !form.bio || form.specialisations.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      await upsert({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        country: form.country,
        bio: form.bio,
        yearsExperience: form.yearsExperience,
        specialisations: form.specialisations,
        languages: form.languages,
      });
      toast.success("Your agent profile has been submitted for verification!");
      onClose();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl my-4"
      >
        <h3 className="font-serif text-xl font-semibold text-primary mb-1">Register as a Visa Agent</h3>
        <p className="text-xs text-muted-foreground mb-5">Your profile will be reviewed and verified by the VisaClear team before going live.</p>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {[
            { label: "Full Name *", key: "fullName", type: "text", placeholder: "Your professional name" },
            { label: "Email *", key: "email", type: "email", placeholder: "your@email.com" },
            { label: "Phone (optional)", key: "phone", type: "tel", placeholder: "+234 xxx xxx xxxx" },
            { label: "Country / Base Location *", key: "country", type: "text", placeholder: "e.g. Nigeria" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-foreground mb-1.5">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form] as string}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Years of Experience</label>
            <input
              type="number"
              min={1}
              max={40}
              value={form.yearsExperience}
              onChange={(e) => setForm((prev) => ({ ...prev, yearsExperience: parseInt(e.target.value) || 1 }))}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Bio / Professional Summary *</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              rows={3}
              placeholder="Tell applicants about your expertise and success rate…"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">Visa Specialisations *</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALISATIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, specialisations: toggleItem(prev.specialisations, s) }))}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer",
                    form.specialisations.includes(s)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">Languages Spoken</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES_LIST.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, languages: toggleItem(prev.languages, l) }))}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer",
                    form.languages.includes(l)
                      ? "bg-accent/15 text-accent border-accent/30"
                      : "border-border text-muted-foreground hover:border-accent/30"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="secondary" className="flex-1 cursor-pointer" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 cursor-pointer" disabled={saving} onClick={() => { void handleSave(); }}>
            {saving ? "Saving…" : "Submit Profile"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Agents Inner ─────────────────────────────────────────────────────────────
function AgentsInner() {
  const navigate = useNavigate();
  const { results: agents, status, loadMore } = usePaginatedQuery(
    api.agents.listAgents,
    {},
    { initialNumItems: 20 },
  );
  const featuredAgents = useQuery(api.agents.getFeaturedAgents, {});
  const myProfile = useQuery(api.agents.getMyProfile, {});
  const [showRegister, setShowRegister] = useState(false);
  const [filterSpec, setFilterSpec] = useState("");

  if (status === "LoadingFirstPage") {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;
  }

  const featuredIds = new Set((featuredAgents ?? []).map((a) => a._id));
  const filtered = (filterSpec
    ? agents.filter((a) => a.specialisations.includes(filterSpec))
    : agents
  ).filter((a) => !featuredIds.has(a._id));

  return (
    <div className="space-y-6">
      {/* My profile banner */}
      {myProfile && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-accent shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Your agent profile is {myProfile.verified ? "live" : "pending verification"}</p>
            <p className="text-xs text-muted-foreground">
              {myProfile.verified ? "Applicants can now find and contact you." : "Our team will review your profile within 2–3 business days."}
            </p>
          </div>
        </div>
      )}

      {/* Featured agents (real paid-tier ranking) */}
      {featuredAgents && featuredAgents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-accent fill-accent" />
            <span className="font-semibold text-sm text-primary uppercase tracking-widest">Featured Agents</span>
          </div>
          <div className="space-y-3">
            {featuredAgents.map((a) => <AgentCard key={a._id} agent={a} />)}
          </div>
        </div>
      )}

      {/* Filter row */}
      <div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setFilterSpec("")}
            className={cn("shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer whitespace-nowrap",
              filterSpec === "" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            All Agents
          </button>
          {SPECIALISATIONS.map((s) => (
            <button
              key={s}
              onClick={() => setFilterSpec(filterSpec === s ? "" : s)}
              className={cn("shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer whitespace-nowrap",
                filterSpec === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Agent list */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((a) => <AgentCard key={a._id} agent={a} />)}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-semibold text-foreground mb-1">No verified agents yet</p>
          <p className="text-sm text-muted-foreground mb-4">Be the first to register as a verified VisaClear agent.</p>
        </div>
      )}

      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <div className="text-center">
          <Button
            variant="secondary"
            disabled={status === "LoadingMore"}
            onClick={() => loadMore(20)}
            className="cursor-pointer"
          >
            {status === "LoadingMore" ? "Loading…" : "Load more agents"}
          </Button>
        </div>
      )}

      {/* Register CTA */}
      {!myProfile && (
        <div className="bg-gradient-to-br from-primary/8 to-accent/8 border border-primary/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-primary">Are you a visa agent?</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Register your profile to connect with applicants searching VisaClear for visa help. Get verified to display a trust badge.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="sm" className="cursor-pointer" onClick={() => setShowRegister(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Register as Agent
            </Button>
            <Button size="sm" variant="secondary" className="cursor-pointer" onClick={() => navigate("/agents/dashboard")}>
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" /> View agent OS
            </Button>
            <Button size="sm" variant="secondary" className="cursor-pointer" onClick={() => navigate("/agents/register")}>
              Preview onboarding
            </Button>
          </div>
        </div>
      )}

      {showRegister && <RegisterAgentForm onClose={() => setShowRegister(false)} />}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function AgentsPage() {
  useSeo({ title: "Agents Marketplace", description: "Find trusted visa agents and immigration consultants on VisaClear. Connect with verified experts who know your destination country inside out." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">by Vericore</span>
              </div>
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-primary">
            <BadgeCheck className="w-3.5 h-3.5 text-accent" /> Partner Hub
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-border bg-gradient-to-br from-primary/8 via-card to-accent/8 p-6 md:p-8 shadow-sm"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent mb-4">
            <Shield className="w-3.5 h-3.5" /> Agent Partner Hub
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-6 items-center">
            <div className="text-left md:text-left">
              <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary mb-3">
                Premium visibility for visa professionals.
              </h1>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl">
                Give applicants a trusted place to discover your expertise, verify your credentials, and book a consultation with confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button className="cursor-pointer" onClick={() => navigate("/agents/dashboard")}>
                  Open agent dashboard <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
                <Button
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => navigate("/agents/register")}
                >
                  Register as an agent
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {['Pipeline board', 'Client portal', 'Document vault'].map((tag) => (
                  <span key={tag} className="rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">{tag}</span>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              {[
                { label: 'Verified specialists', value: '24h' },
                { label: 'Applicant trust signal', value: 'CISA-led' },
                { label: 'Support model', value: 'Direct contact' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground mb-1">{stat.label}</div>
                  <div className="text-xl font-semibold text-primary">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {AGENT_PLANS.map((tier) => (
            <article
              key={tier.id}
              className={cn(
                "rounded-3xl border p-5 shadow-sm flex flex-col",
                tier.highlight
                  ? "border-primary bg-primary text-primary-foreground shadow-primary/15"
                  : "border-border bg-card",
              )}
            >
              <p className={cn("text-[10px] uppercase tracking-[0.28em] font-semibold", tier.highlight ? "text-accent" : "text-accent")}>
                {tier.badge}
              </p>
              <h2 className={cn("mt-2 font-serif text-xl font-semibold", tier.highlight ? "text-primary-foreground" : "text-primary")}>{tier.name}</h2>
              <p className={cn("mt-2 text-sm leading-relaxed", tier.highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>{tier.description}</p>
              <div className={cn("mt-4 text-2xl font-semibold", tier.highlight ? "text-primary-foreground" : "text-primary")}>${tier.monthlyPrice}<span className="text-sm font-normal opacity-70">/mo</span></div>
              <p className={cn("mt-1 text-xs", tier.highlight ? "text-primary-foreground/60" : "text-muted-foreground")}>{tier.leadTarget}</p>
              <ul className="mt-4 space-y-2 flex-1">
                {tier.features.slice(0, 3).map((feature) => (
                  <li key={feature} className={cn("flex items-start gap-2 text-xs", tier.highlight ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    <Check className="w-3.5 h-3.5 mt-0.5 text-accent shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant={tier.highlight ? "secondary" : "default"}
                className={cn("mt-5 cursor-pointer", tier.highlight && "bg-white text-primary hover:bg-white/90")}
                onClick={() => navigate(`/payment?product=agent&plan=${tier.id}&billing=monthly`)}
              >
                {tier.cta}
              </Button>
            </article>
          ))}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-3xl border border-border bg-card p-6 shadow-sm"
        >
          <p className="text-[10px] uppercase tracking-[0.28em] text-accent font-semibold">Why agencies choose this</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-primary">Turn trust into revenue — not just visibility.</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border bg-background/80 p-4">Verified profiles make your agency look professional before the first enquiry lands.</div>
            <div className="rounded-2xl border border-border bg-background/80 p-4">Featured placement helps serious applicants find you faster when their route is urgent.</div>
            <div className="rounded-2xl border border-border bg-background/80 p-4">The platform gives you a serious business workspace instead of a cluttered listing page.</div>
            <div className="rounded-2xl border border-border bg-background/80 p-4">White-label options let you grow beyond one agency into a branded service model.</div>
          </div>
        </motion.section>

        <section className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-accent font-semibold">Marketplace</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-primary">Browse verified agents or manage your profile.</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                Applicants can find trusted professionals, while agent partners can maintain their listing and conversion workflow from the same hub.
              </p>
            </div>
            <Button variant="secondary" className="cursor-pointer md:w-auto" onClick={() => navigate("/agents/register")}>
              Partner onboarding
            </Button>
          </div>

        <AuthLoading>
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
        </AuthLoading>
        <Unauthenticated>
          <div className="py-10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                <LogIn className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-primary mb-3">Sign In to Browse Agents</h2>
              <p className="text-muted-foreground text-sm">Sign in with Google or your email to view verified agents, send contact requests, or list your own agency.</p>
            </div>
            <div className="max-w-sm mx-auto">
              <AuthAccessPanel returnPath="/agents" hideDemoOption />
            </div>
          </div>
        </Unauthenticated>
        <Authenticated>
          <AgentsInner />
        </Authenticated>
        </section>
      </div>

      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">&ldquo;It&apos;s all about Privacy.&rdquo;</p>
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Vericore Ltd.</p>
      </footer>
    </div>
  );
}
