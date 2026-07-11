import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, usePaginatedQuery, useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { CountrySelect } from "@/components/CountrySelect.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Globe, ArrowLeft, Users, Star, MapPin, ChevronRight,
  Plus, Check, Shield, MessageCircle, Search, Zap,
  Languages, Briefcase, Phone, BadgeCheck, LayoutDashboard,
  TrendingUp, Gem,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { AGENT_PLANS, SPECIALISATIONS, LANGUAGES_LIST } from "@/lib/agent-plans.ts";
import { AVAILABLE_DESTINATIONS } from "@/lib/visa-data.ts";

// ─── Agent Card ───────────────────────────────────────────────────────────────

type AgentTier = "agent_listing" | "agent_featured" | "agency_white_label";

type AgentProfile = {
  _id: string;
  fullName: string;
  email: string;
  country: string;
  bio: string;
  specialisations: string[];
  destinations?: string[];
  yearsExperience: number;
  languages: string[];
  verified: boolean;
  rating?: number;
  reviewCount?: number;
  phone?: string;
  tier?: AgentTier;
};

// Tier badge config — one source of truth for badge icon, label, and colours
// used in both the marketplace card and the public profile page.
const TIER_BADGE: Record<AgentTier, { label: string; icon: React.ReactNode; card: string; badge: string }> = {
  agency_white_label: {
    label: "Elite Agency",
    icon: <Gem className="w-3 h-3" />,
    card: "border-amber-300/70 ring-1 ring-amber-200/60 shadow-sm",
    badge: "bg-linear-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200",
  },
  agent_featured: {
    label: "Featured Agent",
    icon: <Star className="w-3 h-3 fill-purple-500" />,
    card: "border-purple-300/50 ring-1 ring-purple-200/40 shadow-sm",
    badge: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  agent_listing: {
    label: "Verified Agent",
    icon: <BadgeCheck className="w-3 h-3" />,
    card: "border-blue-200/60 ring-1 ring-blue-100/50",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
  },
};

function toWhatsAppNumber(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function AgentCard({ agent }: { agent: AgentProfile }) {
  const { t } = useTranslation("agents");
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();
  const [contacted, setContacted] = useState(false);
  const [sending, setSending] = useState(false);
  const contactAgent = useMutation(api.agents.contactAgent);

  const handleContact = async () => {
    if (!isAuthenticated) {
      toast.info("Sign in to contact this agent");
      navigate("/login");
      return;
    }
    setSending(true);
    try {
      await contactAgent({ agentProfileId: agent._id as Id<"agent_profiles"> });
      setContacted(true);
      toast.success(t("card.toast_sent", { name: agent.fullName }));
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error(t("card.toast_failed"));
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

  const tierCfg = agent.tier ? TIER_BADGE[agent.tier] : null;

  return (
    <div className={cn(
      "bg-card border rounded-xl p-5 hover:shadow-md transition-all",
      tierCfg ? tierCfg.card : "border-border hover:border-primary/20",
    )}>
      {tierCfg && (
        <div className={cn("inline-flex items-center gap-1.5 mb-3 text-[11px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full", tierCfg.badge)}>
          {tierCfg.icon}
          {tierCfg.label}
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-lg font-serif">
          {agent.fullName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-foreground">{agent.fullName}</span>
            {agent.verified && !agent.tier && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold border border-accent/20">
                <Check className="w-2.5 h-2.5" /> {t("card.verified")}
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
            {t("card.exp", { n: agent.yearsExperience })}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{agent.bio}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {agent.specialisations.slice(0, 4).map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary font-medium border border-primary/15">
                {s}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Languages className="w-3 h-3" />
            {agent.languages.join(", ")}
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => navigate(`/agents/${agent._id}`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
          title="View full profile"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { void handleContact(); }}
          disabled={contacted || sending}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
            contacted
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {contacted
            ? <><Check className="w-3.5 h-3.5 inline mr-1" /> {t("card.enquiry_sent")}</>
            : sending
            ? t("card.sending")
            : isAuthenticated
            ? t("card.contact")
            : "Sign in to contact"}
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
  const { t } = useTranslation("agents");
  const upsert = useMutation(api.agents.upsertProfile);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", country: "", bio: "",
    yearsExperience: 1,
    specialisations: [] as string[],
    languages: [] as string[],
    destinations: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const handleSave = async () => {
    if (!form.fullName || !form.email || !form.country || !form.bio || form.specialisations.length === 0) {
      toast.error(t("form.toast_required"));
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
        destinations: form.destinations.length > 0 ? form.destinations : undefined,
      });
      toast.success(t("form.toast_success"));
      onClose();
    } catch {
      toast.error(t("form.toast_error"));
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
        <h3 className="font-serif text-xl font-semibold text-primary mb-1">{t("form.title")}</h3>
        <p className="text-xs text-muted-foreground mb-5">{t("form.subtitle")}</p>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {[
            { label: t("form.name"), key: "fullName", type: "text", placeholder: "Your professional name" },
            { label: t("form.email"), key: "email", type: "email", placeholder: "your@email.com" },
            { label: t("form.phone"), key: "phone", type: "tel", placeholder: "+234 xxx xxx xxxx" },
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
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("form.country")}</label>
            <CountrySelect
              value={form.country}
              onChange={(v) => setForm((prev) => ({ ...prev, country: v }))}
              placeholder="Select your country"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("form.years_exp")}</label>
            <input
              type="number" min={1} max={40}
              value={form.yearsExperience}
              onChange={(e) => setForm((prev) => ({ ...prev, yearsExperience: parseInt(e.target.value) || 1 }))}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("form.bio")}</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              rows={3}
              placeholder={t("form.bio_placeholder")}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">{t("form.specialisations")}</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALISATIONS.map((s) => (
                <button
                  key={s} type="button"
                  onClick={() => setForm((prev) => ({ ...prev, specialisations: toggleItem(prev.specialisations, s) }))}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer",
                    form.specialisations.includes(s)
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
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Destination countries you serve <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">Leave blank to appear in all searches. Select specific countries to show only for those routes.</p>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {AVAILABLE_DESTINATIONS.map((d) => (
                <button
                  key={d} type="button"
                  onClick={() => setForm((prev) => ({ ...prev, destinations: toggleItem(prev.destinations, d) }))}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer",
                    form.destinations.includes(d)
                      ? "bg-accent/15 text-accent border-accent/30"
                      : "border-border text-muted-foreground hover:border-accent/30",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">{t("form.languages")}</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES_LIST.map((l) => (
                <button
                  key={l} type="button"
                  onClick={() => setForm((prev) => ({ ...prev, languages: toggleItem(prev.languages, l) }))}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer",
                    form.languages.includes(l)
                      ? "bg-accent/15 text-accent border-accent/30"
                      : "border-border text-muted-foreground hover:border-accent/30",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="secondary" className="flex-1 cursor-pointer" onClick={onClose}>{t("form.cancel")}</Button>
          <Button className="flex-1 cursor-pointer" disabled={saving} onClick={() => { void handleSave(); }}>
            {saving ? t("form.saving") : t("form.submit")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

function AgentSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-3 w-full bg-muted rounded" />
        </div>
      </div>
      <div className="h-8 w-full bg-muted rounded-lg" />
    </div>
  );
}

function AgentsMarketplace({ myProfile, onShowRegister }: {
  myProfile: { verified: boolean } | null | undefined;
  onShowRegister: () => void;
}) {
  const { t } = useTranslation("agents");
  const navigate = useNavigate();
  const sessionId = useRef(crypto.randomUUID()).current;
  const loggedRef = useRef(new Set<string>());

  const [searchVisa, setSearchVisa] = useState("");
  const [searchDest, setSearchDest] = useState("");

  const isSearching = Boolean(searchVisa || searchDest);
  const logSearch = useMutation(api.agents.logSearchEvent);

  // Reactive search — fires whenever visa or destination changes
  const searchResults = useQuery(
    api.agents.searchAgents,
    isSearching ? { visaType: searchVisa || undefined, destination: searchDest || undefined } : "skip",
  );

  // Log each unique search combination once per session
  useEffect(() => {
    if (!searchVisa && !searchDest) return;
    const key = `${searchVisa}|${searchDest}`;
    if (loggedRef.current.has(key)) return;
    loggedRef.current.add(key);
    void logSearch({
      visaType: searchVisa || undefined,
      destination: searchDest || undefined,
      sessionId,
    });
  }, [searchVisa, searchDest, logSearch, sessionId]);

  // Paginated list for "browse all" mode
  const { results: allAgents, status, loadMore } = usePaginatedQuery(
    api.agents.listAgents,
    {},
    { initialNumItems: 20 },
  );
  const featuredAgents = useQuery(api.agents.getFeaturedAgents, {});
  const [filterSpec, setFilterSpec] = useState("");

  const featuredIds = new Set((featuredAgents ?? []).map((a) => a._id));
  const filteredAll = (filterSpec
    ? allAgents.filter((a) => a.specialisations.includes(filterSpec))
    : allAgents
  ).filter((a) => !featuredIds.has(a._id));

  const totalSearchResults = isSearching && searchResults
    ? searchResults.featured.length + searchResults.listed.length
    : null;

  return (
    <div className="space-y-6">
      {/* My profile banner */}
      {myProfile && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-accent shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Your agent profile is {myProfile.verified ? t("profile.live") : t("profile.pending")}
            </p>
            <p className="text-xs text-muted-foreground">
              {myProfile.verified ? t("profile.live_body") : t("profile.pending_body")}
            </p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-3">Find an agent for your route</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Visa type</label>
            <select
              value={searchVisa}
              onChange={(e) => { setSearchVisa(e.target.value); setFilterSpec(""); }}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">Any type</option>
              {SPECIALISATIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Destination country</label>
            <select
              value={searchDest}
              onChange={(e) => { setSearchDest(e.target.value); setFilterSpec(""); }}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">Any destination</option>
              {AVAILABLE_DESTINATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          {isSearching && (
            <button
              type="button"
              onClick={() => { setSearchVisa(""); setSearchDest(""); }}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
        {isSearching && totalSearchResults !== null && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Search className="w-3 h-3" />
            {totalSearchResults === 0
              ? "No agents found for this combination yet — the network is growing."
              : `${totalSearchResults} agent${totalSearchResults !== 1 ? "s" : ""} found`}
            {searchResults && searchResults.featured.length > 0 && (
              <span className="text-amber-600 font-semibold">
                · {searchResults.featured.length} featured
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── SEARCH MODE ── */}
      {isSearching && (
        <>
          {searchResults === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <AgentSkeleton key={i} />)}
            </div>
          ) : (
            <>
              {/* Featured results */}
              {searchResults.featured.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-sm text-primary uppercase tracking-widest">Featured agents</span>
                  </div>
                  <div className="space-y-3">
                    {searchResults.featured.map((a) => (
                      <AgentCard key={a._id} agent={a} />
                    ))}
                  </div>
                </div>
              )}

              {/* Listed results */}
              {searchResults.listed.length > 0 && (
                <div>
                  {searchResults.featured.length > 0 && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-3">Other agents</p>
                  )}
                  <div className="space-y-3">
                    {searchResults.listed.map((a) => <AgentCard key={a._id} agent={a} />)}
                  </div>
                </div>
              )}

              {/* Empty search state */}
              {searchResults.featured.length === 0 && searchResults.listed.length === 0 && (
                <div className="border border-dashed border-border rounded-xl p-10 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-semibold text-foreground mb-1">No agents on this route yet</p>
                  <p className="text-sm text-muted-foreground mb-5">We're adding verified agents every week. Register your profile to be the first for this route.</p>
                  <Button size="sm" className="cursor-pointer" onClick={onShowRegister}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Register as agent
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── BROWSE ALL MODE ── */}
      {!isSearching && (
        <>
          {/* Featured agents */}
          {featuredAgents && featuredAgents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-semibold text-sm text-primary uppercase tracking-widest">{t("inner.featured")}</span>
              </div>
              <div className="space-y-3">
                {featuredAgents.map((a) => <AgentCard key={a._id} agent={a} />)}
              </div>
            </div>
          )}

          {/* Visa type filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setFilterSpec("")}
              className={cn(
                "shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer whitespace-nowrap",
                filterSpec === "" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30",
              )}
            >
              {t("inner.all")}
            </button>
            {SPECIALISATIONS.map((s) => (
              <button
                key={s}
                onClick={() => setFilterSpec(filterSpec === s ? "" : s)}
                className={cn(
                  "shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer whitespace-nowrap",
                  filterSpec === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Loading */}
          {status === "LoadingFirstPage" && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <AgentSkeleton key={i} />)}
            </div>
          )}

          {/* Agent list */}
          {status !== "LoadingFirstPage" && (
            filteredAll.length > 0 ? (
              <div className="space-y-3">
                {filteredAll.map((a) => <AgentCard key={a._id} agent={a} />)}
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-xl p-10 text-center">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-semibold text-foreground mb-1">{t("inner.empty_title")}</p>
                <p className="text-sm text-muted-foreground mb-4">{t("inner.empty_body")}</p>
              </div>
            )
          )}

          {(status === "CanLoadMore" || status === "LoadingMore") && (
            <div className="text-center">
              <Button
                variant="secondary"
                disabled={status === "LoadingMore"}
                onClick={() => loadMore(20)}
                className="cursor-pointer"
              >
                {status === "LoadingMore" ? t("inner.loading") : t("inner.load_more")}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Register CTA */}
      {!myProfile && (
        <div className="bg-gradient-to-br from-primary/8 to-accent/8 border border-primary/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-primary">{t("inner.agent_cta.title")}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">{t("inner.agent_cta.body")}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="sm" className="cursor-pointer" onClick={onShowRegister}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> {t("inner.agent_cta.register")}
            </Button>
            <Button size="sm" variant="secondary" className="cursor-pointer" onClick={() => navigate("/agents/dashboard")}>
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" /> {t("inner.agent_cta.dashboard")}
            </Button>
            <Button size="sm" variant="secondary" className="cursor-pointer" onClick={() => navigate("/agents/register")}>
              {t("inner.agent_cta.preview")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { t } = useTranslation("agents");
  useSeo({
    title: "Agents Marketplace",
    description: "Find trusted visa agents and immigration consultants on VisaClear. Search by visa type and destination — connect with verified experts who know your route inside out.",
  });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const myProfile = useQuery(api.agents.getMyProfile, {});
  const [showRegister, setShowRegister] = useState(false);

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
            <BadgeCheck className="w-3.5 h-3.5 text-accent" /> {t("header.badge")}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 space-y-8">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-border bg-gradient-to-br from-primary/8 via-card to-accent/8 p-6 md:p-8 shadow-sm"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-accent mb-4">
            <Shield className="w-3.5 h-3.5" /> {t("hero.eyebrow")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-6 items-center">
            <div>
              <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary mb-3">
                {t("hero.title")}
              </h1>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl">
                {t("hero.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button className="cursor-pointer" onClick={() => navigate("/agents/dashboard")}>
                  {t("hero.open_dashboard")} <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
                <Button variant="secondary" className="cursor-pointer" onClick={() => navigate("/agents/register")}>
                  {t("hero.register")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {[t("hero.tags.pipeline"), t("hero.tags.portal"), t("hero.tags.vault")].map((tag) => (
                  <span key={tag} className="rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">{tag}</span>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              {[
                { label: t("hero.stats.specialists"), value: "24h" },
                { label: t("hero.stats.trust"), value: "CISA-led" },
                { label: t("hero.stats.support"), value: "Direct contact" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">{stat.label}</div>
                  <div className="text-xl font-semibold text-primary">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Pricing */}
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
              <p className="eyebrow">{tier.badge}</p>
              <h2 className={cn("mt-2 font-serif text-xl font-semibold", tier.highlight ? "text-primary-foreground" : "text-primary")}>{tier.name}</h2>
              <p className={cn("mt-2 text-sm leading-relaxed", tier.highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>{tier.description}</p>
              <div className={cn("mt-4 text-2xl font-semibold", tier.highlight ? "text-primary-foreground" : "text-primary")}>
                ${tier.monthlyPrice}<span className="text-sm font-normal opacity-70">/mo</span>
              </div>
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

        {/* Why section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-3xl border border-border bg-card p-6 shadow-sm"
        >
          <p className="eyebrow">{t("why.eyebrow")}</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-primary">{t("why.title")}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border bg-background/80 p-4">{t("why.p1")}</div>
            <div className="rounded-2xl border border-border bg-background/80 p-4">{t("why.p2")}</div>
            <div className="rounded-2xl border border-border bg-background/80 p-4">{t("why.p3")}</div>
            <div className="rounded-2xl border border-border bg-background/80 p-4">{t("why.p4")}</div>
          </div>
        </motion.section>

        {/* Marketplace — public, no auth wall */}
        <section className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <p className="eyebrow">{t("marketplace.eyebrow")}</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-primary">{t("marketplace.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{t("marketplace.subtitle")}</p>
            </div>
            <Button variant="secondary" className="cursor-pointer md:w-auto" onClick={() => navigate("/agents/register")}>
              {t("marketplace.partner_onboarding")}
            </Button>
          </div>

          <AgentsMarketplace myProfile={myProfile} onShowRegister={() => setShowRegister(true)} />
        </section>

        {/* Demand transparency callout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl bg-[#0f2040] p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-[#d4a726]" />
              <span className="text-xs uppercase tracking-[0.14em] font-semibold text-white/60">For registered agents</span>
            </div>
            <h3 className="font-serif text-2xl font-semibold mb-2">See the demand flowing past you</h3>
            <p className="text-white/70 text-sm leading-relaxed max-w-lg">
              Every time an applicant searches your visa type, we log it. Your dashboard shows exactly how many searches hit your routes each month — and whether you appeared at the top or below featured agents.
            </p>
          </div>
          <div className="shrink-0 flex flex-col gap-3">
            <Button
              className="cursor-pointer bg-[#d4a726] text-[#0f2040] hover:bg-[#d4a726]/90 font-bold"
              onClick={() => navigate("/agents/dashboard")}
            >
              <Zap className="w-4 h-4 mr-1.5" /> Open dashboard
            </Button>
            <Button
              variant="secondary"
              className="cursor-pointer bg-white/10 text-white hover:bg-white/20 border-white/20"
              onClick={() => navigate(`/payment?product=agent&plan=agent_featured&billing=monthly`)}
            >
              Get Featured
            </Button>
          </div>
        </motion.div>

      </div>

      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">&ldquo;It&apos;s all about Privacy.&rdquo;</p>
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Vericore Ltd.</p>
      </footer>

      {showRegister && <RegisterAgentForm onClose={() => setShowRegister(false)} />}
    </div>
  );
}
