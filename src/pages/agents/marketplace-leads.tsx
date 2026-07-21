import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading, useAction, useMutation, useQuery, usePaginatedQuery } from "convex/react";

import { toast } from "sonner";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { NotificationBell } from "@/components/NotificationBell.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api } from "@/convex/_generated/api.js";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Clock,
  Coins,
  CreditCard,
  ExternalLink,
  Globe,
  Info,
  Inbox,
  Lock,
  LockOpen,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCircle2,
  Zap,
} from "lucide-react";
import { AVAILABLE_DESTINATIONS } from "@/lib/visa-data.ts";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type UrgencyLevel = "urgent" | "standard" | "exploring";

type LockReason = "no_profile" | "unverified" | "insufficient_credits" | null;

type MarketplaceLead = {
  _id: Id<"marketplace_leads">;
  _creationTime: number;
  visaType: string;
  destinationCountry: string;
  urgencyLevel: UrgencyLevel;
  additionalNotes: string | null;
  status: "open" | "closed";
  unlockCost: number;
  createdAt: string;
  isUnlocked: boolean;
  lockReason: LockReason;
  unlockedAt: string | null;
  creditsSpent: number | null;
  applicantName: string;
  applicantEmail: string | null;
  applicantPhone: string | null;
};

type CreditPurchase = Doc<"agent_credit_purchases">;

// ─── Constants ────────────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; color: string; bg: string; icon: typeof Zap }> = {
  urgent: {
    label: "Urgent",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    icon: Zap,
  },
  standard: {
    label: "Standard",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    icon: Clock,
  },
  exploring: {
    label: "Exploring",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    icon: Search,
  },
};

const CREDIT_PACKAGES = [
  { credits: 10, priceCents: 1500, label: "Starter", description: "Unlock up to 3–5 leads" },
  { credits: 25, priceCents: 3000, label: "Professional", description: "Best value for active agents", highlight: true },
  { credits: 60, priceCents: 6000, label: "Agency", description: "For high-volume outreach" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  onUnlock,
  onTopUp,
  unlocking,
  creditBalance,
  navigate,
}: {
  lead: MarketplaceLead;
  onUnlock: (id: Id<"marketplace_leads">) => void;
  onTopUp: () => void;
  unlocking: Id<"marketplace_leads"> | null;
  creditBalance: number;
  navigate: ReturnType<typeof import("react-router-dom").useNavigate>;
}) {
  const urg = URGENCY_CONFIG[lead.urgencyLevel];
  const UrgIcon = urg.icon;
  const isUnlocking = unlocking === lead._id;

  // Global gate — the entire account can't unlock, not just this lead
  const isGateBlocked = lead.lockReason === "no_profile" || lead.lockReason === "unverified";
  // Per-lead credit gate
  const canAfford = !isGateBlocked && creditBalance >= lead.unlockCost;

  const gateConfig = {
    no_profile: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
      title: "Complete your agent profile to unlock leads",
      body: "Your profile is missing. Set it up to access contact details.",
      action: { label: "Complete Profile", onClick: () => navigate("/agents/register") },
      bgClass: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    },
    unverified: {
      icon: <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />,
      title: "Profile pending verification",
      body: "Our team is reviewing your credentials. You'll be able to unlock leads once approved.",
      action: { label: "View Status", onClick: () => navigate("/agents/dashboard") },
      bgClass: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    },
  } as const;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-background transition-shadow hover:shadow-md",
        lead.isUnlocked
          ? "border-emerald-200 dark:border-emerald-800 ring-1 ring-emerald-100 dark:ring-emerald-900"
          : isGateBlocked
            ? "border-border opacity-80"
            : "border-border",
      )}
    >
      {/* Card header */}
      <div className="px-5 pt-4 pb-3 border-b border-border/60 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", urg.bg, urg.color)}>
              <UrgIcon className="w-3 h-3" />
              {urg.label}
            </span>
            {lead.isUnlocked && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                <LockOpen className="w-3 h-3" />
                Unlocked
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-primary mt-1.5 line-clamp-1">
            {lead.visaType}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            {lead.destinationCountry}
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground/60 shrink-0 mt-1">
          {timeAgo(lead.createdAt)}
        </span>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 space-y-3">
        {lead.isUnlocked ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-primary">{lead.applicantName}</span>
              </div>
              {lead.applicantEmail && (
                <a href={`mailto:${lead.applicantEmail}`} className="flex items-center gap-2 text-sm text-accent hover:underline">
                  <Mail className="w-4 h-4 shrink-0" />
                  {lead.applicantEmail}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {lead.applicantPhone && (
                <a href={`tel:${lead.applicantPhone}`} className="flex items-center gap-2 text-sm text-accent hover:underline">
                  <Phone className="w-4 h-4 shrink-0" />
                  {lead.applicantPhone}
                </a>
              )}
            </div>
            {lead.additionalNotes && (
              <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                {lead.additionalNotes}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground/60">
              Unlocked {lead.unlockedAt ? timeAgo(lead.unlockedAt) : ""} · {lead.creditsSpent} credit{lead.creditsSpent === 1 ? "" : "s"} spent
            </p>
          </>
        ) : isGateBlocked && lead.lockReason !== null ? (
          // Global gate — profile missing or pending verification
          <div className={cn("rounded-xl border px-4 py-3 flex items-start gap-3", gateConfig[lead.lockReason as "no_profile" | "unverified"].bgClass)}>
            {gateConfig[lead.lockReason as "no_profile" | "unverified"].icon}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {gateConfig[lead.lockReason as "no_profile" | "unverified"].title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {gateConfig[lead.lockReason as "no_profile" | "unverified"].body}
              </p>
              <button
                onClick={gateConfig[lead.lockReason as "no_profile" | "unverified"].action.onClick}
                className="mt-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
              >
                {gateConfig[lead.lockReason as "no_profile" | "unverified"].action.label} →
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Standard masked preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <span className="text-sm text-muted-foreground/60">Verified Applicant</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <span className="text-sm text-muted-foreground/40 tracking-widest font-mono">●●●●●@●●●●●.com</span>
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 border border-dashed border-border px-3 py-2.5 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
              <span className="text-xs text-muted-foreground/60">Unlock to see their situation and contact details</span>
            </div>
          </>
        )}
      </div>

      {/* Card footer — only for unlockable leads */}
      {!lead.isUnlocked && !isGateBlocked && (
        <div className="px-5 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Coins className="w-4 h-4" />
            {lead.unlockCost} credit{lead.unlockCost === 1 ? "" : "s"}
          </div>
          {canAfford ? (
            <button
              onClick={() => onUnlock(lead._id)}
              disabled={isUnlocking}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent/90 active:scale-95 transition-all cursor-pointer"
            >
              {isUnlocking ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Unlocking…
                </>
              ) : (
                <>
                  <LockOpen className="w-3.5 h-3.5" />
                  Unlock Lead
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onTopUp}
              title={`You need ${lead.unlockCost} credits but have ${creditBalance}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent border border-border transition-all cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Top up to unlock
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Credit Balance Widget ────────────────────────────────────────────────────

function CreditBalanceBar({
  balance,
  onTopUp,
}: {
  balance: number;
  onTopUp: () => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-2.5">
      <Coins className="w-4 h-4 text-amber-500 shrink-0" />
      <span className="text-sm font-bold text-primary">{balance}</span>
      <span className="text-xs text-muted-foreground">credit{balance === 1 ? "" : "s"}</span>
      <button
        onClick={onTopUp}
        className="ml-1 flex items-center gap-1 text-xs font-semibold text-accent hover:underline cursor-pointer"
      >
        <CreditCard className="w-3.5 h-3.5" />
        Top up
      </button>
    </div>
  );
}

// ─── Top-Up Modal ─────────────────────────────────────────────────────────────

function TopUpModal({ onClose, balance }: { onClose: () => void; balance: number }) {
  const isStripeConfigured = useQuery(api.billing.isStripeConfigured);
  const purchaseCredits = useAction(api.stripe.purchaseCredits);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const handlePurchase = async (credits: 10 | 25 | 60) => {
    setPurchasing(credits);
    try {
      const { url } = await purchaseCredits({ credits });
      window.location.href = url;
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not start checkout. Please try again.");
      setPurchasing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-primary">Top Up Credits</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current balance: <strong>{balance}</strong> credit{balance === 1 ? "" : "s"}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-primary cursor-pointer p-1">
            ✕
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.credits}
              type="button"
              disabled={!isStripeConfigured || purchasing !== null}
              onClick={() => void handlePurchase(pkg.credits as 10 | 25 | 60)}
              className={cn(
                "relative w-full text-left rounded-xl border p-4 flex items-center justify-between gap-4 transition-colors",
                pkg.highlight
                  ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                  : "border-border",
                isStripeConfigured && purchasing === null
                  ? "cursor-pointer hover:border-accent hover:bg-accent/5"
                  : "cursor-not-allowed opacity-70",
              )}
            >
              {pkg.highlight && (
                <span className="absolute -top-2 left-4 text-[10px] font-bold bg-accent text-white px-2 py-0.5 rounded-full">
                  Most Popular
                </span>
              )}
              <div>
                <p className="text-sm font-bold text-primary">
                  {pkg.credits} credits
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">— {pkg.label}</span>
                </p>
                <p className="text-xs text-muted-foreground">{pkg.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-primary">
                  {purchasing === pkg.credits ? "…" : `$${(pkg.priceCents / 100).toFixed(0)}`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ${((pkg.priceCents / pkg.credits) / 100).toFixed(2)}/credit
                </p>
              </div>
            </button>
          ))}
        </div>

        {isStripeConfigured === false ? (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex gap-3 items-start">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Credit purchases temporarily unavailable
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Billing isn't connected right now. Contact{" "}
                <a href="mailto:support@visaclear.app" className="underline font-medium">
                  support@visaclear.app
                </a>{" "}
                and we'll top up your account manually in the meantime.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground text-center">
            Secure checkout via Stripe. Your card details never touch VisaClear's servers.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Credit History Tab ───────────────────────────────────────────────────────

function CreditHistoryTab({ history }: { history: CreditPurchase[] }) {
  if (history.length === 0) {
    return (
      <div className="py-16 text-center">
        <Coins className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No credit activity yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Credit purchases and lead unlocks will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-3 text-xs font-semibold text-muted-foreground">Date</th>
            <th className="pb-3 text-xs font-semibold text-muted-foreground">Credits</th>
            <th className="pb-3 text-xs font-semibold text-muted-foreground">Source</th>
            <th className="pb-3 text-xs font-semibold text-muted-foreground text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {history.map((row) => (
            <tr key={row._id}>
              <td className="py-3 text-xs text-muted-foreground">
                {new Date(row.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                +{row.creditsAdded}
              </td>
              <td className="py-3 text-xs text-muted-foreground capitalize">
                {row.source === "admin_grant" ? "Admin grant" : row.source}
                {row.notes ? ` — ${row.notes}` : ""}
              </td>
              <td className="py-3 text-xs text-muted-foreground text-right">
                {row.amountPaidCents === 0
                  ? "Free"
                  : `$${(row.amountPaidCents / 100).toFixed(2)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "browse" | "unlocked" | "history";

function MarketplaceLeadsContent() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("browse");
  const [destFilter, setDestFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | "">("");
  const [unlocking, setUnlocking] = useState<Id<"marketplace_leads"> | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);

  // Raw query results kept distinct from their `?? 0`/`?? []` fallbacks below
  // — collapsing "still loading" into "confirmed zero/empty" used to show a
  // real agent's actual balance/leads as 0/none for a beat on every visit.
  const creditBalanceRaw = useQuery(api.marketplace.getMyCreditBalance);
  const isLoadingBalance = creditBalanceRaw === undefined;
  const creditBalance = creditBalanceRaw ?? 0;
  const openLeadCount = useQuery(api.marketplace.getOpenLeadCount, {});
  const { results: leads, status: leadsStatus, loadMore: loadMoreLeads } = usePaginatedQuery(
    api.marketplace.getMarketplaceLeads,
    {
      destinationFilter: destFilter || undefined,
      urgencyFilter: (urgencyFilter as UrgencyLevel) || undefined,
    },
    { initialNumItems: 20 },
  );
  const unlockedLeadsRaw = useQuery(api.marketplace.getMyUnlockedLeads);
  const isLoadingUnlocked = unlockedLeadsRaw === undefined;
  const unlockedLeads = unlockedLeadsRaw ?? [];
  const creditHistoryRaw = useQuery(api.marketplace.getMyCreditHistory);
  const isLoadingHistory = creditHistoryRaw === undefined;
  const creditHistory = creditHistoryRaw ?? [];
  const unlockLead = useMutation(api.marketplace.unlockLead);

  const handleUnlock = async (leadId: Id<"marketplace_leads">) => {
    setUnlocking(leadId);
    try {
      const result = await unlockLead({ leadId });
      toast.success(
        `Lead unlocked! ${result.creditsSpent} credit${result.creditsSpent === 1 ? "" : "s"} spent. Balance: ${result.remainingBalance}`,
      );
    } catch (err) {
      const msg = convexErrMsg(err) ?? "Failed to unlock lead.";
      if (msg.includes("Insufficient credits")) {
        toast.error(msg, {
          action: { label: "Top up", onClick: () => setShowTopUp(true) },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setUnlocking(null);
    }
  };

  const unlockedCount = unlockedLeads.length;
  // Detect global gate reason from the first non-unlocked lead (all share the same gate)
  const globalGate = leads.find((l) => !l.isUnlocked)?.lockReason ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/agents/dashboard")}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-xs font-semibold text-primary">Lead Marketplace</span>
          <div className="flex-1" />
          <CreditBalanceBar balance={creditBalance} onTopUp={() => setShowTopUp(true)} />
          <NotificationBell />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page hero */}
        <div className="mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
              <Inbox className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Lead Marketplace</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real applicants looking for immigration help right now. Unlock a lead to see their
                contact details and reach out directly.
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              {
                icon: <Globe className="w-4 h-4 text-accent" />,
                // Real platform-wide open count, not the current page's
                // loaded length — that undercounted (and changed confusingly
                // on "Load more") since only 20 leads load at a time.
                value: openLeadCount ?? "—",
                label: "Open leads",
              },
              {
                icon: <LockOpen className="w-4 h-4 text-emerald-500" />,
                value: isLoadingUnlocked ? "—" : unlockedCount,
                label: "Unlocked",
              },
              {
                icon: <Coins className="w-4 h-4 text-amber-500" />,
                value: isLoadingBalance ? "—" : creditBalance,
                label: "Credits remaining",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center gap-3"
              >
                {s.icon}
                <div>
                  <p className="text-lg font-bold text-primary leading-none">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How credits work info strip */}
        <div className="mb-6 rounded-xl border border-border bg-muted/20 px-4 py-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-red-500" />
            <strong className="text-primary">Urgent</strong> = 5 credits
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <strong className="text-primary">Standard</strong> = 3 credits
          </span>
          <span className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-emerald-500" />
            <strong className="text-primary">Exploring</strong> = 2 credits
          </span>
          <span className="flex items-center gap-1.5 ml-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            All leads are from verified VisaClear applicants
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(
            [
              { id: "browse", label: "Browse Leads", count: leads.filter((l) => !l.isUnlocked).length },
              { id: "unlocked", label: "My Unlocked", count: unlockedCount },
              { id: "history", label: "Credit History", count: null },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={cn(
                "px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px",
                tab === t.id
                  ? "border-accent text-primary"
                  : "border-transparent text-muted-foreground hover:text-primary",
              )}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className="ml-1.5 text-[10px] bg-accent/15 text-accent rounded-full px-1.5 py-0.5 font-bold">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Browse leads tab */}
        {tab === "browse" && (
          <div>
            {/* Global gate banner — replaces the old leads === null check */}
            {globalGate === "no_profile" && (
              <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-5 py-4 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Set up your agent profile to unlock leads
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    You can browse the marketplace, but you need a verified agent profile to contact applicants.
                  </p>
                  <button
                    onClick={() => navigate("/agents/register")}
                    className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300 underline cursor-pointer"
                  >
                    Complete your profile →
                  </button>
                </div>
              </div>
            )}
            {globalGate === "unverified" && (
              <div className="mb-6 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-5 py-4 flex gap-3 items-start">
                <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Your profile is pending verification
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                    Our team is reviewing your credentials — typically 1–2 business days. You'll get a notification when approved.
                  </p>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">All destinations</option>
                {AVAILABLE_DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(["", "urgent", "standard", "exploring"] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setUrgencyFilter(u)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                      urgencyFilter === u
                        ? "bg-accent text-white border-accent"
                        : "border-border text-muted-foreground hover:text-primary hover:border-primary/30",
                    )}
                  >
                    {u === "" ? "All urgency" : URGENCY_CONFIG[u].label}
                  </button>
                ))}
              </div>
            </div>

            {leadsStatus === "LoadingFirstPage" || isLoadingBalance ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : leads.length === 0 ? (
              <div className="py-16 text-center">
                <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No open leads right now</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Check back soon — new requests come in daily.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {leads.map((lead) => (
                    <LeadCard
                      key={lead._id}
                      lead={lead}
                      onUnlock={handleUnlock}
                      onTopUp={() => setShowTopUp(true)}
                      unlocking={unlocking}
                      creditBalance={creditBalance}
                      navigate={navigate}
                    />
                  ))}
                </div>
                {leadsStatus === "CanLoadMore" && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => loadMoreLeads(20)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
                    >
                      Load more leads
                    </button>
                  </div>
                )}
                {leadsStatus === "LoadingMore" && (
                  <p className="text-center text-xs text-muted-foreground mt-6">Loading more…</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Unlocked leads tab */}
        {tab === "unlocked" && (
          <div>
            {isLoadingUnlocked ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : unlockedLeads.length === 0 ? (
              <div className="py-16 text-center">
                <LockOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No unlocked leads yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Unlock a lead in the Browse tab to see full contact details here.
                </p>
                <button
                  onClick={() => setTab("browse")}
                  className="mt-4 text-xs font-semibold text-accent hover:underline cursor-pointer"
                >
                  Browse leads →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unlockedLeads.map((lead) => (
                  <LeadCard
                    key={lead._id}
                    lead={{ ...lead, isUnlocked: true, lockReason: null, status: lead.status as "open" | "closed", urgencyLevel: lead.urgencyLevel as UrgencyLevel }}
                    onUnlock={handleUnlock}
                    onTopUp={() => setShowTopUp(true)}
                    unlocking={unlocking}
                    creditBalance={creditBalance}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Credit history tab */}
        {tab === "history" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Credit purchase and grant history</p>
              <button
                onClick={() => setShowTopUp(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Top up credits
              </button>
            </div>
            {isLoadingHistory ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : (
              <CreditHistoryTab history={creditHistory} />
            )}
          </div>
        )}

      </div>

      {showTopUp && (
        <TopUpModal balance={creditBalance} onClose={() => setShowTopUp(false)} />
      )}
    </div>
  );
}

// ─── Page export (handles auth states) ───────────────────────────────────────

export default function MarketplaceLeadsPage() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <AuthAccessPanel
          returnPath="/agents/marketplace-leads"
          hideDemoOption={true}
        />
      </Unauthenticated>
      <Authenticated>
        <MarketplaceLeadsContent />
      </Authenticated>
    </>
  );
}
