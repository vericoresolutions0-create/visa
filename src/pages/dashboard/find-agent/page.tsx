import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  HelpCircle,
  Search,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { AVAILABLE_DESTINATIONS, VISA_TYPES } from "@/lib/visa-data.ts";
import type { Doc } from "@/convex/_generated/dataModel.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type UrgencyLevel = "urgent" | "standard" | "exploring";
type MarketplaceLead = Doc<"marketplace_leads">;

// ─── Constants ────────────────────────────────────────────────────────────────

const URGENCY_OPTIONS: {
  value: UrgencyLevel;
  label: string;
  description: string;
  icon: typeof Zap;
  credits: number;
}[] = [
  {
    value: "exploring",
    label: "Just exploring",
    description: "I'm researching my options and not in a hurry",
    icon: Search,
    credits: 2,
  },
  {
    value: "standard",
    label: "Within 1–2 months",
    description: "I have a timeline and want to start the process soon",
    icon: Clock,
    credits: 3,
  },
  {
    value: "urgent",
    label: "Urgent — need help now",
    description: "My deadline is close or I've already had a refusal",
    icon: Zap,
    credits: 5,
  },
];

const URGENCY_CONFIG = {
  urgent: { label: "Urgent", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800", icon: Zap },
  standard: { label: "Standard", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800", icon: Clock },
  exploring: { label: "Exploring", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800", icon: Search },
};

const DEMO_LEADS: MarketplaceLead[] = [
  {
    _id: "demo_lead_1" as MarketplaceLead["_id"],
    _creationTime: Date.now() - 2 * 60 * 60 * 1000,
    userId: "demo_user" as MarketplaceLead["userId"],
    visaType: "Skilled Worker Visa",
    destinationCountry: "United Kingdom",
    urgencyLevel: "standard",
    additionalNotes: "I have a job offer from a UK employer and need help with the sponsorship process.",
    status: "open",
    unlockCost: 3,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Active Lead Card ─────────────────────────────────────────────────────────

function ActiveLeadCard({
  lead,
  onClose,
  closing,
}: {
  lead: MarketplaceLead;
  onClose: (id: MarketplaceLead["_id"]) => void;
  closing: boolean;
}) {
  const urg = URGENCY_CONFIG[lead.urgencyLevel];
  const UrgIcon = urg.icon;

  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                urg.bg,
                urg.color,
              )}
            >
              <UrgIcon className="w-3 h-3" />
              {urg.label}
            </span>
            {lead.status === "open" ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live — visible to agents
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                Closed
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-primary mt-2">{lead.visaType}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            {lead.destinationCountry}
          </p>
          {lead.additionalNotes && (
            <p className="text-xs text-muted-foreground/80 mt-2 leading-relaxed line-clamp-2">
              {lead.additionalNotes}
            </p>
          )}
        </div>

        {lead.status === "open" && (
          <button
            onClick={() => onClose(lead._id)}
            disabled={closing}
            className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer border border-border hover:border-destructive/40 rounded-lg px-2.5 py-1.5"
            title="Mark as resolved — removes from marketplace"
          >
            {closing ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Submission Form ──────────────────────────────────────────────────────────

function SubmitLeadForm({
  onSuccess,
  isDemo,
}: {
  onSuccess: () => void;
  isDemo: boolean;
}) {
  const [destination, setDestination] = useState("");
  const [visaType, setVisaType] = useState("");
  const [urgency, setUrgency] = useState<UrgencyLevel | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitLead = useMutation(api.marketplace.submitLead);

  const visaTypeOptions = VISA_TYPES.map((vt) => vt.label);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !visaType || !urgency) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      if (isDemo) {
        toast.success("Lead submitted! Agents in the marketplace can now see your request.");
        onSuccess();
        return;
      }

      await submitLead({
        destinationCountry: destination,
        visaType,
        urgencyLevel: urgency,
        additionalNotes: notes.trim() || undefined,
      });
      toast.success("Your request is live! Verified agents can now reach out to you.");
      onSuccess();
    } catch (err) {
      const msg =
        err instanceof ConvexError
          ? (err.data as { message?: string })?.message ?? "Could not submit your request."
          : "Could not submit your request.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Destination */}
      <div>
        <label className="block text-sm font-semibold text-primary mb-2">
          Where are you applying? <span className="text-destructive">*</span>
        </label>
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
          className="w-full text-sm border border-border rounded-xl px-4 py-3 bg-background text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        >
          <option value="">Select destination country</option>
          {AVAILABLE_DESTINATIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Visa type */}
      <div>
        <label className="block text-sm font-semibold text-primary mb-2">
          Visa / permit type <span className="text-destructive">*</span>
        </label>
        <select
          value={visaType}
          onChange={(e) => setVisaType(e.target.value)}
          required
          className="w-full text-sm border border-border rounded-xl px-4 py-3 bg-background text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        >
          <option value="">Select visa type</option>
          {visaTypeOptions.map((vt) => (
            <option key={vt} value={vt}>
              {vt}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Urgency */}
      <div>
        <label className="block text-sm font-semibold text-primary mb-3">
          How soon do you need help? <span className="text-destructive">*</span>
        </label>
        <div className="space-y-2">
          {URGENCY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = urgency === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                className={cn(
                  "w-full text-left flex items-start gap-4 px-4 py-3.5 rounded-xl border transition-all cursor-pointer",
                  selected
                    ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                    : "border-border hover:border-primary/30 hover:bg-muted/30",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    selected ? "bg-accent/15" : "bg-muted",
                  )}
                >
                  <Icon className={cn("w-4 h-4", selected ? "text-accent" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold", selected ? "text-primary" : "text-primary/80")}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center",
                    selected ? "border-accent bg-accent" : "border-muted-foreground/30",
                  )}
                >
                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-primary mb-2">
          Tell agents about your situation{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="E.g. I have a job offer, my current visa expires in 3 months, I had a refusal last year…"
          className="w-full text-sm border border-border rounded-xl px-4 py-3 bg-background text-primary placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
        />
        <p className="text-xs text-muted-foreground/60 mt-1 text-right">
          {notes.length}/1000
        </p>
      </div>

      {/* Privacy note */}
      <div className="flex gap-2.5 rounded-xl bg-muted/40 border border-border px-4 py-3">
        <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your name and email are only revealed to an agent{" "}
          <strong className="text-primary">after they pay credits to unlock your lead</strong>. The notes
          you write above are also masked until then.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting || !destination || !visaType || !urgency}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all",
          destination && visaType && urgency
            ? "bg-accent text-white hover:bg-accent/90 active:scale-[0.99] cursor-pointer"
            : "bg-muted text-muted-foreground cursor-not-allowed",
        )}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Submit My Request
          </>
        )}
      </button>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FindAgentPage() {
  const navigate = useNavigate();
  const { isDemoAuthenticated } = useDemoAuth();
  const [showForm, setShowForm] = useState(false);
  const [closingId, setClosingId] = useState<MarketplaceLead["_id"] | null>(null);

  const [demoLeads, setDemoLeads] = useState<MarketplaceLead[]>([]);

  const realLeads =
    useQuery(api.marketplace.getMySubmittedLeads, isDemoAuthenticated ? "skip" : {}) ?? [];
  const closeLead = useMutation(api.marketplace.closeLead);

  const myLeads = isDemoAuthenticated ? demoLeads : realLeads;
  const hasOpenLead = myLeads.some((l) => l.status === "open");

  const handleClose = async (leadId: MarketplaceLead["_id"]) => {
    setClosingId(leadId);
    try {
      if (isDemoAuthenticated) {
        setDemoLeads((prev) =>
          prev.map((l) => (l._id === leadId ? { ...l, status: "closed" } : l)),
        );
        toast.success("Lead marked as resolved.");
        return;
      }
      await closeLead({ leadId });
      toast.success("Lead marked as resolved. It's been removed from the marketplace.");
    } catch (err) {
      toast.error("Could not close this lead. Please try again.");
    } finally {
      setClosingId(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    if (isDemoAuthenticated) {
      setDemoLeads([DEMO_LEADS[0]]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-xs font-semibold text-primary">Find an Agent</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold text-primary">Find a Verified Agent</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Submit your visa request once. Verified immigration agents see your case and reach out
            to help — you stay anonymous until you decide to connect.
          </p>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-border bg-muted/20 p-5">
          <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-accent" />
            How it works
          </h2>
          <ol className="space-y-3">
            {[
              {
                icon: <Sparkles className="w-4 h-4 text-accent" />,
                title: "Describe your case",
                desc: "Tell us which visa you need and how urgent it is.",
              },
              {
                icon: <Users className="w-4 h-4 text-blue-500" />,
                title: "Agents review your request",
                desc: "Your request goes live to verified agents. They pay credits to unlock your contact details.",
              },
              {
                icon: <BadgeCheck className="w-4 h-4 text-emerald-500" />,
                title: "Only serious agents reach out",
                desc: "Because agents pay to contact you, you only hear from professionals who think they can help.",
              },
              {
                icon: <Shield className="w-4 h-4 text-purple-500" />,
                title: "Your privacy is protected",
                desc: "Your name and email are masked until an agent pays to see them.",
              },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold text-muted-foreground">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    {step.icon}
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* My active leads */}
        {myLeads.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-primary mb-3">Your Request</h2>
            <div className="space-y-3">
              {myLeads.map((lead) => (
                <ActiveLeadCard
                  key={lead._id}
                  lead={lead}
                  onClose={handleClose}
                  closing={closingId === lead._id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Submit form or CTA */}
        {!hasOpenLead ? (
          showForm ? (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-primary">Your request</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-muted-foreground hover:text-primary cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <SubmitLeadForm onSuccess={handleFormSuccess} isDemo={isDemoAuthenticated} />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/3 p-6 text-center">
              <Sparkles className="w-8 h-8 text-accent/60 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-primary mb-1">
                Ready to connect with an agent?
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                It takes under a minute to post your request.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-accent/90 transition-colors cursor-pointer"
              >
                Post a Request
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )
        ) : (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Your request is live
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Verified agents in the marketplace can now see it. When one reaches out, they'll
                contact you via the email on your account. Mark it as resolved once you've found help.
              </p>
            </div>
          </div>
        )}

        {/* Browse agents link */}
        <div className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground text-center">
            Prefer to browse agents yourself?{" "}
            <button
              onClick={() => navigate("/agents")}
              className="font-semibold text-accent hover:underline cursor-pointer"
            >
              View the agent directory →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
