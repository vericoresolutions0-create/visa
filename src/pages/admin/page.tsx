import { useState, Fragment, Component, type ReactNode, type ErrorInfo } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth } from "@/hooks/use-auth.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { NotificationBell } from "@/components/NotificationBell.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { CountrySelect } from "@/components/CountrySelect.tsx";
import {
  Globe, ArrowLeft, Shield, Users, FileText, BarChart3,
  CheckCircle2, XCircle, Trash2, ChevronDown, ChevronUp,
  AlertCircle, UserCheck, Settings, Send, Clock, Star,
  Building2, Copy, Plus, Eye, UserPlus, ListChecks, MessageCircle,
  RefreshCw, Award, LogOut, Menu, X, Coins, Lock, LockOpen, Info,
  Sparkles, CalendarClock, Languages, Brain, ShieldAlert, AlertTriangle,
  Search, UserX,
} from "lucide-react";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";
import { WORLD_DESTINATIONS } from "@/lib/countries.ts";
import { COUNTRY_REGION } from "@/lib/country-region.ts";
import { EMBASSY_MONITOR_URLS, type EmbassyRegion } from "@/lib/embassy-monitor-urls.ts";

type Tab = "overview" | "users" | "agents" | "setup" | "country-watch" | "data-freshness" | "telegram-bot" | "whatsapp-bot" | "wall-of-fame" | "community" | "wait-times" | "partners" | "leads" | "messages" | "employers" | "audit-log" | "blog" | "marketplace-leads" | "credit-mgmt" | "security-log" | "corridor-intelligence" | "checklist-flags" | "approvals" | "creators" | "health" | "agent-reports" | "embassy-monitor" | "risk-mitigations" | "ai-usage";

const NAV_ITEMS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "overview",             icon: BarChart3,     label: "Overview" },
  { id: "users",                icon: Users,         label: "Users" },
  { id: "agents",               icon: UserCheck,     label: "Agents" },
  { id: "security-log",         icon: ShieldAlert,   label: "Security Intelligence" },
  { id: "risk-mitigations",     icon: Shield,        label: "Risk Mitigations" },
  { id: "audit-log",            icon: ListChecks,    label: "Audit Log" },
  { id: "setup",                icon: Settings,      label: "Setup" },
  { id: "country-watch",        icon: Globe,         label: "Country Watch" },
  { id: "data-freshness",       icon: RefreshCw,     label: "Data Freshness" },
  { id: "telegram-bot",         icon: MessageCircle, label: "Telegram Bot" },
  { id: "whatsapp-bot",         icon: MessageCircle, label: "WhatsApp Bot" },
  { id: "wall-of-fame",         icon: Award,         label: "Wall of Fame" },
  { id: "community",            icon: Users,         label: "Community" },
  { id: "wait-times",           icon: Clock,         label: "Wait Times" },
  { id: "partners",             icon: Building2,     label: "Partners" },
  { id: "leads",                icon: UserPlus,      label: "Leads" },
  { id: "messages",             icon: MessageCircle, label: "Messages" },
  { id: "employers",            icon: Building2,     label: "Employers" },
  { id: "marketplace-leads",    icon: UserPlus,      label: "Marketplace Leads" },
  { id: "credit-mgmt",          icon: Star,          label: "Credit Management" },
  { id: "blog",                 icon: FileText,      label: "Blog" },
  { id: "corridor-intelligence", icon: BarChart3,    label: "Corridor Intel" },
  { id: "checklist-flags",      icon: AlertCircle,   label: "Checklist Flags" },
  { id: "approvals",            icon: Award,         label: "Approvals" },
  { id: "creators",             icon: Sparkles,      label: "Creators" },
  { id: "health",               icon: Shield,        label: "System Health" },
  { id: "agent-reports",        icon: AlertCircle,   label: "Agent Reports" },
  { id: "embassy-monitor",      icon: Globe,         label: "Embassy Monitor" },
  { id: "ai-usage",             icon: Sparkles,      label: "AI Usage" },
];

// Isolates a single admin tab panel from crashing the whole page.
// key={tab} on the wrapper ensures it resets when switching tabs.
class PanelErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  componentDidCatch(_e: Error, info: ErrorInfo) { console.error("Admin panel error:", _e, info.componentStack); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm font-semibold text-red-500">This panel failed to load.</p>
          <p className="text-xs text-gray-400 max-w-sm text-center break-words">{this.state.error}</p>
          <button
            className="text-xs text-[#0f2040] font-semibold underline cursor-pointer"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function StatCard({ icon, label, value, sub, onClick }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl p-6 shadow-sm${onClick ? " cursor-pointer hover:border-[#0f2040]/20 hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-[#0f2040]/8 flex items-center justify-center text-[#0f2040]">
          {icon}
        </div>
      </div>
      <div className="font-serif text-4xl font-semibold text-[#0f2040]">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-2">{sub}</div>}
    </div>
  );
}

// ─── Risk Mitigations panel ──────────────────────────────────────────────────
function RiskMitigationsPanel() {
  const pendingReviews = useQuery(api.agentReviews.listPending, {});
  const pendingReports = useQuery(api.embassyData.listAgentReports, {});
  const embassyAlerts = useQuery(api.embassyData.listActiveAlerts, {});
  const allSnapshots = useQuery(api.embassyData.listAllSnapshots, {});

  const features: {
    risk: string;
    num: string;
    title: string;
    description: string;
    status: "live" | "attention";
    action?: string;
    actionTab?: Tab;
    metric?: string;
  }[] = [
    {
      risk: "Risk 1",
      num: "01",
      title: "Checklist freshness badge",
      description: "Last-verified date and embassy link shown on every checklist card so users can see how current the data is.",
      status: "live",
      metric: "Active on all checklists",
    },
    {
      risk: "Risk 1",
      num: "02",
      title: "Embassy page monitor",
      description: "Weekly cron hashes each embassy page. Change alerts fire here when content differs from the stored baseline.",
      status: (embassyAlerts?.length ?? 0) > 0 ? "attention" : "live",
      metric: allSnapshots !== undefined
        ? `${allSnapshots.length} destinations monitored · ${embassyAlerts?.length ?? 0} active alert${(embassyAlerts?.length ?? 0) !== 1 ? "s" : ""}`
        : "Loading…",
      action: "View alerts",
      actionTab: "embassy-monitor",
    },
    {
      risk: "Risk 2",
      num: "03",
      title: "AI score band labels",
      description: "Raw probability number replaced with plain-English bands (Application looks strong / Some gaps / Significant gaps) + inline disclaimer.",
      status: "live",
      metric: "Active on Dashboard + Rejection Analyser",
    },
    {
      risk: "Risk 3",
      num: "04",
      title: "Agent credentials",
      description: "OISC, RCIC, Bar number and verification URL on agent profiles. Verifiable / Not independently verified badge shown publicly.",
      status: "live",
      metric: "Agents can add via their registration form",
    },
    {
      risk: "Risk 3",
      num: "05",
      title: "Client reviews",
      description: "1–5 star reviews with comments, held pending until you approve them. Agent average rating updates atomically on approval.",
      status: (pendingReviews?.length ?? 0) > 0 ? "attention" : "live",
      metric: pendingReviews !== undefined
        ? `${pendingReviews.length} pending review${pendingReviews.length !== 1 ? "s" : ""} awaiting approval`
        : "Loading…",
      action: "Moderate reviews",
      actionTab: "agents",
    },
    {
      risk: "Risk 3",
      num: "06",
      title: "Agent report button",
      description: "Flag button on every agent profile. Reports come here with reason + details for review. No login required to report.",
      status: (pendingReports?.length ?? 0) > 0 ? "attention" : "live",
      metric: pendingReports !== undefined
        ? `${pendingReports.length} pending report${pendingReports.length !== 1 ? "s" : ""} to review`
        : "Loading…",
      action: "Review reports",
      actionTab: "agent-reports",
    },
  ];

  const attentionCount = features.filter((f) => f.status === "attention").length;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#0f2040] mb-1">Risk Mitigations</h2>
            <p className="text-sm text-gray-500">6 trust and safety features live in production. All deployed 12 Jul 2026.</p>
          </div>
          <div className="flex items-center gap-3">
            {attentionCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                <AlertCircle className="w-3.5 h-3.5" /> {attentionCount} need{attentionCount === 1 ? "s" : ""} attention
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> All clear
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#0f2040]/8 text-[#0f2040]">
              6 / 6 live
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f) => (
          <div
            key={f.num}
            className={cn(
              "bg-white rounded-2xl border shadow-sm p-5",
              f.status === "attention" ? "border-amber-200" : "border-gray-100",
            )}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="font-serif text-2xl font-bold text-[#c9a84c] leading-none min-w-[28px]">{f.num}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">{f.risk}</span>
                  {f.status === "attention" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                      <AlertCircle className="w-2.5 h-2.5" /> Needs attention
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 border border-green-100 text-green-700">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Live
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#0f2040]">{f.title}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">{f.description}</p>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className={cn("text-xs font-semibold", f.status === "attention" ? "text-amber-700" : "text-gray-400")}>
                {f.metric}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Agent Review Moderation panel ───────────────────────────────────────────
function AgentReviewModerationPanel() {
  const pending = useQuery(api.agentReviews.listPending, {});
  const moderate = useMutation(api.agentReviews.moderate);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleDecision = async (reviewId: Id<"agent_reviews">, decision: "approved" | "rejected") => {
    setProcessing(reviewId);
    try {
      await moderate({ reviewId, decision });
      toast.success(decision === "approved" ? "Review approved and published." : "Review rejected.");
    } catch {
      toast.error("Could not moderate review.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-serif text-base font-semibold text-[#0f2040] mb-1">Pending Reviews</h3>
      <p className="text-xs text-gray-400 mb-4">Reviews submitted by users waiting for approval before going public on agent profiles.</p>
      {pending === undefined ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-gray-400">No pending reviews.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((review) => (
            <div key={review._id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={cn("w-3.5 h-3.5", n <= review.starRating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                    ))}
                  </div>
                  {review.comment && <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Agent: <span className="font-mono">{review.agentProfileId}</span>
                    {" · "}{new Date(review.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={processing === review._id}
                    onClick={() => void handleDecision(review._id, "approved")}
                    className="text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    disabled={processing === review._id}
                    onClick={() => void handleDecision(review._id, "rejected")}
                    className="text-xs font-semibold text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agent Reports panel ─────────────────────────────────────────────────────
function AgentReportsPanel() {
  const reports = useQuery(api.embassyData.listAgentReports, {});
  const process = useMutation(api.embassyData.processAgentReport);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleProcess = async (reportId: Id<"agent_reports">, decision: "reviewed" | "dismissed") => {
    setProcessing(reportId);
    try {
      await process({ reportId, decision });
      toast.success(decision === "reviewed" ? "Marked as reviewed." : "Report dismissed.");
    } catch {
      toast.error("Could not process report.");
    } finally {
      setProcessing(null);
    }
  };

  if (reports === undefined) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-serif text-xl font-semibold text-[#0f2040] mb-1">Agent Reports</h2>
      <p className="text-sm text-gray-500 mb-5">User-submitted reports about agent profiles. Review each one and take action outside the platform as needed.</p>
      {reports.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No pending reports.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report._id} className="border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-[#0f2040]">{report.reason.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Agent profile: <span className="font-mono">{report.agentProfileId}</span>
                  </p>
                  {report.details && (
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{report.details}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processing === report._id}
                    onClick={() => void handleProcess(report._id, "reviewed")}
                    className="cursor-pointer text-xs"
                  >
                    Mark reviewed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processing === report._id}
                    onClick={() => void handleProcess(report._id, "dismissed")}
                    className="cursor-pointer text-xs text-gray-400"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Embassy Monitor panel ────────────────────────────────────────────────────
type MonitorRowStatus = "changed" | "ok" | "unchecked" | "pending";

type MonitorRow = {
  destination: string;
  region: EmbassyRegion;
  url: string | null;
  status: MonitorRowStatus;
  lastCheckedAt: string | null;
  changedAt: string | null;
  snapshotId: Id<"embassy_page_snapshots"> | null;
};

const MONITOR_REGIONS: EmbassyRegion[] = ["Africa", "Americas", "Asia", "Europe", "Middle East", "Oceania"];

function EmbassyMonitorPanel() {
  const alerts = useQuery(api.embassyData.listActiveAlerts, {});
  const allSnapshots = useQuery(api.embassyData.listAllSnapshots, {});
  const dismiss = useMutation(api.embassyData.dismissAlert);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<EmbassyRegion | "all" | "alerts">("all");

  const handleDismiss = async (destination: string) => {
    setDismissing(destination);
    try {
      await dismiss({ destination });
      toast.success("Alert dismissed.");
    } catch {
      toast.error("Could not dismiss alert.");
    } finally {
      setDismissing(null);
    }
  };

  // Merge every real-world destination with whatever snapshot data exists for
  // it, so countries without a verified URL yet show as "Pending research"
  // instead of silently disappearing from the list.
  const rows: MonitorRow[] | undefined = allSnapshots === undefined ? undefined : (() => {
    const byDestination = new Map(allSnapshots.map((r) => [r.destination, r]));
    return WORLD_DESTINATIONS.map((destination): MonitorRow => {
      const snap = byDestination.get(destination);
      const url = EMBASSY_MONITOR_URLS[destination] ?? null;
      if (snap) {
        return {
          destination,
          region: COUNTRY_REGION[destination],
          url: snap.url,
          status: snap.changedAt && !snap.alertDismissedAt ? "changed" : "ok",
          lastCheckedAt: snap.lastCheckedAt,
          changedAt: snap.changedAt ?? null,
          snapshotId: snap._id,
        };
      }
      return {
        destination,
        region: COUNTRY_REGION[destination],
        url,
        status: url ? "unchecked" : "pending",
        lastCheckedAt: null,
        changedAt: null,
        snapshotId: null,
      };
    });
  })();

  const counts = rows === undefined ? null : {
    total: rows.length,
    live: rows.filter((r) => r.status !== "pending").length,
    alerts: rows.filter((r) => r.status === "changed").length,
    checkedThisWeek: rows.filter((r) => r.lastCheckedAt).length,
  };

  const filteredRows = rows?.filter((r) => {
    if (search && !r.destination.toLowerCase().includes(search.toLowerCase())) return false;
    if (regionFilter === "alerts") return r.status === "changed";
    if (regionFilter !== "all") return r.region === regionFilter;
    return true;
  });

  const grouped = filteredRows === undefined ? undefined : MONITOR_REGIONS
    .map((region) => ({ region, rows: filteredRows.filter((r) => r.region === region) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-[#0f2040] mb-1">Embassy Monitor</h2>
        <p className="text-sm text-gray-500">
          Weekly automated checks compare a text fingerprint of each official government visa page against its
          stored baseline. A change alert fires when the content differs. Coverage is rolling out across every
          world destination — countries without a verified official URL yet show as "Pending research," never a guess.
        </p>
      </div>

      {/* Coverage stats */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Monitored</p>
            <p className="text-xl font-semibold text-[#0f2040] mt-1">{counts.live}<span className="text-sm font-medium text-gray-400"> / {counts.total}</span></p>
          </div>
          <div className="border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Active alerts</p>
            <p className="text-xl font-semibold text-[#0f2040] mt-1">{counts.alerts}</p>
          </div>
          <div className="border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Checked so far</p>
            <p className="text-xl font-semibold text-[#0f2040] mt-1">{counts.checkedThisWeek}</p>
          </div>
          <div className="border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cadence</p>
            <p className="text-xl font-semibold text-[#0f2040] mt-1">Weekly</p>
          </div>
        </div>
      )}

      {/* Active alerts */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Active alerts</h3>
        {alerts === undefined ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-gray-400">No active alerts.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((row) => (
              <div key={row._id} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-4 py-3 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-[#0f2040]">{row.destination}</p>
                  <a href={/^https?:\/\//.test(row.url) ? row.url : "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">{row.url}</a>
                  <p className="text-xs text-gray-500 mt-1">
                    Changed: {row.changedAt ? new Date(row.changedAt).toLocaleString() : "—"}
                    {" · "}Last checked: {new Date(row.lastCheckedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={dismissing === row.destination}
                  onClick={() => void handleDismiss(row.destination)}
                  className="cursor-pointer text-xs shrink-0"
                >
                  Dismiss
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All destinations */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">All destinations</h3>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a country…"
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0f2040]"
            />
          </div>
          <button
            onClick={() => setRegionFilter("all")}
            className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer", regionFilter === "all" ? "bg-[#0f2040] text-white border-[#0f2040]" : "border-gray-200 text-gray-500 hover:border-gray-300")}
          >
            All <span className="opacity-70 font-medium">{rows?.length ?? 0}</span>
          </button>
          {MONITOR_REGIONS.map((region) => (
            <button
              key={region}
              onClick={() => setRegionFilter(region)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer", regionFilter === region ? "bg-[#0f2040] text-white border-[#0f2040]" : "border-gray-200 text-gray-500 hover:border-gray-300")}
            >
              {region} <span className="opacity-70 font-medium">{rows?.filter((r) => r.region === region).length ?? 0}</span>
            </button>
          ))}
          {counts && counts.alerts > 0 && (
            <button
              onClick={() => setRegionFilter("alerts")}
              className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer", regionFilter === "alerts" ? "bg-amber-500 text-white border-amber-500" : "border-amber-200 text-amber-700 hover:border-amber-300")}
            >
              ⚠ Alerts <span className="opacity-70 font-medium">{counts.alerts}</span>
            </button>
          )}
        </div>

        {grouped === undefined ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-gray-400">No destinations match this search.</p>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ region, rows: regionRows }) => (
              <div key={region}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 border-t border-gray-100 pt-3 pb-2">
                  {region} <span className="font-medium normal-case text-gray-400">— {regionRows.length}</span>
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 text-left">
                        <th className="pb-2 pr-4 font-semibold">Destination</th>
                        <th className="pb-2 pr-4 font-semibold">Last checked</th>
                        <th className="pb-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regionRows.map((row) => (
                        <tr key={row.destination} className={cn("border-b border-gray-50 last:border-b-0", row.status === "pending" && "opacity-50")}>
                          <td className="py-2 pr-4">
                            <span className="font-medium text-[#0f2040]">{row.destination}</span>
                            {row.url ? (
                              <a href={row.url} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-blue-600 hover:underline truncate max-w-[280px]">{row.url.replace(/^https?:\/\//, "")}</a>
                            ) : (
                              <span className="block text-[11px] text-gray-400">Official URL pending verification</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-gray-500">{row.lastCheckedAt ? new Date(row.lastCheckedAt).toLocaleDateString() : "—"}</td>
                          <td className="py-2">
                            {row.status === "changed" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Changed</span>}
                            {row.status === "ok" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">OK</span>}
                            {row.status === "unchecked" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">Awaiting first check</span>}
                            {row.status === "pending" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">Pending research</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminInner() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const stats = useQuery(api.admin.getStats, {});
  const users = useQuery(api.admin.getUsers, { limit: 100 });
  const agents = useQuery(api.admin.getAgents, {});
  const updatePlan = useMutation(api.admin.updateUserPlan);
  const updateRole = useMutation(api.admin.updateUserRole);
  const deleteUser = useMutation(api.admin.deleteUser);
  const verifyAgent = useMutation(api.admin.verifyAgent);
  const systemHealth = useQuery(api.admin.getSystemHealth, {});
  const aiUsage = useQuery(api.admin.getAIUsage, {});
  const caseIntelStats = useQuery(api.caseReadiness.getAdminCaseIntelligenceStats, {});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const handlePlanChange = async (userId: Doc<"users">["_id"], plan: "free" | "pro" | "expert") => {
    try {
      await updatePlan({ userId, plan });
      toast.success(t("toast.plan_updated"));
    } catch {
      toast.error(t("toast.plan_update_failed"));
    }
  };

  const handleRoleChange = async (userId: Doc<"users">["_id"], role: "admin" | "user") => {
    try {
      await updateRole({ userId, role });
      toast.success(t("toast.role_updated"));
    } catch {
      toast.error(t("toast.role_update_failed"));
    }
  };

  const handleDeleteUser = async (userId: Doc<"users">["_id"]) => {
    if (!window.confirm(t("confirm.delete_user"))) return;
    try {
      await deleteUser({ userId });
      toast.success(t("toast.user_deleted"));
    } catch {
      toast.error(t("toast.user_delete_failed"));
    }
  };

  const handleVerifyAgent = async (agentId: Doc<"agent_profiles">["_id"], verified: boolean) => {
    try {
      await verifyAgent({ agentId, verified });
      toast.success(verified ? t("toast.agent_verified") : t("toast.agent_unverified"));
    } catch {
      toast.error(t("toast.agent_update_failed"));
    }
  };

  const isLoading = stats === undefined;
  const currentNav = NAV_ITEMS.find((n) => n.id === tab) ?? NAV_ITEMS[0];

  const sidebarGrid = (
    <div className="absolute inset-0 grid" style={{ gridTemplateRows: "auto 1fr auto" }}>
      <div className="px-4 py-5 border-b border-white/10">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="font-serif text-base font-semibold text-white leading-tight">VisaClear</div>
            <div className="text-[9px] text-white/65 tracking-widest uppercase">Admin Panel</div>
          </div>
        </button>
      </div>
      <div className="overflow-y-auto py-3">
        {NAV_ITEMS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer text-left",
                active
                  ? "bg-white/10 text-white border-r-2 border-[#b8a06a]"
                  : "text-white/50 hover:text-white hover:bg-white/5 border-r-2 border-transparent"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-[#b8a06a]" : "")} />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="px-4 pt-4 pb-4 border-t border-white/10 flex flex-col gap-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs text-white/60 hover:text-white/90 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to site
        </button>
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          className="flex items-center gap-2 text-xs text-white/60 hover:text-red-400 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex">
      {/* Desktop: fixed aside, absolute-fill grid — no height chain, no dvh, no flex */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-56 bg-[#0f2040] z-30">
        {sidebarGrid}
      </aside>

      {/* Mobile sidebar overlay — standalone flex-col, does NOT reuse sidebarGrid.
          The overlay is fixed inset-0 (explicit viewport height). The w-56 child
          gets that height via flex align-items:stretch, then distributes it with
          flex-col: header=shrink-0, nav=flex-1 (scrollable), footer=shrink-0. */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-[#0f2040] shadow-2xl flex flex-col">
            <div className="px-4 py-5 border-b border-white/10 shrink-0">
              <button onClick={() => { navigate("/"); setSidebarOpen(false); }} className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-serif text-base font-semibold text-white leading-tight">VisaClear</div>
                  <div className="text-[9px] text-white/65 tracking-widest uppercase">Admin Panel</div>
                </div>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              {NAV_ITEMS.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setTab(item.id); setSidebarOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer text-left",
                      active
                        ? "bg-white/10 text-white border-r-2 border-[#b8a06a]"
                        : "text-white/50 hover:text-white hover:bg-white/5 border-r-2 border-transparent"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-[#b8a06a]" : "")} />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="px-4 pt-4 border-t border-white/10 flex flex-col gap-2 shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
              <button
                onClick={() => { navigate("/"); setSidebarOpen(false); }}
                className="flex items-center gap-2 text-xs text-white/60 hover:text-white/90 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to site
              </button>
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="flex items-center gap-2 text-xs text-white/60 hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content — offset by sidebar width on desktop */}
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50 md:pl-56">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-40">
          <button
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-xl font-semibold text-[#0f2040]">{currentNav.label}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#0f2040]/60 bg-[#0f2040]/5 px-3 py-1.5 rounded-full">
              <Shield className="w-3 h-3" /> Admin
            </span>
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer px-3 py-1.5 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 md:p-8">
        <PanelErrorBoundary key={tab}>

          {/* Overview */}
          {tab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  <StatCard icon={<Users className="w-4 h-4" />} label={t("overview.total_users")} value={stats.totalUsers} />
                  <StatCard icon={<Shield className="w-4 h-4" />} label={t("overview.pro_expert")} value={stats.proUsers} sub={t("overview.free_count", { count: stats.freeUsers })} />
                  <StatCard icon={<FileText className="w-4 h-4" />} label={t("overview.checklists_saved")} value={stats.totalChecklists} />
                  <StatCard icon={<BarChart3 className="w-4 h-4" />} label={t("overview.rejections_analysed")} value={stats.totalRejectionAnalyses} />
                  <StatCard icon={<UserCheck className="w-4 h-4" />} label={t("overview.agent_profiles")} value={stats.totalAgents} />
                  <StatCard
                    icon={<Settings className="w-4 h-4" />}
                    label={t("overview.free_users")}
                    value={`${stats.totalUsers > 0 ? Math.round((stats.freeUsers / stats.totalUsers) * 100) : 0}%`}
                    sub={t("overview.on_free_plan")}
                  />
                  <StatCard
                    icon={<Sparkles className="w-4 h-4" />}
                    label="AI Messages Today"
                    value={aiUsage?.todayTotal ?? "—"}
                    sub={`${aiUsage?.todayAgent ?? 0} agent · ${aiUsage?.todayBusiness ?? 0} business`}
                    onClick={() => setTab("ai-usage")}
                  />
                  <StatCard
                    icon={<Sparkles className="w-4 h-4" />}
                    label="AI Messages All-Time"
                    value={aiUsage?.totalAllTime ?? "—"}
                    sub={`${aiUsage?.totalAgent ?? 0} agent · ${aiUsage?.totalBusiness ?? 0} business`}
                    onClick={() => setTab("ai-usage")}
                  />
                </div>
              )}

              {/* Case Intelligence stats */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-[#0f2040]" />
                  <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-wide">Case Intelligence</h3>
                </div>
                {caseIntelStats === undefined ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-muted/40 px-3 py-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Cases Checked</p>
                      <p className="text-2xl font-bold font-serif text-foreground">{caseIntelStats.totalChecks}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-3 py-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Avg Readiness</p>
                      <p className={cn("text-2xl font-bold font-serif", caseIntelStats.avgScore >= 80 ? "text-green-600" : caseIntelStats.avgScore >= 60 ? "text-amber-600" : "text-red-600")}>{caseIntelStats.avgScore}%</p>
                    </div>
                    <div className="rounded-xl px-3 py-3 text-center border border-red-100 bg-red-50/50">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Critical Cases</p>
                      </div>
                      <p className="text-2xl font-bold font-serif text-red-600">{caseIntelStats.criticalCases}</p>
                    </div>
                    <div className="rounded-xl px-3 py-3 text-center border border-purple-100 bg-purple-50/50">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <ShieldAlert className="w-3 h-3 text-purple-600" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-600">Fraud Signals</p>
                      </div>
                      <p className="text-2xl font-bold font-serif text-purple-600">{caseIntelStats.totalFraudSignals}</p>
                      {caseIntelStats.highFraudSignals > 0 && (
                        <p className="text-[10px] font-semibold text-red-600 mt-0.5">{caseIntelStats.highFraudSignals} high confidence</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Users */}
          {tab === "users" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {users === undefined ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">{t("users.empty")}</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">User</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Plan</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Role</th>
                        <th className="px-5 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.map((user) => (
                        <Fragment key={user._id}>
                          <tr
                            className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                            onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#0f2040] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                  {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-[#0f2040] truncate">{user.name ?? t("users.no_name")}</div>
                                  <div className="text-xs text-gray-400 truncate">{user.email ?? t("users.no_email")}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              <span className={cn(
                                "text-xs font-semibold px-2.5 py-1 rounded-full",
                                user.plan === "expert" ? "bg-[#b8a06a]/15 text-[#7a6435]" :
                                user.plan === "pro" ? "bg-blue-50 text-blue-700" :
                                "bg-gray-100 text-gray-500"
                              )}>
                                {user.plan ?? "free"}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden lg:table-cell">
                              <span className={cn(
                                "text-xs font-semibold px-2.5 py-1 rounded-full",
                                user.role === "admin" ? "bg-[#0f2040]/10 text-[#0f2040]" : "bg-gray-100 text-gray-500"
                              )}>
                                {user.role ?? "user"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {expandedUser === user._id
                                ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
                                : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />}
                            </td>
                          </tr>
                          {expandedUser === user._id && (
                            <tr key={`${user._id}-expanded`}>
                              <td colSpan={4} className="px-5 py-4 bg-gray-50/80">
                                <div className="flex flex-wrap items-center gap-4">
                                  <div>
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">{t("users.plan_label")}</label>
                                    <select
                                      value={user.plan ?? "free"}
                                      onChange={(e) => { void handlePlanChange(user._id, e.target.value as "free" | "pro" | "expert"); }}
                                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2040]/20 cursor-pointer"
                                    >
                                      <option value="free">{t("users.plan_free")}</option>
                                      <option value="pro">{t("users.plan_pro")}</option>
                                      <option value="expert">{t("users.plan_expert")}</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">{t("users.role_label")}</label>
                                    <select
                                      value={user.role ?? "user"}
                                      onChange={(e) => { void handleRoleChange(user._id, e.target.value as "admin" | "user"); }}
                                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2040]/20 cursor-pointer"
                                    >
                                      <option value="user">{t("users.role_user")}</option>
                                      <option value="admin">{t("users.role_admin")}</option>
                                    </select>
                                  </div>
                                  <button
                                    onClick={() => { void handleDeleteUser(user._id); }}
                                    className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> {t("users.delete")}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/40">
                    <p className="text-xs text-gray-400">{users.length} user{users.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Agents */}
          {tab === "agents" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Agent profiles */}
              <div>
                {agents === undefined ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground text-sm">{t("agents.empty")}</div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                          <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Agent</th>
                          <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Specialisations</th>
                          <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                          <th className="px-5 py-3.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {agents.map((agent) => (
                          <tr key={agent._id} className="hover:bg-gray-50/40 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-medium text-[#0f2040]">{agent.fullName}</div>
                              <div className="text-xs text-gray-400">{agent.email} · {agent.country}</div>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              <div className="text-xs text-gray-500">{agent.specialisations.slice(0, 3).join(", ")}</div>
                            </td>
                            <td className="px-5 py-4">
                              {agent.verified ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> {t("agents.verified")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                                  <AlertCircle className="w-3 h-3" /> {t("agents.pending")}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              {!agent.verified ? (
                                <button
                                  onClick={() => { void handleVerifyAgent(agent._id, true); }}
                                  className="text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                                >
                                  {t("agents.verify")}
                                </button>
                              ) : (
                                <button
                                  onClick={() => { void handleVerifyAgent(agent._id, false); }}
                                  className="text-xs font-semibold text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                                >
                                  {t("agents.unverify")}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Trial management */}
              <TrialManagementPanel agents={agents ?? []} />

              {/* Payout requests */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <PayoutRequestsAdminPanel />
              </div>

              {/* Review moderation */}
              <AgentReviewModerationPanel />
            </motion.div>
          )}

          {/* Setup / health check */}
          {tab === "setup" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <SetupPanel health={systemHealth} />
            </motion.div>
          )}

          {/* All other panels — unchanged content, just wrapped */}
          {tab === "country-watch" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><CountryWatchAdminPanel /></div>}
          {tab === "data-freshness" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><DataFreshnessPanel /></div>}
          {tab === "telegram-bot" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><TelegramBotPanel /></div>}
          {tab === "whatsapp-bot" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><WhatsAppBotPanel /></div>}
          {tab === "wall-of-fame" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><WallOfFameAdminPanel /></div>}
          {tab === "community" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><CommunityAdminPanel /></div>}
          {tab === "wait-times" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><WaitTimesAdminPanel /></div>}
          {tab === "partners" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><PartnersAdminPanel /></div>}
          {tab === "leads" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><LeadsAdminPanel /></div>}
          {tab === "messages" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><ContactMessagesPanel /></div>}
          {tab === "employers" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><EmployersAdminPanel /></div>}
          {tab === "marketplace-leads" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><MarketplaceLeadsAdminPanel /></div>}
          {tab === "credit-mgmt" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><CreditManagementPanel /></div>}
          {tab === "security-log" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><SecurityIntelligenceCentre /></div>}
          {tab === "audit-log" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><AuditLogPanel /></div>}
          {tab === "blog" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><BlogAdminPanel /></div>}
          {tab === "corridor-intelligence" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><CorridorIntelligencePanel /></div>}
          {tab === "checklist-flags" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><ChecklistFlagsPanel /></div>}
          {tab === "approvals" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><ApprovalsAdminPanel /></div>}
          {tab === "creators" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><CreatorsAdminPanel /></div>}
          {tab === "health" && <SystemHealthPanel />}
          {tab === "agent-reports" && <AgentReportsPanel />}
          {tab === "embassy-monitor" && <EmbassyMonitorPanel />}
          {tab === "risk-mitigations" && <RiskMitigationsPanel />}
          {tab === "ai-usage" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><AIUsagePanel /></div>}

        </PanelErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// ─── Setup / health-check panel ───────────────────────────────────────────────

type HealthData = {
  SITE_URL: string | null;
  RESEND_FROM_EMAIL: string | null;
  RESEND_API_KEY: boolean;
  OPENAI_API_KEY: boolean;
  STRIPE_SECRET_KEY: boolean;
  STRIPE_WEBHOOK_SECRET: boolean;
  PAYSTACK_SECRET_KEY: boolean;
  AUTH_GOOGLE_ID: boolean;
  AUTH_GOOGLE_SECRET: boolean;
  TELEGRAM_BOT_TOKEN: boolean;
  TWILIO_ACCOUNT_SID: boolean;
  TWILIO_AUTH_TOKEN: boolean;
  TWILIO_WHATSAPP_NUMBER: boolean;
} | null | undefined;

type EnvRow = {
  name: string;
  label: string;
  isSet: boolean;
  currentValue?: string | null;
  critical: boolean;
  description: string;
  howToGet: string;
  example?: string;
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
      ok ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", ok ? "bg-green-500" : "bg-red-500")} />
      {ok ? "Set" : "Missing"}
    </span>
  );
}

function SetupPanel({ health }: { health: HealthData }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (health === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  const siteUrlOk = Boolean(health?.SITE_URL && !health.SITE_URL.includes("localhost"));

  const rows: EnvRow[] = [
    {
      name: "SITE_URL",
      label: "Site URL",
      isSet: siteUrlOk,
      currentValue: health?.SITE_URL,
      critical: true,
      description: "The public URL of your app. Every email link (password reset, email change, document alerts) uses this. Currently set to localhost — which means every emailed link is broken in production.",
      howToGet: "This is your Vercel deployment URL.",
      example: "https://visaclear.app",
    },
    {
      name: "RESEND_API_KEY",
      label: "Resend API Key",
      isSet: Boolean(health?.RESEND_API_KEY),
      critical: true,
      description: "Required to send any transactional emails — welcome, password reset, email change confirmation, document upload alerts, invitation emails. Without this, all emails are silently dropped.",
      howToGet: "Log into resend.com → API Keys → Create API key. Free tier allows 3,000 emails/month.",
    },
    {
      name: "RESEND_FROM_EMAIL",
      label: "Resend From Email",
      isSet: Boolean(health?.RESEND_FROM_EMAIL),
      currentValue: health?.RESEND_FROM_EMAIL,
      critical: true,
      description: "The 'From' address for all outgoing emails. Must be a verified domain or address in your Resend account.",
      howToGet: "In Resend, go to Domains → verify your domain, or use a verified single sender address.",
      example: "VisaClear <hello@visaclear.app>",
    },
    {
      name: "OPENAI_API_KEY",
      label: "OpenAI API Key",
      isSet: Boolean(health?.OPENAI_API_KEY),
      critical: true,
      description: "Powers the AI features: rejection analyser, success probability, passport photo checker, and the AI assistant. Without this, these features throw an error on every request.",
      howToGet: "Log into platform.openai.com → API Keys → Create new secret key.",
    },
    {
      name: "STRIPE_SECRET_KEY",
      label: "Stripe Secret Key",
      isSet: Boolean(health?.STRIPE_SECRET_KEY),
      critical: true,
      description: "Required to process Stripe payments. Subscription upgrades and one-time payments will fail without this.",
      howToGet: "Log into dashboard.stripe.com → Developers → API Keys → Secret key. Use the live key for production.",
    },
    {
      name: "STRIPE_WEBHOOK_SECRET",
      label: "Stripe Webhook Secret",
      isSet: Boolean(health?.STRIPE_WEBHOOK_SECRET),
      critical: true,
      description: "Verifies that webhook events from Stripe are genuine. Without this, payment confirmations are ignored and user plans are never upgraded after payment.",
      howToGet: "In Stripe: Developers → Webhooks → Add endpoint (your Convex HTTP endpoint) → Signing secret.",
    },
    {
      name: "PAYSTACK_SECRET_KEY",
      label: "Paystack Secret Key",
      isSet: Boolean(health?.PAYSTACK_SECRET_KEY),
      critical: false,
      description: "Enables Paystack as a payment option (for Nigerian/African users). Optional if you are only using Stripe.",
      howToGet: "Log into dashboard.paystack.com → Settings → API Keys → Secret Key.",
    },
    {
      name: "AUTH_GOOGLE_ID",
      label: "Google OAuth Client ID",
      isSet: Boolean(health?.AUTH_GOOGLE_ID),
      critical: false,
      description: "Required together with AUTH_GOOGLE_SECRET to enable 'Sign in with Google'. Both must be set — setting only one leaves Google login broken.",
      howToGet: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Client ID field.",
      example: "1234567890-abc123.apps.googleusercontent.com",
    },
    {
      name: "AUTH_GOOGLE_SECRET",
      label: "Google OAuth Client Secret",
      isSet: Boolean(health?.AUTH_GOOGLE_SECRET),
      critical: false,
      description: "Required together with AUTH_GOOGLE_ID to enable 'Sign in with Google'. Both must be set — the ID alone does nothing.",
      howToGet: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Client Secret field (same screen as the ID).",
    },
    {
      name: "TELEGRAM_BOT_TOKEN",
      label: "Telegram Bot Token",
      isSet: Boolean(health?.TELEGRAM_BOT_TOKEN),
      critical: false,
      description: "Powers the Telegram bot integration for notifications and user interactions.",
      howToGet: "Message @BotFather on Telegram → /newbot → copy the token it gives you.",
    },
    {
      name: "TWILIO_ACCOUNT_SID",
      label: "Twilio Account SID",
      isSet: Boolean(health?.TWILIO_ACCOUNT_SID),
      critical: false,
      description: "Required for WhatsApp messaging via Twilio. Leave unset if you are not using WhatsApp.",
      howToGet: "Log into console.twilio.com → Account Info → Account SID.",
    },
    {
      name: "TWILIO_AUTH_TOKEN",
      label: "Twilio Auth Token",
      isSet: Boolean(health?.TWILIO_AUTH_TOKEN),
      critical: false,
      description: "Twilio API authentication. Required alongside TWILIO_ACCOUNT_SID.",
      howToGet: "Same place as Account SID — it is displayed below it on the Twilio console homepage.",
    },
    {
      name: "TWILIO_WHATSAPP_NUMBER",
      label: "Twilio WhatsApp Number",
      isSet: Boolean(health?.TWILIO_WHATSAPP_NUMBER),
      critical: false,
      description: "Your Twilio WhatsApp sender number in E.164 format.",
      howToGet: "Twilio Console → Messaging → Senders → WhatsApp Senders.",
      example: "+14155238886",
    },
  ];

  const critical = rows.filter((r) => r.critical);
  const optional = rows.filter((r) => !r.critical);
  const criticalMissing = critical.filter((r) => !r.isSet).length;
  const totalMissing = rows.filter((r) => !r.isSet).length;

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className={cn(
        "rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        criticalMissing > 0
          ? "bg-red-50 border-red-200"
          : totalMissing > 0
          ? "bg-amber-50 border-amber-200"
          : "bg-green-50 border-green-200"
      )}>
        <div>
          <p className={cn(
            "font-semibold text-base",
            criticalMissing > 0 ? "text-red-800" : totalMissing > 0 ? "text-amber-800" : "text-green-800"
          )}>
            {criticalMissing > 0
              ? `${criticalMissing} critical variable${criticalMissing !== 1 ? "s" : ""} missing — core features are broken`
              : totalMissing > 0
              ? `${totalMissing} optional variable${totalMissing !== 1 ? "s" : ""} unset`
              : "All environment variables are configured"}
          </p>
          <p className={cn(
            "text-sm mt-0.5",
            criticalMissing > 0 ? "text-red-700" : totalMissing > 0 ? "text-amber-700" : "text-green-700"
          )}>
            Set variables in the Convex dashboard → Settings → Environment Variables, or via CLI:
            <code className="ml-1 bg-white/60 px-1.5 py-0.5 rounded text-xs font-mono">npx convex env set VAR_NAME value</code>
          </p>
        </div>
        <div className="shrink-0 text-center">
          <p className={cn("text-3xl font-bold tabular-nums", criticalMissing > 0 ? "text-red-700" : "text-green-700")}>
            {rows.filter((r) => r.isSet).length}/{rows.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">configured</p>
        </div>
      </div>

      {/* Critical vars */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">Critical — app is broken without these</h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {critical.map((row) => (
            <div key={row.name}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === row.name ? null : row.name)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="text-sm font-mono font-semibold text-[#0f2040]">{row.name}</code>
                    <span className="text-xs text-gray-400">{row.label}</span>
                    {row.currentValue && !row.isSet && (
                      <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                        currently: {row.currentValue}
                      </span>
                    )}
                    {row.currentValue && row.isSet && (
                      <span className="text-[10px] font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                        {row.currentValue}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusDot ok={row.isSet} />
                  {expanded === row.name ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </div>
              </button>
              {expanded === row.name && (
                <div className="px-5 pb-5 bg-gray-50/60 border-t border-gray-50">
                  <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-2">{row.description}</p>
                  <div className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl p-3 space-y-1.5">
                    <p><span className="font-semibold text-[#0f2040]">How to get it:</span> {row.howToGet}</p>
                    {row.example && (
                      <p><span className="font-semibold text-[#0f2040]">Example format:</span> <code className="font-mono text-xs">{row.example}</code></p>
                    )}
                    <p className="text-gray-400 font-mono text-[11px] mt-2 pt-2 border-t border-gray-100">
                      npx convex env set {row.name} &lt;value&gt;
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Optional vars */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">Optional — integrations</h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {optional.map((row) => (
            <div key={row.name}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === row.name ? null : row.name)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="text-sm font-mono font-semibold text-[#0f2040]">{row.name}</code>
                    <span className="text-xs text-gray-400">{row.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusDot ok={row.isSet} />
                  {expanded === row.name ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </div>
              </button>
              {expanded === row.name && (
                <div className="px-5 pb-5 bg-gray-50/60 border-t border-gray-50">
                  <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-2">{row.description}</p>
                  <div className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl p-3 space-y-1.5">
                    <p><span className="font-semibold text-[#0f2040]">How to get it:</span> {row.howToGet}</p>
                    {row.example && (
                      <p><span className="font-semibold text-[#0f2040]">Example format:</span> <code className="font-mono text-xs">{row.example}</code></p>
                    )}
                    <p className="text-gray-400 font-mono text-[11px] mt-2 pt-2 border-t border-gray-100">
                      npx convex env set {row.name} &lt;value&gt;
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WallOfFameAdminPanel() {
  const { t } = useTranslation("admin");
  const pending = useQuery(api.wallOfFame.listPendingStories, {});
  const moderate = useMutation(api.wallOfFame.moderateStory);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleModerate = async (storyId: string, decision: "approved" | "rejected") => {
    setProcessingId(storyId);
    try {
      await moderate({ storyId: storyId as Id<"wall_of_fame_stories">, decision });
      toast.success(decision === "approved" ? t("wof.toast_approved") : t("wof.toast_rejected"));
    } catch {
      toast.error(t("wof.toast_error"));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("wof.pending_stories", { count: pending?.length ?? 0 })}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("wof.description")}
      </p>
      {pending === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : pending.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("wof.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((story) => (
            <div key={story._id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-primary">
                  {story.destination} · {story.visaType} · refused {story.refusalCount}×
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(story.createdAt).toLocaleString("en-GB")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1"><span className="font-semibold">{t("wof.went_wrong")}</span> {story.whatWentWrong}</p>
              <p className="text-xs text-muted-foreground mb-3"><span className="font-semibold">{t("wof.fixed_it")}</span> {story.whatFixedIt}</p>
              <div className="flex gap-2">
                <button
                  disabled={processingId === story._id}
                  onClick={() => { void handleModerate(story._id, "approved"); }}
                  className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t("wof.approve")}
                </button>
                <button
                  disabled={processingId === story._id}
                  onClick={() => { void handleModerate(story._id, "rejected"); }}
                  className="flex items-center gap-1 text-xs font-semibold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> {t("wof.reject")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityAdminPanel() {
  const posts = useQuery(api.community.listPostsForModeration, {});
  const moderate = useMutation(api.community.moderatePost);
  const toggleFeatured = useMutation(api.community.toggleFeatured);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleModerate = async (postId: string, decision: "approved" | "rejected", featured?: boolean) => {
    setProcessingId(postId);
    try {
      await moderate({
        postId: postId as Id<"community_posts">,
        decision,
        featured: featured ?? false,
      });
      toast.success(decision === "approved" ? "Post approved." : "Post rejected.");
    } catch {
      toast.error("Failed to moderate post.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleFeatured = async (postId: string) => {
    setProcessingId(postId);
    try {
      await toggleFeatured({ postId: postId as Id<"community_posts"> });
      toast.success("Featured status updated.");
    } catch {
      toast.error("Failed to update featured status.");
    } finally {
      setProcessingId(null);
    }
  };

  const pending = posts?.filter((p) => p.status === "pending") ?? [];
  const hidden = posts?.filter((p) => p.status === "hidden") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-1">
          Community Posts — Pending Review ({pending.length})
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Approve to make a post live. Mark as Featured to surface it on the Blog Community tab.
        </p>
        {posts === undefined ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : pending.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No posts pending review.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((post) => (
              <div key={post._id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wide">{post.category} · {post.country}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleString("en-GB")}</span>
                </div>
                <p className="text-sm font-semibold text-primary mb-1">{post.title}</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{post.body}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "approved", false); }}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "approved", true); }}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Approve + Feature
                  </button>
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "rejected"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hidden.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-1">
            Auto-Hidden by Flags ({hidden.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            These posts were hidden automatically after receiving 3 or more flags from users.
          </p>
          <div className="space-y-3">
            {hidden.map((post) => (
              <div key={post._id} className="bg-card border border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                    {post.category} · {post.country} · {post.flagCount} flags
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleString("en-GB")}</span>
                </div>
                <p className="text-sm font-semibold text-primary mb-1">{post.title}</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{post.body}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "approved"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "rejected"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PartnersAdminPanel() {
  const { t } = useTranslation("admin");
  const partners = useQuery(api.partners.listPartners, {});
  const createPartner = useMutation(api.partners.createPartner);
  const toggleActive = useMutation(api.partners.togglePartnerActive);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [partnerType, setPartnerType] = useState<"university" | "agency" | "other">("university");
  const [submitting, setSubmitting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const result = await createPartner({ name, slug: slug || name, partnerType });
      toast.success(t("partners.toast_created", { slug: result.slug }));
      setName("");
      setSlug("");
      setShowForm(false);
    } catch (err) {
      const message = convexErrMsg(err) ?? t("partners.toast_create_error");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (partnerSlug: string) => {
    const link = `${window.location.origin}/?ref=${partnerSlug}`;
    void navigator.clipboard.writeText(link);
    setCopiedSlug(partnerSlug);
    toast.success(t("partners.toast_link_copied"));
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
            {t("partners.heading", { count: partners?.length ?? 0 })}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("partners.description")}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> {showForm ? t("partners.cancel") : t("partners.add")}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("partners.name_placeholder")}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("partners.slug_placeholder")}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
            />
          </div>
          <select
            value={partnerType}
            onChange={(e) => setPartnerType(e.target.value as typeof partnerType)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
          >
            <option value="university">{t("partners.type_university")}</option>
            <option value="agency">{t("partners.type_agency")}</option>
            <option value="other">{t("partners.type_other")}</option>
          </select>
          <Button size="sm" className="w-full cursor-pointer" disabled={!name.trim() || submitting} onClick={() => { void handleCreate(); }}>
            {submitting ? t("partners.creating") : t("partners.create")}
          </Button>
        </div>
      )}

      {partners === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : partners.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("partners.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {partners.map((p) => (
            <div key={p._id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{p.partnerType}</p>
                  </div>
                </div>
                <button
                  onClick={() => { void toggleActive({ partnerId: p._id, active: !p.active }); }}
                  className={cn(
                    "shrink-0 text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer transition-colors",
                    p.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-secondary text-secondary-foreground border border-border"
                  )}
                >
                  {p.active ? t("partners.active") : t("partners.inactive")}
                </button>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-border mb-3 text-xs font-mono text-muted-foreground overflow-hidden">
                <span className="truncate flex-1">
                  {typeof window !== "undefined" ? `${window.location.origin}/?ref=${p.slug}` : ""}
                </span>
                <button
                  onClick={() => handleCopyLink(p.slug)}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> {copiedSlug === p.slug ? t("partners.copied") : t("partners.copy")}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Eye className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">{t("partners.visits")}</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.visits}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <UserPlus className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">{t("partners.signups")}</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.signups}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <ListChecks className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">{t("partners.checklists")}</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.checklistCompletions}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WaitTimesAdminPanel() {
  const { t } = useTranslation("admin");
  const overview = useQuery(api.waitTimeTracker.getAdminOverview, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("wait.heading", { count: overview?.totalReports ?? 0 })}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("wait.description")}
      </p>
      {overview === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : overview.routes.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("wait.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {overview.routes.map((r) => (
            <div key={r.route} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2.5">
              <span className="text-sm text-foreground">{r.route}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t(r.count === 1 ? "wait.report_one" : "wait.report_other", { count: r.count })}</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  r.hasEnoughData ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                )}>
                  {r.hasEnoughData ? t("wait.public") : t("wait.gathering")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TelegramBotPanel() {
  const { t } = useTranslation("admin");
  const isConfigured = useQuery(api.telegramBot.isTelegramConfigured, {});
  const stats = useQuery(api.telegramBot.getBotStats, {});
  const registerWebhook = useAction(api.telegramBot.registerWebhook);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await registerWebhook({});
      if (result.ok) {
        toast.success(t("tg.toast_connected"));
      } else {
        toast.error(result.description ?? t("tg.toast_connect_failed"));
      }
    } catch {
      toast.error(t("tg.toast_connect_error"));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-primary">{t("tg.title")}</h3>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isConfigured ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            {isConfigured === undefined ? t("tg.checking") : isConfigured ? t("tg.token_set") : t("tg.not_configured")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {t("tg.description")}
        </p>
        <Button
          size="sm"
          className="cursor-pointer"
          disabled={!isConfigured || connecting}
          onClick={() => { void handleConnect(); }}
        >
          <Send className="w-3.5 h-3.5" />
          {connecting ? t("tg.connecting") : t("tg.connect")}
        </Button>
        {!isConfigured && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Set TELEGRAM_BOT_TOKEN via <code>npx convex env set</code> first.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("tg.recent_activity")}</h3>
        {stats === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : stats.recent.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("tg.no_questions")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Send className="w-4 h-4" />} label={t("tg.logged")} value={stats.totalLogged} />
              <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label={t("tg.match_rate")} value={`${stats.matchRate}%`} sub={t("tg.matched_count", { count: stats.matchedCount })} />
            </div>
            <div className="space-y-2">
              {stats.recent.map((entry) => (
                <div key={entry._id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                  {entry.matched ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{entry.questionText}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.matchedDestination ? t("tg.matched_detail", { destination: entry.matchedDestination, visaType: entry.matchedVisaType }) : t("tg.no_match")}
                      {" · "}{new Date(entry.createdAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WhatsAppBotPanel() {
  const { t } = useTranslation("admin");
  const isConfigured = useQuery(api.whatsappBot.isWhatsAppConfigured, {});
  const stats = useQuery(api.whatsappBot.getBotStats, {});

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-primary">{t("wa.title")}</h3>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isConfigured ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            {isConfigured === undefined ? t("tg.checking") : isConfigured ? t("wa.credentials_set") : t("tg.not_configured")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {t("wa.description")}
        </p>
        {!isConfigured ? (
          <div className="text-[11px] text-muted-foreground space-y-1.5">
            <p>
              Set <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, and <code>TWILIO_WHATSAPP_NUMBER</code> via <code>npx convex env set</code> first.
            </p>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground space-y-1.5">
            <p>
              {t("wa.webhook_hint")}
            </p>
            <code className="block bg-muted rounded-md px-2 py-1.5 text-[11px] break-all">
              {`${import.meta.env.VITE_CONVEX_URL?.replace(".cloud", ".site") ?? "https://your-deployment.convex.site"}/whatsapp/webhook`}
            </code>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("tg.recent_activity")}</h3>
        {stats === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : stats.recent.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("tg.no_questions")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<MessageCircle className="w-4 h-4" />} label={t("tg.logged")} value={stats.totalLogged} />
              <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label={t("tg.match_rate")} value={`${stats.matchRate}%`} sub={t("tg.matched_count", { count: stats.matchedCount })} />
            </div>
            <div className="space-y-2">
              {stats.recent.map((entry) => (
                <div key={entry._id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                  {entry.matched ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{entry.questionText}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.matchedDestination ? t("tg.matched_detail", { destination: entry.matchedDestination, visaType: entry.matchedVisaType }) : t("tg.no_match")}
                      {" · "}{new Date(entry.createdAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DataFreshnessPanel() {
  const { t } = useTranslation("admin");
  const report = useQuery(api.dataFreshness.getFreshnessReport, {});
  const markVerified = useMutation(api.dataFreshness.markVerified);
  const [verifying, setVerifying] = useState<string | null>(null);

  const handleMarkVerified = async (destination: string) => {
    setVerifying(destination);
    try {
      await markVerified({ destination });
      toast.success(`${destination} marked as reviewed.`);
    } catch {
      toast.error("Could not update. Please try again.");
    } finally {
      setVerifying(null);
    }
  };

  const staleCount = report?.filter((r) => r.isStale).length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
            {t("freshness.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("freshness.description")}
          </p>
        </div>
        {report && staleCount > 0 && (
          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            {staleCount} stale
          </span>
        )}
      </div>
      {report === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="space-y-2">
          {report.map((row) => (
            <div
              key={row.destination}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
            >
              <div className="shrink-0">
                {row.isStale ? (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{row.destination}</div>
                <div className="text-xs text-muted-foreground">
                  {t(row.visaTypeCount === 1 ? "freshness.visa_type_one" : "freshness.visa_type_other", { count: row.visaTypeCount })}
                </div>
              </div>
              <div className="text-right shrink-0 mr-3">
                <div className={cn("text-xs font-semibold", row.isStale ? "text-amber-700" : "text-muted-foreground")}>
                  {t("freshness.days_ago", { days: row.daysSinceVerified })}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {row.lastVerified}
                  {row.hasDbRecord && <span className="ml-1 text-green-600">✓ live</span>}
                </div>
              </div>
              <button
                onClick={() => { void handleMarkVerified(row.destination); }}
                disabled={verifying === row.destination}
                className={cn(
                  "shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer",
                  row.isStale
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary",
                  verifying === row.destination && "opacity-50 cursor-not-allowed",
                )}
              >
                {verifying === row.destination ? "Saving…" : "Mark Reviewed"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type LicensePlan = "agent_listing" | "agent_featured" | "agency_white_label";

function suggestLicensePlan(requestedPlan: string): LicensePlan {
  if (requestedPlan === "starter") return "agent_listing";
  if (requestedPlan === "agency") return "agency_white_label";
  if (requestedPlan === "professional" || requestedPlan === "featured") return "agent_featured";
  return "agent_listing";
}

function IssueCodeControl({ applicationId, email, requestedPlan }: { applicationId: Id<"whitelabel_applications">; email: string; requestedPlan: string }) {
  const { t } = useTranslation("admin");
  const issueCode = useMutation(api.licenseCodes.issueLicenseCode);
  // Shares the same underlying subscription as IssuedCodesList's identical
  // query — Convex dedupes same function+args across the component tree,
  // so this isn't a second network round-trip.
  const allCodes = useQuery(api.licenseCodes.listLicenseCodes, {});
  const [plan, setPlan] = useState<LicensePlan>(suggestLicensePlan(requestedPlan));
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const handleIssue = async () => {
    setIssuing(true);
    try {
      const result = await issueCode({ email, plan, whitelabelApplicationId: applicationId });
      setIssuedCode(result.code);
      toast.success(t("license.toast_issued"));
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("license.toast_issue_failed"));
    } finally {
      setIssuing(false);
    }
  };

  // Reflects reality even after a page refresh resets local state — without
  // this, an admin would see the "Issue" button again, click it, and just
  // get a confusing "already has an active code" error instead of seeing
  // the code that's already out there.
  const existingCode = allCodes?.find((c) => c.email === email && (!c.redeemedAt ? new Date(c.expiresAt) > new Date() : true));

  const displayCode = issuedCode ?? existingCode?.code;
  if (displayCode) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <code className="text-xs font-mono font-semibold bg-accent/10 text-accent px-2.5 py-1 rounded-lg">{displayCode}</code>
        {existingCode?.redeemedAt && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700">{t("license.redeemed")}</span>
        )}
        <button
          onClick={() => { navigator.clipboard.writeText(displayCode); toast.success(t("license.toast_copied")); }}
          className="text-xs font-semibold text-accent hover:underline cursor-pointer"
        >
          {t("license.copy")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <select
        value={plan}
        onChange={(e) => setPlan(e.target.value as LicensePlan)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
      >
        <option value="agent_listing">{t("license.agent_listing")}</option>
        <option value="agent_featured">{t("license.agent_featured")}</option>
        <option value="agency_white_label">{t("license.agency_white_label")}</option>
      </select>
      <button
        disabled={issuing}
        onClick={() => { void handleIssue(); }}
        className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60"
      >
        {issuing ? t("license.issuing") : t("license.issue")}
      </button>
    </div>
  );
}

function IssuedCodesList() {
  const { t } = useTranslation("admin");
  const codes = useQuery(api.licenseCodes.listLicenseCodes, {});
  if (codes === undefined) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (codes.length === 0) {
    return <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">{t("license.empty")}</div>;
  }
  const now = Date.now();
  return (
    <div className="bg-card border border-border rounded-xl divide-y divide-border">
      {codes.map((c) => {
        const statusKey = c.redeemedAt ? "redeemed" : new Date(c.expiresAt).getTime() < now ? "expired" : "pending";
        return (
          <div key={c._id} className="flex items-center justify-between px-4 py-2.5 text-xs gap-3">
            <div className="min-w-0">
              <span className="font-mono font-semibold text-foreground">{c.code}</span>
              <span className="text-muted-foreground ml-2">{c.email} · {c.plan}</span>
            </div>
            <span className={cn(
              "shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
              statusKey === "redeemed" ? "bg-green-50 text-green-700 border-green-200" : statusKey === "expired" ? "bg-muted text-muted-foreground border-border" : "bg-amber-50 text-amber-700 border-amber-200",
            )}>
              {t(`license.status_${statusKey}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ContactMessagesPanel() {
  const messages = useQuery(api.contact.list, {});
  const markRead = useMutation(api.contact.markRead);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleMarkRead = async (id: Id<"contact_messages">) => {
    setProcessingId(id);
    try {
      await markRead({ id });
    } catch {
      toast.error("Failed to mark as read.");
    } finally {
      setProcessingId(null);
    }
  };

  const unread = messages?.filter((m) => !m.read) ?? [];
  const read = messages?.filter((m) => m.read) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-0.5">
          Contact Messages — Unread ({unread.length})
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Messages submitted via the Contact Us form. Reply directly to the sender's email address.
        </p>
        {messages === undefined ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : unread.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No unread messages.
          </div>
        ) : (
          <div className="space-y-3">
            {unread.map((msg) => (
              <div key={msg._id} className="bg-card border border-accent/30 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-primary">{msg.name}</span>
                      <a
                        href={`mailto:${msg.email}`}
                        className="text-xs text-accent hover:underline truncate max-w-[200px]"
                      >
                        {msg.email}
                      </a>
                    </div>
                    {msg.subject && (
                      <p className="text-xs font-medium text-foreground mt-0.5">{msg.subject}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(msg.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mb-3">
                  {msg.message}
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject ?? "Your message to VisaClear")}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Send className="w-3 h-3" /> Reply
                  </a>
                  <button
                    disabled={processingId === msg._id}
                    onClick={() => { void handleMarkRead(msg._id); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Mark read
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {read.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">
            Read ({read.length})
          </h3>
          <div className="space-y-2">
            {read.map((msg) => (
              <div key={msg._id} className="bg-muted/40 border border-border rounded-xl p-4 opacity-70">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-primary">{msg.name}</span>
                    <a href={`mailto:${msg.email}`} className="text-xs text-accent hover:underline">
                      {msg.email}
                    </a>
                    {msg.subject && (
                      <span className="text-xs text-muted-foreground">— {msg.subject}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(msg.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {msg.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadsAdminPanel() {
  const { t } = useTranslation("admin");
  const applications = useQuery(api.whitelabel.list, {});
  const subscribers = useQuery(api.newsletter.list, {});
  const markRead = useMutation(api.whitelabel.markRead);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
          {t("leads.applications_heading", { count: applications?.filter((a) => !a.read).length ?? 0 })}
        </h3>
        {applications === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : applications.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("leads.applications_empty")}
          </div>
        ) : (
          <div className="space-y-2">
            {applications.map((app) => (
              <div key={app._id} className={cn("bg-card border rounded-xl p-4", app.read ? "border-border" : "border-accent/40")}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-primary">{app.agencyName}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(app.createdAt).toLocaleString("en-GB")}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {app.email}{app.phone ? ` · ${app.phone}` : ""}{app.country ? ` · ${app.country}` : ""} · {t("leads.plan_label")} <span className="font-semibold text-foreground">{app.plan}</span>
                </div>
                {app.message && <p className="text-xs text-muted-foreground mb-2">{app.message}</p>}
                {!app.read && (
                  <button
                    onClick={() => { void markRead({ id: app._id }); }}
                    className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                  >
                    {t("leads.mark_read")}
                  </button>
                )}
                <IssueCodeControl applicationId={app._id} email={app.email} requestedPlan={app.plan} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("leads.license_codes_heading")}</h3>
        <IssuedCodesList />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
          {t("leads.subscribers_heading", { count: subscribers?.length ?? 0 })}
        </h3>
        {subscribers === undefined ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : subscribers.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("leads.subscribers_empty")}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {subscribers.map((s) => (
              <div key={s._id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-foreground">{s.email}</span>
                <span className="text-muted-foreground">{new Date(s.subscribedAt).toLocaleDateString("en-GB")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Trial Management Panel ────────────────────────────────────────────────────

const TRIAL_PLAN_OPTIONS = [
  { value: "agent_listing",     label: "Listing — £29/mo" },
  { value: "agent_featured",    label: "Featured — £79/mo" },
  { value: "agency_white_label", label: "White Label — £149/mo" },
] as const;

const TRIAL_DURATION_OPTIONS = [
  { value: 7,  label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
] as const;

const TRIAL_PLAN_LABELS: Record<string, string> = {
  agent_listing: "Listing",
  agent_featured: "Featured",
  agency_white_label: "White Label",
};

type TrialRecord = {
  userId: Id<"users">;
  name: string;
  email: string;
  plan: "agent_listing" | "agent_featured" | "agency_white_label";
  expiresAt: string;
  grantedAt: string | null;
  note: string | null;
  daysLeft: number;
};

function TrialManagementPanel({ agents }: { agents: Doc<"agent_profiles">[] }) {
  const activeTrials = useQuery(api.agentTrials.adminListTrials, {}) as TrialRecord[] | undefined;
  const grantTrial = useMutation(api.agentTrials.grantTrial);
  const revokeTrial = useMutation(api.agentTrials.revokeTrial);

  const [grantTarget, setGrantTarget] = useState<Id<"users"> | null>(null);
  const [grantPlan, setGrantPlan] = useState<"agent_listing" | "agent_featured" | "agency_white_label">("agent_featured");
  const [grantDays, setGrantDays] = useState(14);
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleGrant = async () => {
    if (!grantTarget) return;
    setGranting(true);
    try {
      await grantTrial({ agentUserId: grantTarget, plan: grantPlan, durationDays: grantDays, note: grantNote || undefined });
      const name = agents.find((a) => a.userId === grantTarget)?.fullName ?? "Agent";
      toast.success(`${grantDays}-day ${TRIAL_PLAN_LABELS[grantPlan]} trial granted to ${name}.`);
      setGrantTarget(null);
      setGrantNote("");
      setGrantDays(30);
    } catch (err) {
      const msg = convexErrMsg(err) ?? "Failed.";
      toast.error(msg);
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (userId: Id<"users">, name: string) => {
    if (!window.confirm(`Revoke the active trial for ${name}? This cannot be undone.`)) return;
    setRevoking(userId);
    try {
      await revokeTrial({ agentUserId: userId });
      toast.success(`Trial revoked for ${name}.`);
    } catch (err) {
      const msg = convexErrMsg(err) ?? "Failed.";
      toast.error(msg);
    } finally {
      setRevoking(null);
    }
  };

  const targetName = agents.find((a) => a.userId === grantTarget)?.fullName ?? "Agent";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          Agent Trial Management
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Grant free trials to agents you are onboarding. Trials unlock the selected plan tier until expiry.</p>
      </div>

      {/* Grant form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Grant New Trial</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</label>
              <select
                value={grantTarget ?? ""}
                onChange={(e) => setGrantTarget(e.target.value as Id<"users"> || null)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#0f2040] focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">Select an agent…</option>
                {agents.map((a) => (
                  <option key={a._id} value={a.userId}>
                    {a.fullName} — {a.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Tier</label>
              <select
                value={grantPlan}
                onChange={(e) => setGrantPlan(e.target.value as typeof grantPlan)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#0f2040] focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {TRIAL_PLAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</label>
              <select
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#0f2040] focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {TRIAL_DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Note <span className="font-normal normal-case">(optional)</span></label>
            <input
              type="text"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value.slice(0, 500))}
              placeholder="e.g. Onboarding trial — referred by Luka"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#0f2040] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="flex justify-end">
            <button
              disabled={!grantTarget || granting}
              onClick={() => void handleGrant()}
              className={cn(
                "flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-colors",
                grantTarget && !granting
                  ? "bg-accent text-white hover:bg-accent/90 cursor-pointer"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {granting ? "Granting…" : grantTarget ? `Grant ${grantDays}-Day Trial to ${targetName}` : "Select an agent to grant trial"}
            </button>
          </div>
        </div>
      </div>

      {/* Active trials */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Active Trials ({activeTrials?.length ?? 0})
          </span>
        </div>
        {activeTrials === undefined ? (
          <div className="p-5 space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : activeTrials.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No active trials.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Agent</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">Plan</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">Expires</th>
                <th className="px-5 py-3 text-center">Days Left</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeTrials.map((trial) => (
                <tr key={trial.userId} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#0f2040] text-xs">{trial.name}</div>
                    <div className="text-[11px] text-gray-400">{trial.email}</div>
                    {trial.note && <div className="text-[10px] text-gray-400 mt-0.5 italic">{trial.note}</div>}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-full",
                      trial.plan === "agency_white_label"
                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                        : trial.plan === "agent_featured"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200",
                    )}>
                      {TRIAL_PLAN_LABELS[trial.plan]}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <CalendarClock className="w-3 h-3" />
                      {new Date(trial.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center text-xs font-bold px-2.5 py-1 rounded-full",
                      trial.daysLeft <= 7
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : trial.daysLeft <= 14
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-green-50 text-green-700 border border-green-100",
                    )}>
                      {trial.daysLeft}d
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      disabled={revoking === trial.userId}
                      onClick={() => void handleRevoke(trial.userId as Id<"users">, trial.name)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {revoking === trial.userId ? "Revoking…" : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PayoutRequestsAdminPanel() {
  const requests = useQuery(api.admin.listPayoutRequests, {});
  const process = useMutation(api.admin.processPayoutRequest);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const handleProcess = async (id: Id<"payout_requests">, decision: "paid" | "declined") => {
    setProcessingId(id);
    try {
      await process({ requestId: id, decision, adminNotes: adminNotes[id] ?? undefined });
      toast.success(decision === "paid" ? "Marked as paid." : "Request declined.");
    } catch {
      toast.error("Failed to process request.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
            Payout Requests — Pending ({requests?.length ?? 0})
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Commission withdrawal requests from agents. Confirm bank transfer before marking paid.
          </p>
        </div>
      </div>
      {requests === undefined ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : requests.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          No pending payout requests.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req._id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#0f2040]">{req.agentName}</span>
                    {req.agentEmail && (
                      <a href={`mailto:${req.agentEmail}`} className="text-xs text-accent hover:underline">{req.agentEmail}</a>
                    )}
                  </div>
                  <div className="text-2xl font-semibold text-[#0f2040] mt-1">
                    ${(req.amountCents / 100).toFixed(2)}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(req.requestedAt).toLocaleString("en-GB")}
                </span>
              </div>
              {req.notes && (
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed bg-white/60 rounded-lg px-3 py-2">
                  {req.notes}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Admin notes (optional)"
                  value={adminNotes[req._id] ?? ""}
                  onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req._id]: e.target.value }))}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={processingId === req._id}
                    onClick={() => { void handleProcess(req._id, "paid"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                  </button>
                  <button
                    disabled={processingId === req._id}
                    onClick={() => { void handleProcess(req._id, "declined"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmployersAdminPanel() {
  const { t } = useTranslation("admin");
  const orgs = useQuery(api.adminOrgs.listOrganizations, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("employers.heading", { count: orgs?.length ?? 0 })}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("employers.description")}
      </p>
      {orgs === undefined ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : orgs.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("employers.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map((org) => (
            <div key={org._id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-primary">{org.name}</span>
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {org.type === "household" ? t("employers.household") :
                   org.type === "university" ? "University" :
                   org.type === "law_firm" ? "Law Firm" :
                   t("employers.employer")}
                </span>
                <div className="text-[10px] text-muted-foreground">{new Date(org.createdAt).toLocaleDateString("en-GB")} · {t(org.memberCount === 1 ? "employers.admin_one" : "employers.admin_other", { count: org.memberCount })}</div>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{t("employers.pending", { count: org.pendingCount })}</span>
                <span>{t("employers.accepted", { count: org.acceptedCount })}</span>
                <span>{t("employers.declined", { count: org.declinedCount })}</span>
                <span>{t("employers.revoked", { count: org.revokedCount })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLogPanel() {
  const { t } = useTranslation("admin");
  const entries = useQuery(api.admin.getAuditLog, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("audit.title")}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("audit.description")}
      </p>
      {entries === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : entries.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("audit.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry._id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <Settings className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {entry.action} {entry.details ? `— ${entry.details}` : ""}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t("audit.by", { email: entry.adminEmail ?? t("audit.unknown_admin") })} · {new Date(entry.createdAt).toLocaleString("en-GB")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Marketplace Leads Admin Panel ────────────────────────────────────────────

function MarketplaceLeadsAdminPanel() {
  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | "">("");
  const leads = useQuery(
    api.marketplace.adminGetAllLeads,
    statusFilter ? { statusFilter: statusFilter as "open" | "closed" } : {},
  );

  const urgencyColors = {
    urgent: "text-red-600 bg-red-50 border-red-200",
    standard: "text-blue-600 bg-blue-50 border-blue-200",
    exploring: "text-emerald-600 bg-emerald-50 border-emerald-200",
  } as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-widest">Marketplace Leads</h3>
          <p className="text-xs text-gray-400 mt-0.5">All applicant lead submissions with unlock counts</p>
        </div>
        <div className="flex gap-2">
          {(["", "open", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                statusFilter === s
                  ? "bg-[#0f2040] text-white border-[#0f2040]"
                  : "border-gray-200 text-gray-500 hover:text-[#0f2040]",
              )}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {leads === undefined ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">No leads found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Lead</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Submitter</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Source</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Unlocks</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Sentinel</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#0f2040] text-xs">{lead.visaType}</p>
                    <p className="text-xs text-gray-400">{lead.destinationCountry}</p>
                    <span className={cn("inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", urgencyColors[lead.urgencyLevel])}>
                      {lead.urgencyLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-gray-700">{lead.submitterName ?? "—"}</p>
                    <p className="text-[11px] text-gray-400">{lead.submitterEmail ?? "—"}</p>
                    {lead.applicantNationality && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{lead.applicantNationality}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {lead.leadSource === "rejection_analyser" ? (
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                          Rejection Analyser
                        </span>
                        {lead.additionalNotes && (
                          <p className="text-[10px] text-gray-400 mt-1 leading-relaxed max-w-[180px]">{lead.additionalNotes}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400">Manual</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      lead.status === "open"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-500 border border-gray-200",
                    )}>
                      {lead.status === "open" ? <LockOpen className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                      lead.unlockCount > 0 ? "bg-accent/10 text-accent" : "bg-gray-100 text-gray-400",
                    )}>
                      {lead.unlockCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {lead.sentinelNotifiedAt ? (
                      <span className="text-[11px] text-emerald-600">
                        Notified {new Date(lead.sentinelNotifiedAt).toLocaleDateString("en-GB")}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[11px] text-gray-400">
                    {new Date(lead.createdAt).toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Credit Management Admin Panel ────────────────────────────────────────────

function CreditManagementPanel() {
  const agents = useQuery(api.marketplace.adminGetAgentCredits);
  const grantCredits = useMutation(api.marketplace.adminGrantCredits);
  const [grantTarget, setGrantTarget] = useState<Id<"users"> | null>(null);
  const [grantAmount, setGrantAmount] = useState("10");
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);

  const handleGrant = async () => {
    if (!grantTarget || !grantAmount) return;
    const credits = parseInt(grantAmount, 10);
    if (isNaN(credits) || credits <= 0) { toast.error("Enter a valid credit amount."); return; }
    setGranting(true);
    try {
      const result = await grantCredits({ agentUserId: grantTarget, credits, notes: grantNote || undefined });
      toast.success(`Granted ${credits} credits. New balance: ${result.newBalance}`);
      setGrantTarget(null);
      setGrantAmount("10");
      setGrantNote("");
    } catch (err) {
      const msg = convexErrMsg(err) ?? "Failed.";
      toast.error(msg);
    } finally {
      setGranting(false);
    }
  };

  const tierLabels: Record<string, string> = {
    agent_listing: "Listing",
    agent_featured: "Featured",
    agency_white_label: "White Label",
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-widest">Credit Management</h3>
        <p className="text-xs text-gray-400 mt-0.5">View agent credit balances and grant credits manually</p>
      </div>

      {agents === undefined ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">No verified agents yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Tier</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Region</th>
                <th className="px-4 py-3 text-center">Balance</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agents.map((agent) => (
                <tr key={agent.profileId} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#0f2040] text-xs">{agent.fullName}</p>
                    <p className="text-[11px] text-gray-400">{agent.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                    {agent.tier ? tierLabels[agent.tier] ?? agent.tier : "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {agent.region ? (
                      <span className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                        agent.region === "europe"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200",
                      )}>
                        {agent.region === "europe" ? "Europe / EU" : "Global"}
                      </span>
                    ) : <span className="text-[11px] text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
                      agent.creditBalance > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-400",
                    )}>
                      <Coins className="w-3 h-3" />
                      {agent.creditBalance}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setGrantTarget(grantTarget === agent.userId ? null : agent.userId)}
                      className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                    >
                      {grantTarget === agent.userId ? "Cancel" : "Grant credits"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline grant form */}
      {grantTarget && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-[#0f2040]">
            Grant credits to: {agents?.find((a) => a.userId === grantTarget)?.fullName ?? "Agent"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Credits to grant</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Note (optional)</label>
              <input
                value={grantNote}
                onChange={(e) => setGrantNote(e.target.value)}
                placeholder="e.g. Beta onboarding"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>
          <button
            onClick={() => void handleGrant()}
            disabled={granting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0f2040] text-white hover:bg-[#0f2040]/90 transition-colors cursor-pointer disabled:opacity-60"
          >
            {granting ? (
              <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Granting…</>
            ) : (
              <><Coins className="w-3.5 h-3.5" /> Grant {grantAmount} credits</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Security Audit Log Panel ─────────────────────────────────────────────────

function SecurityIntelligenceCentre() {
  const entries = useQuery(api.securityAudit.adminGetSecurityLog, { limit: 500 }) ?? [];
  const stats = useQuery(api.securityAudit.adminGetSecurityStats, {});
  const threatActions = useQuery(api.securityAudit.adminGetThreatActions, {}) ?? [];
  const takeAction = useMutation(api.securityAudit.adminTakeAction);

  const [filter, setFilter] = useState<"all" | "critical" | "warn" | "info" | "mitigated">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);

  const loading = entries === undefined || stats === undefined || threatActions === undefined;

  const actionsByEvent: Record<string, typeof threatActions> = {};
  for (const a of threatActions) {
    if (a.eventId) {
      if (!actionsByEvent[a.eventId]) actionsByEvent[a.eventId] = [];
      actionsByEvent[a.eventId].push(a);
    }
  }

  const isMitigated = (id: string) =>
    (actionsByEvent[id] ?? []).some((a) => a.action === "reviewed" || a.action === "dismissed");

  const filteredEntries = (entries as NonNullable<typeof entries>).filter((e) => {
    if (filter === "critical" && e.severity !== "critical") return false;
    if (filter === "warn" && e.severity !== "warn") return false;
    if (filter === "info" && e.severity !== "info") return false;
    if (filter === "mitigated" && !isMitigated(e._id)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.action.toLowerCase().includes(q) ||
        String(e.actorUserId).toLowerCase().includes(q) ||
        (e.resourceType?.toLowerCase().includes(q) ?? false) ||
        (e.metadata?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  async function act(
    eventId: (typeof entries)[number]["_id"] | undefined,
    actorUserId: (typeof entries)[number]["actorUserId"],
    action: "reviewed" | "dismissed" | "note_added" | "user_suspended" | "user_unsuspended" | "leads_revoked",
    notes?: string,
  ) {
    const key = `${String(eventId ?? "")}:${action}`;
    setActioning(key);
    try {
      await takeAction({ eventId, actorUserId, action, notes });
      const labels: Record<string, string> = {
        reviewed: "Marked reviewed",
        dismissed: "Event dismissed",
        note_added: "Note saved",
        user_suspended: "Actor suspended",
        user_unsuspended: "Actor reinstated",
        leads_revoked: "Lead access revoked",
      };
      toast.success(labels[action] ?? "Done");
      if (action === "note_added" && eventId) {
        setNoteTexts((prev) => ({ ...prev, [String(eventId)]: "" }));
      }
    } catch {
      toast.error("Action failed — please try again");
    } finally {
      setActioning(null);
    }
  }

  const sevBadge: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    warn: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  };
  const sevStripe: Record<string, string> = {
    critical: "border-l-red-500",
    warn: "border-l-amber-400",
    info: "border-l-blue-400",
  };
  const eventLabels: Record<string, string> = {
    lead_unlock: "Lead unlock",
    credits_granted: "Credits granted",
    agent_profile_create: "Agent profile created",
    fraud_signal: "Fraud signal",
    auth_failure: "Auth failure",
    forbidden_access: "Forbidden access attempt",
    suspicious_rate: "Suspicious activity rate",
  };

  const statTiles = [
    { label: "Total events", value: stats?.total ?? 0, cls: "text-[#0f2040]", bg: "bg-gray-50 border-gray-200" },
    { label: "Critical", value: stats?.critical ?? 0, cls: "text-red-700", bg: "bg-red-50 border-red-200" },
    { label: "Warnings", value: stats?.warn ?? 0, cls: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
    { label: "Info", value: stats?.info ?? 0, cls: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
    { label: "Mitigated", value: stats?.mitigated ?? 0, cls: "text-green-700", bg: "bg-green-50 border-green-200" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-widest">Security Intelligence Centre</h3>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-[10px] font-bold text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Real-time threat monitoring, full audit trail, and one-click mitigation actions.</p>
        </div>
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, actors…"
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f2040]/20 w-52"
          />
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          : statTiles.map((s) => (
              <div key={s.label} className={cn("rounded-xl border p-3.5 flex flex-col gap-1", s.bg)}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{s.label}</span>
                <span className={cn("text-2xl font-bold tabular-nums", s.cls)}>{s.value}</span>
              </div>
            ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0 border-b border-gray-100">
        {(["all", "critical", "warn", "info", "mitigated"] as const).map((f) => {
          const counts: Record<string, number> = {
            all: entries.length,
            critical: stats?.critical ?? 0,
            warn: stats?.warn ?? 0,
            info: stats?.info ?? 0,
            mitigated: stats?.mitigated ?? 0,
          };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 text-xs font-semibold capitalize border-b-2 transition-colors",
                filter === f ? "border-[#0f2040] text-[#0f2040]" : "border-transparent text-gray-400 hover:text-gray-600",
              )}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          );
        })}
      </div>

      {/* Event feed */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : filteredEntries.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
          {search.trim() ? "No events match your search." : "No events in this category."}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => {
            const mitigated = isMitigated(entry._id);
            const expanded = expandedId === entry._id;
            const actionsForEvent = actionsByEvent[entry._id] ?? [];
            const note = noteTexts[entry._id] ?? "";
            let meta: Record<string, unknown> = {};
            try { meta = entry.metadata ? JSON.parse(entry.metadata) : {}; } catch { /* noop */ }

            return (
              <div
                key={entry._id}
                className={cn(
                  "border rounded-xl border-l-4 bg-white overflow-hidden transition-shadow",
                  sevStripe[entry.severity] ?? "border-l-gray-300",
                  mitigated ? "opacity-60" : "shadow-sm",
                )}
              >
                <button
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50/60 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : entry._id)}
                >
                  <span className={cn("mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", sevBadge[entry.severity] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
                    {entry.severity.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0f2040] truncate">{eventLabels[entry.action] ?? entry.action}</p>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                      actor:{String(entry.actorUserId).slice(-10)}
                      {entry.resourceType && <span className="ml-2 text-gray-300">· {entry.resourceType}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {mitigated && (
                      <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                        Mitigated
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 whitespace-nowrap hidden sm:block">
                      {new Date(entry.createdAt).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform shrink-0", expanded && "rotate-180")} />
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3 bg-gray-50/40">
                    {Object.keys(meta).length > 0 && (
                      <div className="rounded-lg bg-white border border-gray-100 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Metadata</p>
                        <div className="space-y-1">
                          {Object.entries(meta).map(([k, v]) => (
                            <div key={k} className="flex items-start gap-2 text-[11px]">
                              <span className="font-semibold text-gray-500 min-w-[80px] shrink-0">{k}</span>
                              <span className="text-gray-700 font-mono break-all">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {entry.resourceId && (
                      <p className="text-[11px] text-gray-500">
                        <span className="font-semibold">Resource:</span> {entry.resourceType} · <span className="font-mono">{entry.resourceId.slice(-12)}</span>
                      </p>
                    )}
                    {actionsForEvent.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Admin actions taken</p>
                        {actionsForEvent.map((a, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px] text-gray-600">
                            <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                            <span className="font-semibold capitalize">{a.action.replace(/_/g, " ")}</span>
                            {a.notes && <span className="text-gray-400">— {a.notes}</span>}
                            <span className="ml-auto text-gray-400 whitespace-nowrap">
                              {new Date(a.createdAt).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <textarea
                        value={note}
                        onChange={(e) => setNoteTexts((prev) => ({ ...prev, [entry._id]: e.target.value }))}
                        placeholder="Add a note about this event…"
                        rows={2}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f2040]/20 bg-white"
                      />
                      <button
                        disabled={!note.trim() || actioning !== null}
                        onClick={() => act(entry._id, entry.actorUserId, "note_added", note.trim())}
                        className="px-3 py-2 text-xs font-semibold bg-[#0f2040] text-white rounded-lg disabled:opacity-40 hover:bg-[#1a3060] transition-colors cursor-pointer"
                      >
                        Save note
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={actioning !== null}
                        onClick={() => act(entry._id, entry.actorUserId, "reviewed")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Mark reviewed
                      </button>
                      <button
                        disabled={actioning !== null}
                        onClick={() => act(entry._id, entry.actorUserId, "dismissed")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" />
                        Dismiss
                      </button>
                      <button
                        disabled={actioning !== null}
                        onClick={() => {
                          if (window.confirm(`Suspend actor …${String(entry.actorUserId).slice(-10)}? This sets their account as suspended in the database.`)) {
                            void act(entry._id, entry.actorUserId, "user_suspended");
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <UserX className="w-3 h-3" />
                        Suspend actor
                      </button>
                      <button
                        disabled={actioning !== null}
                        onClick={() => act(entry._id, entry.actorUserId, "user_unsuspended")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <UserCheck className="w-3 h-3" />
                        Reinstate actor
                      </button>
                      <button
                        disabled={actioning !== null}
                        onClick={() => {
                          if (window.confirm(`Log lead-access revocation for actor …${String(entry.actorUserId).slice(-10)}?`)) {
                            void act(entry._id, entry.actorUserId, "leads_revoked");
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        Revoke leads
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CountryWatchAdminPanel() {
  const { t } = useTranslation("admin");
  const updates = useQuery(api.countryWatch.listUpdates, {});
  const publishUpdate = useMutation(api.countryWatch.publishUpdate);
  const [countryName, setCountryName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!countryName || !title.trim() || !body.trim()) {
      toast.error(t("watch.toast_required"));
      return;
    }
    setPublishing(true);
    try {
      await publishUpdate({ countryName, title: title.trim(), body: body.trim() });
      toast.success(t("watch.toast_published", { country: countryName }));
      setTitle("");
      setBody("");
    } catch {
      toast.error(t("watch.toast_publish_failed"));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-4">{t("watch.publish_heading")}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t("watch.publish_description")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("watch.country_label")}</label>
            <CountrySelect
              value={countryName}
              onChange={setCountryName}
              placeholder={t("watch.select_country")}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("watch.title_label")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("watch.title_placeholder")}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("watch.details_label")}</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("watch.details_placeholder")}
              className="min-h-[120px]"
            />
          </div>
          <Button disabled={publishing} className="cursor-pointer font-semibold" onClick={() => void handlePublish()}>
            {publishing ? t("watch.publishing") : t("watch.publish")}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">{t("watch.published_heading")}</h3>
        {updates === undefined ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("watch.published_empty")}</p>
        ) : (
          <div className="space-y-2">
            {updates.map((u) => (
              <div key={u._id} className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">{u.countryName}</div>
                <div className="text-sm font-semibold text-foreground mb-1">{u.title}</div>
                <div className="text-xs text-muted-foreground">{u.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BlogAdminPanel() {
  const articles = useQuery(api.blog.adminList);
  const upsert = useMutation(api.blog.adminUpsert);
  const togglePublished = useMutation(api.blog.adminTogglePublished);
  const deleteArticle = useMutation(api.blog.adminDelete);
  const seedArticles = useMutation(api.blog.adminSeedArticles);
  const translateArticle = useAction(api.blogAI.translateArticle);

  const [editing, setEditing] = useState<string | null>(null); // _id or "new"
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null); // article _id being translated
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "", title: "", excerpt: "", body: "", category: "", readTime: "", featured: false, published: true, publishedAt: "",
  });

  const openNew = () => {
    setForm({ slug: "", title: "", excerpt: "", body: "", category: "", readTime: "5 min read", featured: false, published: true, publishedAt: new Date().toISOString().slice(0, 10) });
    setEditing("new");
  };

  const openEdit = (a: NonNullable<typeof articles>[number]) => {
    setForm({
      slug: a.slug, title: a.title, excerpt: a.excerpt, body: a.body,
      category: a.category, readTime: a.readTime, featured: a.featured,
      published: a.published, publishedAt: a.publishedAt ? a.publishedAt.slice(0, 10) : "",
    });
    setEditing(a._id);
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !form.title.trim() || !form.body.trim()) {
      toast.error("Slug, title, and body are required.");
      return;
    }
    setSaving(true);
    try {
      await upsert({
        _id: editing !== "new" ? editing as Parameters<typeof upsert>[0]["_id"] : undefined,
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        body: form.body,
        category: form.category.trim() || "Guides",
        readTime: form.readTime.trim() || "5 min read",
        featured: form.featured,
        published: form.published,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
      });
      toast.success(editing === "new" ? "Article created." : "Article saved.");
      setEditing(null);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: Parameters<typeof togglePublished>[0]["_id"]) => {
    try {
      await togglePublished({ _id: id });
    } catch {
      toast.error("Failed to update.");
    }
  };

  const handleDelete = async (id: Parameters<typeof deleteArticle>[0]["_id"]) => {
    try {
      await deleteArticle({ _id: id });
      toast.success("Article deleted.");
      setConfirmDelete(null);
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const count = await seedArticles({});
      toast.success(`${count} articles loaded successfully.`);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Seed failed.");
    } finally {
      setSeeding(false);
    }
  };

  const handleTranslate = async (articleId: string) => {
    setTranslating(articleId);
    try {
      await translateArticle({ articleId: articleId as Parameters<typeof translateArticle>[0]["articleId"] });
      toast.success("Translated into FR · ES · PT · AR · HI. Live for all users immediately.");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Translation failed. Check your OpenAI key.");
    } finally {
      setTranslating(null);
    }
  };

  const f = (key: keyof typeof form, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const inputCls = "w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">Blog Articles</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Create, edit, publish, and delete blog articles. Changes go live instantly.</p>
        </div>
        <Button size="sm" className="cursor-pointer font-semibold" onClick={openNew}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New Article
        </Button>
      </div>

      {/* Seed prompt — only shown when table is empty */}
      {articles !== undefined && articles.length === 0 && editing === null && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground mb-3">No articles yet. Load the 10 original VisaClear articles to get started.</p>
          <Button size="sm" disabled={seeding} className="cursor-pointer font-semibold" onClick={() => void handleSeed()}>
            {seeding ? "Loading…" : "Load Default Articles"}
          </Button>
        </div>
      )}

      {/* Edit / create form */}
      {editing !== null && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-sm text-primary">{editing === "new" ? "New Article" : "Edit Article"}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Slug (URL)</label>
              <input type="text" value={form.slug} onChange={(e) => f("slug", e.target.value)} placeholder="my-article-title" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Category</label>
              <input type="text" value={form.category} onChange={(e) => f("category", e.target.value)} placeholder="Visa Tips" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Title</label>
            <input type="text" value={form.title} onChange={(e) => f("title", e.target.value)} placeholder="Article title" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Excerpt (1–2 sentences shown in the list)</label>
            <Textarea value={form.excerpt} onChange={(e) => f("excerpt", e.target.value)} placeholder="Short description shown on the blog listing page." className="min-h-[70px]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Body (markdown — use ## for headings, **bold**, - lists, 1. ordered lists)</label>
            <Textarea value={form.body} onChange={(e) => f("body", e.target.value)} placeholder="Full article content..." className="min-h-[280px] font-mono text-xs" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Read Time</label>
              <input type="text" value={form.readTime} onChange={(e) => f("readTime", e.target.value)} placeholder="5 min read" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Published Date</label>
              <input type="date" value={form.publishedAt} onChange={(e) => f("publishedAt", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input type="checkbox" checked={form.featured} onChange={(e) => f("featured", e.target.checked)} className="cursor-pointer" />
                Featured (shown at top)
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input type="checkbox" checked={form.published} onChange={(e) => f("published", e.target.checked)} className="cursor-pointer" />
                Published (visible to users)
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button disabled={saving} className="cursor-pointer font-semibold" onClick={() => void handleSave()}>
              {saving ? "Saving…" : "Save Article"}
            </Button>
            <Button variant="outline" className="cursor-pointer" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Article list */}
      {articles === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => {
            type ArticleTrans = { translations?: Record<string, unknown> };
            const transObj = (a as ArticleTrans).translations ?? {};
            const transCount = ["fr", "es", "pt", "ar", "hi"].filter((l) => !!transObj[l]).length;
            const isTranslating = translating === a._id;

            return (
              <div key={a._id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", a.published ? "text-green-700 bg-green-50 border-green-200" : "text-muted-foreground bg-muted border-border")}>
                      {a.published ? "Published" : "Draft"}
                    </span>
                    {a.featured && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">Featured</span>}
                    <span className="text-[10px] text-muted-foreground">{a.category}</span>
                    {/* Translation status badge */}
                    {transCount === 5 ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        5 langs ✓
                      </span>
                    ) : transCount > 0 ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {transCount}/5 langs
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                        EN only
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">/blog/{a.slug}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Translate button */}
                  <button
                    onClick={() => void handleTranslate(a._id)}
                    disabled={isTranslating}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors cursor-pointer",
                      isTranslating
                        ? "text-blue-400 bg-blue-50 animate-pulse"
                        : transCount === 5
                        ? "text-emerald-500 hover:bg-emerald-50"
                        : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                    )}
                    title={transCount === 5 ? "Re-translate (5 langs)" : "Translate to FR · ES · PT · AR · HI"}
                  >
                    <Languages className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void handleToggle(a._id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors"
                    title={a.published ? "Unpublish" : "Publish"}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEdit(a)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors"
                    title="Edit"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  {confirmDelete === a._id ? (
                    <>
                      <button onClick={() => void handleDelete(a._id)} className="text-xs font-semibold text-destructive cursor-pointer px-2 py-1 rounded hover:bg-destructive/10">Confirm</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-muted-foreground cursor-pointer px-1">Cancel</button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(a._id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 cursor-pointer transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ── AI Usage Panel ────────────────────────────────────────────────────────────

function AIUsagePanel() {
  const data = useQuery(api.admin.getAIUsage, {});

  if (data === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  const maxTrend = Math.max(...data.trend.map((d) => d.total), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Today — Agent", value: data.todayAgent, color: "text-blue-600" },
          { label: "Today — Business", value: data.todayBusiness, color: "text-purple-600" },
          { label: "All-time Agent", value: data.totalAgent, color: "text-blue-400" },
          { label: "All-time Business", value: data.totalBusiness, color: "text-purple-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
            <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* 7-day trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">7-Day Trend</p>
        <div className="flex items-end gap-2 h-28">
          {data.trend.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col gap-0.5" style={{ height: "80px", justifyContent: "flex-end" }}>
                {/* Business on top */}
                {d.business > 0 && (
                  <div
                    className="w-full rounded-t bg-purple-400"
                    style={{ height: `${Math.round((d.business / maxTrend) * 72)}px`, minHeight: "3px" }}
                  />
                )}
                {/* Agent below */}
                {d.agent > 0 && (
                  <div
                    className="w-full bg-blue-500"
                    style={{ height: `${Math.round((d.agent / maxTrend) * 72)}px`, minHeight: "3px", borderRadius: d.business > 0 ? "0 0 4px 4px" : "4px" }}
                  />
                )}
                {d.total === 0 && <div className="w-full rounded bg-gray-100" style={{ height: "3px" }} />}
              </div>
              <span className="text-[10px] text-gray-400 tabular-nums">{d.day.slice(5)}</span>
              <span className="text-[10px] font-semibold text-gray-600 tabular-nums">{d.total || ""}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Agent</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-purple-400 inline-block" />Business</span>
        </div>
      </div>

      {/* Top users this week */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Top Users — Last 7 Days</p>
        </div>
        {data.topUsers.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No AI messages sent yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">User</th>
                <th className="text-right px-4 py-3">Agent</th>
                <th className="text-right px-4 py-3">Business</th>
                <th className="text-right px-5 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.topUsers.map((u, i) => (
                <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-800 truncate max-w-[220px]">{u.email}</p>
                    {u.name && <p className="text-xs text-gray-400 truncate">{u.name}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-medium text-blue-600">{u.agentMessages || "—"}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-medium text-purple-600">{u.bizMessages || "—"}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-bold text-gray-800">{u.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

export default function AdminPage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const adminExists = useQuery(api.admin.checkAdminExists, {});
  const claimFirstAdmin = useMutation(api.admin.claimFirstAdmin);
  const [claiming, setClaiming] = useState(false);

  const handleClaimAdmin = async () => {
    setClaiming(true);
    try {
      await claimFirstAdmin({});
      toast.success("Admin access granted. Welcome.");
      // Role query is reactive — AdminInner renders automatically once
      // currentUser.role flips to "admin". No manual navigation needed.
    } catch (err) {
      const msg = convexErrMsg(err) ?? "Could not claim admin access.";
      toast.error(msg);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AuthLoading>
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-3 w-80">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex-1 flex flex-col md:flex-row min-h-screen">
          {/* Left — branding panel */}
          <div className="hidden md:flex md:w-80 lg:w-96 bg-[#0f2040] flex-col justify-between p-10 shrink-0">
            <div>
              <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity mb-16">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-serif text-lg font-semibold text-white leading-tight">VisaClear</div>
                  <div className="text-[9px] text-white/65 tracking-widest uppercase">by Vericore</div>
                </div>
              </button>
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#b8a06a]/20 flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-[#b8a06a]" />
                </div>
                <h1 className="font-serif text-3xl font-semibold text-white mb-3">Admin Portal</h1>
                <p className="text-white/50 text-sm leading-relaxed">
                  Restricted access. Sign in with your admin account to manage users, content, and platform settings.
                </p>
              </div>
              <div className="space-y-3 mt-8">
                {["User & agent management", "Blog & content publishing", "Platform analytics & audit log"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#b8a06a]" />
                    <span className="text-white/65 text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-white/50 text-xs">&copy; {new Date().getFullYear()} Vericore Ltd.</p>
          </div>

          {/* Right — login form */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
            {/* Mobile logo */}
            <button onClick={() => navigate("/")} className="md:hidden flex items-center gap-2 mb-8 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-[#0f2040] flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-serif text-lg font-semibold text-[#0f2040]">VisaClear</span>
            </button>

            <div className="w-full max-w-sm">
              <div className="mb-7">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#b8a06a] bg-[#b8a06a]/10 px-3 py-1 rounded-full mb-3 tracking-widest uppercase">
                  <Shield className="w-3 h-3" /> Admin Access
                </div>
                <h2 className="font-serif text-2xl font-semibold text-[#0f2040]">Sign in to continue</h2>
                <p className="text-gray-400 text-sm mt-1">Only authorised admin accounts can access this panel.</p>
              </div>
              <AuthAccessPanel returnPath="/admin" hideDemoOption={true} />
              <p className="text-center text-xs text-gray-400 mt-5">
                Not an admin?{" "}
                <button onClick={() => navigate("/")} className="text-[#0f2040] font-semibold hover:underline cursor-pointer">
                  Back to the site
                </button>
              </p>
            </div>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        {currentUser === undefined ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#0f2040]/20 border-t-[#0f2040] rounded-full animate-spin" />
          </div>
        ) : currentUser?.role !== "admin" ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <h2 className="font-serif text-2xl font-semibold text-[#0f2040] mb-2">{t("page.access_denied")}</h2>
              <p className="text-gray-500 text-sm mb-4">{t("page.access_denied_body")}</p>
              {adminExists === false ? (
                <>
                  <p className="text-gray-400 text-xs mb-6">
                    No admin has been set up yet. You can claim the first admin seat below.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => { void handleClaimAdmin(); }}
                      disabled={claiming}
                      className="cursor-pointer bg-[#0f2040] hover:bg-[#0f2040]/90"
                    >
                      {claiming ? "Claiming..." : "Claim first admin seat"}
                    </Button>
                    <Button variant="ghost" onClick={() => navigate("/")} className="cursor-pointer text-gray-500">
                      {t("page.go_home")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-gray-400 text-xs mb-2">
                    Contact the platform admin to have your account granted access.
                  </p>
                  <Button variant="ghost" onClick={() => navigate("/")} className="cursor-pointer text-gray-500">
                    {t("page.go_home")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex">
            <AdminInner />
          </div>
        )}
      </Authenticated>
    </div>
  );
}

// ─── Corridor Intelligence Panel ──────────────────────────────────────────────

function CorridorIntelligencePanel() {
  const data = useQuery(api.rejectionPatterns.getCorridorIntelligence, {});

  if (data === undefined) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }
  if (data.length === 0) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-400">No pattern data yet</p>
        <p className="text-xs text-gray-400 mt-1">Pattern data accumulates automatically each time the Rejection Analyser is used.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-serif font-semibold text-[#0f2040]">Corridor Intelligence</h2>
        <p className="text-xs text-gray-400 mt-0.5">Aggregated from every Rejection Analyser session — anonymised, no personal data stored.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Corridor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Visa</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Analyses</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg Success %</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Top Refusal Codes</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden xl:table-cell">Common Missing Docs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-4">
                  <div className="font-medium text-[#0f2040] text-sm">{row.origin} → {row.destination}</div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{row.visaType}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="font-semibold text-[#0f2040]">{row.analysisCount}</span>
                </td>
                <td className="px-4 py-4">
                  <span className={cn(
                    "font-semibold text-sm",
                    row.avgSuccessProbability >= 60 ? "text-green-600" : row.avgSuccessProbability >= 35 ? "text-amber-600" : "text-red-600"
                  )}>
                    {row.avgSuccessProbability}%
                  </span>
                </td>
                <td className="px-4 py-4 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1.5">
                    {row.topRefusalCodes.length === 0
                      ? <span className="text-xs text-gray-400">—</span>
                      : row.topRefusalCodes.map((rc) => (
                        <span key={rc.code} className="text-[10px] font-medium bg-red-50 text-red-700 border border-red-100 rounded px-1.5 py-0.5">
                          {rc.code} <span className="text-red-400">×{rc.count}</span>
                        </span>
                      ))
                    }
                  </div>
                </td>
                <td className="px-4 py-4 hidden xl:table-cell">
                  <div className="space-y-0.5">
                    {row.topMissingDocs.length === 0
                      ? <span className="text-xs text-gray-400">—</span>
                      : row.topMissingDocs.map((d) => (
                        <div key={d.doc} className="text-xs text-gray-600">{d.doc} <span className="text-gray-400">×{d.count}</span></div>
                      ))
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Checklist Flags Panel ────────────────────────────────────────────────────

function ChecklistFlagsPanel() {
  const flags = useQuery(api.checklistFlags.listPendingFlags, {});
  const reviewFlag = useMutation(api.checklistFlags.reviewFlag);

  const ISSUE_LABELS: Record<string, string> = {
    requirement_changed: "Requirement changed",
    link_broken: "Link broken",
    missing_information: "Missing info",
    incorrect_information: "Incorrect info",
  };

  const handleReview = async (flagId: string, action: "reviewed" | "dismissed") => {
    try {
      await reviewFlag({ flagId: flagId as Parameters<typeof reviewFlag>[0]["flagId"], action });
      toast.success(action === "reviewed" ? "Marked as reviewed" : "Dismissed");
    } catch {
      toast.error("Failed to update flag");
    }
  };

  if (flags === undefined) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif font-semibold text-[#0f2040]">Checklist Accuracy Flags</h2>
          <p className="text-xs text-gray-400 mt-0.5">Submitted by logged-in users who found requirements that may be wrong or outdated.</p>
        </div>
        <span className={cn(
          "text-xs font-bold px-3 py-1 rounded-full border",
          flags.length > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-100"
        )}>
          {flags.length} pending
        </span>
      </div>

      {flags.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">No pending flags</p>
          <p className="text-xs text-gray-400 mt-1">All checklist accuracy flags have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div key={flag._id} className="border border-amber-100 bg-amber-50/40 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-semibold text-sm text-[#0f2040]">{flag.origin} → {flag.destination}</span>
                    <span className="text-xs font-medium bg-white border border-gray-200 text-gray-600 rounded-full px-2 py-0.5">{flag.visaType}</span>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                      {ISSUE_LABELS[flag.issueType] ?? flag.issueType}
                    </span>
                  </div>
                  {flag.requirementTitle && (
                    <p className="text-xs font-medium text-gray-700 mb-1">Requirement: <span className="font-normal">{flag.requirementTitle}</span></p>
                  )}
                  {flag.notes && (
                    <p className="text-xs text-gray-600 leading-relaxed">"{flag.notes}"</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {new Date(flag.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleReview(flag._id, "reviewed")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0f2040] text-white hover:bg-[#0f2040]/90 transition-colors cursor-pointer"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => handleReview(flag._id, "dismissed")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Approval Stories Admin Panel ─────────────────────────────────────────────

function ApprovalsAdminPanel() {
  const stories = useQuery(api.approvalStories.listPendingStories, {});
  const moderateStory = useMutation(api.approvalStories.moderateStory);

  const ATTEMPTS_LABEL: Record<number, string> = {
    1: "First attempt",
    2: "Second attempt",
    3: "Third attempt or more",
  };

  const handleModerate = async (storyId: string, action: "approved" | "rejected") => {
    try {
      await moderateStory({ storyId: storyId as Parameters<typeof moderateStory>[0]["storyId"], action });
      toast.success(action === "approved" ? "Story approved and published" : "Story rejected");
    } catch {
      toast.error("Failed to update story");
    }
  };

  if (stories === undefined) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif font-semibold text-[#0f2040]">Approval Stories</h2>
          <p className="text-xs text-gray-400 mt-0.5">Submitted by paid members. Review before publishing to the public approvals page.</p>
        </div>
        <span className={cn(
          "text-xs font-bold px-3 py-1 rounded-full border",
          (stories.length > 0) ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-100"
        )}>
          {stories.length} pending
        </span>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-16">
          <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">No stories pending review</p>
          <p className="text-xs text-gray-400 mt-1">Approved stories appear on the public /approvals page and on each corridor page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map((story) => (
            <div key={story._id} className="border border-gray-200 bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-semibold text-sm text-[#0f2040]">{story.origin} → {story.destination}</span>
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{story.visaType}</span>
                    <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                      {ATTEMPTS_LABEL[story.attempts] ?? `${story.attempts} attempts`}
                    </span>
                  </div>
                  {story.shortNote && (
                    <p className="text-sm text-gray-700 leading-relaxed italic">"{story.shortNote}"</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {new Date(story.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleModerate(story._id, "approved")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleModerate(story._id, "rejected")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── Creators / Influencers ────────────────────────────────────────────────────

function CreatorsAdminPanel() {
  const creators = useQuery(api.creators.listAll, {});
  const createCode = useMutation(api.creators.createCode);
  const toggleActive = useMutation(api.creators.toggleActive);
  const markPaid = useMutation(api.creators.markCommissionsPaid);

  const [showForm, setShowForm] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cSlug, setCSlug] = useState("");
  const [cRate, setCRate] = useState(20);
  const [cUnlimited, setCUnlimited] = useState(true);
  const [cMonths, setCMonths] = useState(6);
  const [cNotes, setCNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPortalId, setCopiedPortalId] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (v: string) => {
    setCName(v);
    // Auto-fill slug from name only while user hasn't manually edited it
    if (!cSlug || cSlug === slugify(cName)) setCSlug(slugify(v));
  };

  const handleCreate = async () => {
    if (!cName.trim() || !cEmail.trim() || !cSlug.trim()) return;
    setSubmitting(true);
    try {
      await createCode({
        name: cName.trim(),
        email: cEmail.trim(),
        slug: cSlug.trim(),
        commissionRatePercent: cRate,
        commissionMonths: cUnlimited ? 0 : cMonths,
        notes: cNotes.trim() || undefined,
      });
      toast.success(`Creator "${cName.trim()}" created — copy their portal link from the table below.`);
      setShowForm(false);
      setCName(""); setCEmail(""); setCSlug(""); setCRate(20);
      setCUnlimited(true); setCMonths(6); setCNotes("");
    } catch (err) {
      const message = convexErrMsg(err) ?? "Failed to create creator.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyRef = (slug: string, id: string) => {
    void navigator.clipboard.writeText(`https://visaclear.app/ref/${slug}`);
    setCopiedId(id);
    toast.success("Referral link copied.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPortal = (token: string, id: string) => {
    void navigator.clipboard.writeText(`${window.location.origin}/creator/portal/${token}`);
    setCopiedPortalId(id);
    toast.success("Portal link copied — send this to the creator privately.");
    setTimeout(() => setCopiedPortalId(null), 2000);
  };

  const handleMarkPaid = async (slug: string, id: string) => {
    setMarkingPaid(id);
    try {
      const count = await markPaid({ creatorSlug: slug });
      toast.success(`Marked ${count} commission row${count === 1 ? "" : "s"} as paid.`);
    } catch {
      toast.error("Could not mark commissions as paid.");
    } finally {
      setMarkingPaid(null);
    }
  };

  const fmtMoney = (cents: number) => `£${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Creators & Influencers
            {creators && (
              <span className="text-[11px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5">
                {creators.length} total
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Each creator gets a unique link and a private portal. Commission fires on every payment their referred followers make.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? "Cancel" : "Add creator"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-5 space-y-4">
          <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wider">New creator</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Full name</label>
              <input
                value={cName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Amara Osei"
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email (for payout contact)</label>
              <input
                type="email"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Slug — their link will be{" "}
              <span className="font-mono text-primary">
                visaclear.app/ref/<strong>{cSlug || "slug"}</strong>
              </span>
            </label>
            <input
              value={cSlug}
              onChange={(e) => setCSlug(slugify(e.target.value))}
              placeholder="e.g. amara"
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-white font-mono"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Commission rate</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={cRate}
                  onChange={(e) => setCRate(Math.min(50, Math.max(1, Number(e.target.value))))}
                  className="w-20 px-3 py-2 text-sm rounded-lg border border-input bg-white text-center font-semibold"
                />
                <span className="text-sm text-muted-foreground">% of each payment</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Duration</label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={cUnlimited}
                  onChange={(e) => setCUnlimited(e.target.checked)}
                  className="w-4 h-4 accent-yellow-500 cursor-pointer"
                />
                Unlimited — earn on every payment forever
              </label>
              {!cUnlimited && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={1}
                    max={36}
                    value={cMonths}
                    onChange={(e) => setCMonths(Math.min(36, Math.max(1, Number(e.target.value))))}
                    className="w-20 px-3 py-2 text-sm rounded-lg border border-input bg-white text-center"
                  />
                  <span className="text-sm text-muted-foreground">months</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Notes (private, optional)</label>
            <input
              value={cNotes}
              onChange={(e) => setCNotes(e.target.value)}
              placeholder="e.g. YouTube — immigration niche, 45k subs"
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-white"
            />
          </div>

          <Button
            size="sm"
            className="w-full cursor-pointer"
            disabled={!cName.trim() || !cEmail.trim() || !cSlug.trim() || submitting}
            onClick={() => { void handleCreate(); }}
          >
            {submitting ? "Creating..." : "Create creator"}
          </Button>
        </div>
      )}

      {creators === undefined ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : creators.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-yellow-400 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No creators yet</p>
          <p className="text-xs text-muted-foreground">
            Add your first creator or influencer above — they get a referral link and a private earnings portal.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {creators.map((c) => {
            const isExpanded = expandedId === c._id;
            const hasUnpaid = c.pendingCents > 0;

            return (
              <div
                key={c._id}
                className={cn(
                  "rounded-xl border bg-card transition-all",
                  c.active ? "border-border" : "border-border/50 opacity-60"
                )}
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-yellow-100 border border-yellow-200 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-yellow-700">{c.name.charAt(0).toUpperCase()}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{c.name}</span>
                      <span className="text-[10.5px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">/ref/{c.slug}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        c.active
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-secondary text-secondary-foreground border border-border"
                      )}>
                        {c.active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                      <span>{c.commissionRatePercent}% per payment</span>
                      <span>·</span>
                      <span>{c.commissionMonths === 0 ? "Unlimited" : `${c.commissionMonths} months`}</span>
                      {c.notes && <><span>·</span><span className="truncate max-w-[160px]">{c.notes}</span></>}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-5 text-center shrink-0">
                    {[
                      { label: "Clicks",   value: c.totalClicks.toLocaleString(), color: "text-foreground" },
                      { label: "Signups",  value: c.signupCount.toString(),        color: "text-foreground" },
                      { label: "Paying",   value: c.paidSubscriberCount.toString(), color: "text-blue-600" },
                      { label: "Owed",     value: fmtMoney(c.pendingCents),         color: hasUnpaid ? "text-amber-600" : "text-foreground" },
                      { label: "Total",    value: fmtMoney(c.totalCommissionCents), color: "text-emerald-600" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className={cn("text-sm font-bold tabular-nums", color)}>{value}</div>
                        <div className="text-[10px] text-muted-foreground font-medium">{label}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c._id)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Mobile stats */}
                <div className="sm:hidden grid grid-cols-4 border-t border-border divide-x divide-border">
                  {[
                    { label: "Clicks",  value: c.totalClicks.toLocaleString(), color: "text-foreground" },
                    { label: "Signups", value: c.signupCount.toString(),        color: "text-foreground" },
                    { label: "Paying",  value: c.paidSubscriberCount.toString(), color: "text-blue-600" },
                    { label: "Owed",    value: fmtMoney(c.pendingCents),         color: hasUnpaid ? "text-amber-600" : "text-foreground" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="py-2 text-center">
                      <div className={cn("text-sm font-bold tabular-nums", color)}>{value}</div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-3">
                    <div className="space-y-1">
                      <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Referral link (they share this publicly)</p>
                      <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-border text-xs font-mono text-muted-foreground">
                        <span className="truncate flex-1">https://visaclear.app/ref/{c.slug}</span>
                        <button
                          onClick={() => copyRef(c.slug, c._id)}
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 cursor-pointer"
                        >
                          {copiedId === c._id ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === c._id ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Private portal (send to creator only — never post publicly)</p>
                      <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-amber-200 bg-amber-50/50 text-xs font-mono text-muted-foreground">
                        <span className="truncate flex-1 select-none text-amber-700">{window.location.origin}/creator/portal/{"•".repeat(16)}</span>
                        <button
                          onClick={() => copyPortal(c.portalToken, c._id)}
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 cursor-pointer"
                        >
                          {copiedPortalId === c._id ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedPortalId === c._id ? "Copied" : "Copy link"}
                        </button>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground">Token is hidden on screen. Clicking Copy puts the full URL on your clipboard.</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {hasUnpaid && (
                        <button
                          onClick={() => { void handleMarkPaid(c.slug, c._id); }}
                          disabled={markingPaid === c._id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {markingPaid === c._id ? "Marking..." : `Mark paid (${fmtMoney(c.pendingCents)} owed)`}
                        </button>
                      )}
                      <button
                        onClick={() => { void toggleActive({ codeId: c._id }); }}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer",
                          c.active
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-green-200 text-green-700 hover:bg-green-50"
                        )}
                      >
                        {c.active
                          ? <><XCircle className="w-3.5 h-3.5" /> Pause</>
                          : <><CheckCircle2 className="w-3.5 h-3.5" /> Reactivate</>
                        }
                      </button>
                      {c.totalCommissionCents > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground font-medium">
                          {fmtMoney(c.totalCommissionCents)} total · {fmtMoney(c.totalCommissionCents - c.pendingCents)} paid out
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── System Health Panel ───────────────────────────────────────────────────────

const ENV_VAR_META: { key: string; label: string; category: string; optional?: boolean }[] = [
  { key: "AUTH_GOOGLE_ID",       label: "Google Sign-In ID",       category: "Auth" },
  { key: "AUTH_GOOGLE_SECRET",   label: "Google Sign-In Secret",   category: "Auth" },
  { key: "OPENAI_API_KEY",       label: "OpenAI API Key",          category: "AI" },
  { key: "RESEND_API_KEY",       label: "Resend API Key",          category: "Email" },
  { key: "RESEND_FROM_EMAIL",    label: "Resend From Address",     category: "Email" },
  { key: "SITE_URL",             label: "Site URL",                category: "Config" },
  { key: "STRIPE_SECRET_KEY",    label: "Stripe Secret Key",       category: "Payments" },
  { key: "STRIPE_PUBLISHABLE_KEY", label: "Stripe Publishable Key", category: "Payments" },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe Webhook Secret",  category: "Payments" },
  { key: "PAYSTACK_SECRET_KEY",  label: "Paystack Secret Key",     category: "Payments", optional: true },
];

const CATEGORY_ORDER = ["Auth", "AI", "Email", "Config", "Payments"];

function SystemHealthPanel() {
  const health = useQuery(api.systemHealth.getSystemHealth, {});
  const tgConfigured  = useQuery(api.telegramBot.isTelegramConfigured, {});
  const waConfigured  = useQuery(api.whatsappBot.isWhatsAppConfigured, {});
  const navigate = useNavigate();
  const [patDismissed, setPatDismissed] = useState(() =>
    localStorage.getItem("vc_admin_pat_fixed") === "1"
  );
  const [ogDismissed, setOgDismissed] = useState(() =>
    localStorage.getItem("vc_admin_og_fixed") === "1"
  );

  if (health === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  const score = health.score;
  const scoreColor = score >= 95 ? "text-emerald-600" : score >= 80 ? "text-amber-600" : "text-red-600";
  const scoreLabel = score >= 95 ? "Production-ready" : score >= 80 ? "Needs attention" : "Action required";
  const scoreDeg = Math.round((score / 100) * 360);

  // Group env vars by category
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    vars: ENV_VAR_META.filter((v) => v.category === cat),
  }));

  const pendingAttention =
    health.pendingFlagsCount > 0 ||
    health.pendingApprovalsCount > 0 ||
    health.pendingCreatorPayoutCents > 0 ||
    health.pendingPayoutRequestsCount > 0;

  const checkedAt = new Date(health.checkedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5">

      {/* Score card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex items-center gap-5">
        {/* Conic-gradient score circle */}
        <div
          className="relative shrink-0 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `conic-gradient(${score >= 95 ? "#059669" : score >= 80 ? "#d97706" : "#dc2626"} 0deg ${scoreDeg}deg, #e5e7eb ${scoreDeg}deg 360deg)` }}
        >
          <div className="absolute w-14 h-14 rounded-full bg-white" />
          <span className={cn("relative z-10 text-lg font-black tabular-nums", scoreColor)}>{score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-base font-bold", scoreColor)}>{scoreLabel}</div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-relaxed">
            {score >= 95
              ? "All critical systems configured. VisaClear is fully operational."
              : "Some configuration gaps detected. See env vars below."}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Live · last checked {checkedAt} — updates automatically
          </p>
        </div>
        <div className="hidden sm:grid grid-cols-2 gap-3 shrink-0">
          {[
            { label: "Users",      value: health.platformStats.totalUsers.toLocaleString() },
            { label: "Checklists", value: health.platformStats.totalChecklists.toLocaleString() },
            { label: "Pro",        value: (health.platformStats.proUsers ?? 0).toLocaleString() },
            { label: "Expert",     value: (health.platformStats.expertUsers ?? 0).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="text-center bg-gray-50 rounded-xl px-3 py-2">
              <div className="text-sm font-black tabular-nums text-gray-800">{value}</div>
              <div className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending attention */}
      {pendingAttention && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-[10.5px] font-bold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Needs your attention
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Checklist flags", value: health.pendingFlagsCount, tab: "checklist-flags" as Tab, color: health.pendingFlagsCount > 0 ? "text-amber-700" : "text-gray-400" },
              { label: "Pending approvals", value: health.pendingApprovalsCount, tab: "approvals" as Tab, color: health.pendingApprovalsCount > 0 ? "text-amber-700" : "text-gray-400" },
              { label: "Creator payouts", value: `£${(health.pendingCreatorPayoutCents / 100).toFixed(2)}`, tab: "creators" as Tab, color: health.pendingCreatorPayoutCents > 0 ? "text-amber-700" : "text-gray-400" },
              { label: "Agent payout req.", value: health.pendingPayoutRequestsCount, tab: "agents" as Tab, color: health.pendingPayoutRequestsCount > 0 ? "text-amber-700" : "text-gray-400" },
            ].map(({ label, value, tab: targetTab, color }) => (
              <button
                key={label}
                onClick={() => navigate(`/admin?tab=${targetTab}`)}
                className="rounded-lg border border-amber-200 bg-white p-3 text-center hover:border-amber-400 transition-colors cursor-pointer"
              >
                <div className={cn("text-lg font-black tabular-nums", color)}>{value}</div>
                <div className="text-[10px] font-semibold text-gray-500 mt-0.5">{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Env vars */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Environment Variables
          </span>
          <span className="text-[10.5px] font-semibold text-muted-foreground">
            {Object.values(health.envVars).filter(Boolean).length} / {Object.values(health.envVars).length} set
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {byCategory.map(({ category, vars }) => (
            <div key={category} className="px-5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{category}</p>
              <div className="space-y-1.5">
                {vars.map(({ key, label, optional }) => {
                  const isSet = health.envVars[key];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                        isSet ? "bg-emerald-100" : optional ? "bg-amber-100" : "bg-red-100"
                      )}>
                        {isSet
                          ? <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          : <XCircle className={cn("w-3 h-3", optional ? "text-amber-500" : "text-red-500")} />
                        }
                      </div>
                      <span className="text-xs font-medium text-foreground flex-1">{label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{key}</span>
                      {optional && !isSet && (
                        <span className="text-[9.5px] font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-1.5 py-0.5">Pending</span>
                      )}
                      {!optional && !isSet && (
                        <span className="text-[9.5px] font-bold bg-red-50 text-red-600 border border-red-200 rounded-full px-1.5 py-0.5">Missing</span>
                      )}
                      {isSet && (
                        <span className="text-[9.5px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-1.5 py-0.5">Set ✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification channels */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Notification Channels
          </span>
          <span className="text-[10.5px] text-muted-foreground font-medium">Admin alerts — Telegram &amp; WhatsApp</span>
        </div>
        <div className="divide-y divide-gray-50">
          {([
            {
              label: "Telegram Bot",
              status: tgConfigured,
              tab: "telegram-bot" as Tab,
              hint: "Set TELEGRAM_BOT_TOKEN to enable",
            },
            {
              label: "WhatsApp Bot",
              status: waConfigured,
              tab: "whatsapp-bot" as Tab,
              hint: "Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_NUMBER to enable",
            },
          ] as const).map(({ label, status, tab: targetTab, hint }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3">
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                status ? "bg-emerald-50" : "bg-gray-100"
              )}>
                <MessageCircle className={cn("w-3.5 h-3.5", status ? "text-emerald-600" : "text-gray-400")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {status === undefined ? "Checking…" : status ? "Connected and active" : hint}
                </p>
              </div>
              {status === undefined ? (
                <span className="text-[9.5px] font-bold bg-gray-50 text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">…</span>
              ) : status ? (
                <span className="text-[9.5px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-1.5 py-0.5">Live ✓</span>
              ) : (
                <button
                  onClick={() => navigate(`/admin?tab=${targetTab}`)}
                  className="text-[9.5px] font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Configure →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmed solid */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Confirmed solid
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { icon: Shield,       title: "Security headers",                  desc: "CSP, X-Frame-Options, HSTS, Referrer-Policy on every response" },
            { icon: Globe,        title: "Backend on Convex cloud",           desc: "ardent-pelican-768 — independent of your laptop, always on" },
            { icon: Lock,         title: "RLS & tenant isolation",            desc: "Every mutation goes through getCurrentUserOrThrow() — no cross-user reads" },
            { icon: RefreshCw,    title: "PWA service worker v6",             desc: "Network-first HTML, cache-first assets, push notifications wired" },
            { icon: Sparkles,     title: "6 languages live",                  desc: "EN · FR · ES · PT · AR · HI — UI and all 10 blog articles fully translated" },
            { icon: Globe,        title: "iOS PWA splash screens",            desc: "13 device-specific launch images deployed — white flash on iPhone eliminated" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 px-5 py-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{desc}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Action Now — only rendered when there are real outstanding items */}
      {(!patDismissed || !health?.envVars?.PAYSTACK_SECRET_KEY) && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-200">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Action Now
            </span>
          </div>
          <div className="divide-y divide-red-100/60">
            {!patDismissed && (
              <div className="flex items-start gap-3 px-5 py-3.5">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-900">GitHub PAT token — security risk</p>
                  <p className="text-[11px] text-red-700/80 font-medium mt-0.5">
                    A personal access token is embedded in the git remote URL and is visible in git config. Rotate it on GitHub and replace the remote URL with SSH or a token-only credential. Do this before your next push.
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9.5px] font-bold bg-red-100 text-red-700 border border-red-200 rounded-full px-2 py-0.5 whitespace-nowrap hover:bg-red-200 transition-colors text-center"
                  >
                    GitHub →
                  </a>
                  <button
                    onClick={() => { localStorage.setItem("vc_admin_pat_fixed", "1"); setPatDismissed(true); }}
                    className="text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 whitespace-nowrap hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    Mark fixed
                  </button>
                </div>
              </div>
            )}
            {!health?.envVars?.PAYSTACK_SECRET_KEY && (
              <div className="flex items-start gap-3 px-5 py-3.5">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-900">Paystack secret key — Nigerian payments blocked</p>
                  <p className="text-[11px] text-red-700/80 font-medium mt-0.5">
                    All other payment integrations are live. Nigerian card payments are gated on this key. Add <code className="bg-red-100 rounded px-0.5">PAYSTACK_SECRET_KEY</code> in the Convex Dashboard → Environment Variables when Paystack provides it.
                  </p>
                </div>
                <span className="text-[9.5px] font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap shrink-0">Waiting</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Watch list — only shown while items remain */}
      {!ogDismissed && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-amber-100">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Watch list — no urgency
            </span>
          </div>
          <div className="divide-y divide-amber-100/60">
            <div className="flex items-start gap-3 px-5 py-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-amber-900">OG social share image</p>
                <p className="text-[11px] text-amber-700/80 font-medium">1200×630 og-image.png is deployed and wired in index.html — WhatsApp, Twitter and LinkedIn previews are live.</p>
              </div>
              <button
                onClick={() => { localStorage.setItem("vc_admin_og_fixed", "1"); setOgDismissed(true); }}
                className="text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 whitespace-nowrap hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
              >
                Mark fixed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
