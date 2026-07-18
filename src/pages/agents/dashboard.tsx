import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading, useAction, useMutation, useQuery } from "convex/react";
import type { Doc, Id as ConvexId } from "@/convex/_generated/dataModel.js";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { WaitTimeStat } from "@/components/wait-time-stat.tsx";
import { NotificationBell } from "@/components/NotificationBell.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import { useSeo } from "@/hooks/use-seo.ts";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { AVAILABLE_DESTINATIONS, getAvailableVisaTypes, getChecklist, VISA_TYPES, type VisaType } from "@/lib/visa-data.ts";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  Brain,
  Building2,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Copy,
  CreditCard,
  Eye,
  FileSearch,
  FileText,
  Globe,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  NotebookPen,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  Star,
  TrendingUp,
  UploadCloud,
  UserPlus,
  Users,
  X,
  Zap,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { AgentAIChat } from "@/components/AgentAIChat.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntakeStatus = "awaiting_documents" | "documents_received" | "in_review" | "complete";
type Section = "overview" | "clients" | "pipeline" | "analytics" | "referrals" | "license" | "ai";

type IntakeDocument = {
  _id: Id<"client_documents">;
  label: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  url: string | null;
};

type Intake = {
  _id: Id<"client_intakes">;
  token: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  destination: string;
  visaType: string;
  status: IntakeStatus;
  notes?: string;
  createdAt: string;
  claimedByEmail?: string;
  sourceContactRequestId?: Id<"agent_contact_requests">;
  documents: IntakeDocument[];
};

type ConvertPayload = {
  contactRequestId: Id<"agent_contact_requests">;
  clientName?: string;
  clientEmail?: string;
};

type ContactRequest = {
  _id: Id<"agent_contact_requests">;
  fromName?: string;
  fromEmail?: string;
  message?: string;
  createdAt: string;
  read: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV: { id: Section; labelKey: string; Icon: LucideIcon }[] = [
  { id: "overview",  labelKey: "nav.overview",   Icon: LayoutDashboard },
  { id: "clients",   labelKey: "nav.clients",    Icon: Users },
  { id: "pipeline",  labelKey: "nav.pipeline",   Icon: ClipboardCheck },
  { id: "analytics", labelKey: "nav.analytics",  Icon: BarChart3 },
  { id: "referrals", labelKey: "nav.referrals",  Icon: CircleDollarSign },
  { id: "license",   labelKey: "nav.license",    Icon: BadgeCheck },
  { id: "ai",        labelKey: "nav.ai",         Icon: Sparkles },
];

const STATUS_STYLES: Record<IntakeStatus, { dot: string; badge: string }> = {
  awaiting_documents: { dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-700 border-slate-200" },
  documents_received: { dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-800 border-amber-200" },
  in_review:          { dot: "bg-blue-400",   badge: "bg-blue-50 text-blue-800 border-blue-200" },
  complete:           { dot: "bg-green-500",  badge: "bg-green-50 text-green-800 border-green-200" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function toWhatsAppNumber(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function visaTypeLabel(visaType: string) {
  return VISA_TYPES.find((v) => v.value === visaType)?.label ?? visaType;
}

function requiredDocCount(destination: string, visaType: string) {
  const list = getChecklist(destination, visaType as VisaType);
  return list ? list.items.filter((i) => i.required).length : 0;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Shared: send-link buttons ────────────────────────────────────────────────

function SendLinkButtons({ token, clientName, clientPhone, compact }: { token: string; clientName: string; clientPhone?: string; compact?: boolean }) {
  const { t } = useTranslation("agent-dashboard");
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/client-portal/${token}`;
  const msg = t("send.message", { name: clientName, link });
  const waHref = clientPhone
    ? `https://wa.me/${toWhatsAppNumber(clientPhone)}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <a
        href={waHref} target="_blank" rel="noopener noreferrer"
        className={cn("flex items-center gap-1.5 rounded-lg font-semibold border border-[#25D366]/30 bg-[#25D366]/10 text-[#1f9e54] hover:bg-[#25D366]/20 transition-colors", compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm")}
        title={t("send.whatsapp")}
      >
        <MessageCircle className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        {!compact && <span className="hidden sm:inline">{t("send.whatsapp")}</span>}
      </a>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(link).then(() => { setCopied(true); toast.success(t("send.toast_copied")); setTimeout(() => setCopied(false), 2000); }).catch(() => toast.error(t("send.toast_copy_failed")))}
        className={cn("flex items-center gap-1.5 rounded-lg font-semibold border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors", compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm")}
        title={copied ? t("send.copied") : t("send.copy_link")}
      >
        {copied ? <CheckCircle2 className={cn("text-green-500", compact ? "w-3.5 h-3.5" : "w-4 h-4")} /> : <Copy className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />}
        {!compact && <span className="hidden sm:inline">{copied ? t("send.copied") : t("send.copy_link")}</span>}
      </button>
    </div>
  );
}

// ─── New-client form ──────────────────────────────────────────────────────────

function NewClientForm({
  onCreated,
  onCancel,
  prefill,
}: {
  onCreated: (token: string) => void;
  onCancel: () => void;
  prefill?: ConvertPayload;
}) {
  const { t } = useTranslation("agent-dashboard");
  const translateCountry = useCountryName();
  const createIntake = useMutation(api.clientIntakes.createIntake);
  const [clientName, setClientName] = useState(prefill?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(prefill?.clientEmail ?? "");
  const [clientPhone, setClientPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [visaType, setVisaType] = useState<VisaType | "">("");
  const [saving, setSaving] = useState(false);
  const visaTypes = destination ? getAvailableVisaTypes(destination) : [];

  const handleCreate = async () => {
    if (!clientName || !destination || !visaType) { toast.error(t("form.toast_required")); return; }
    setSaving(true);
    try {
      const { token } = await createIntake({
        clientName,
        clientEmail: clientEmail || undefined,
        clientPhone: clientPhone || undefined,
        destination,
        visaType,
        sourceContactRequestId: prefill?.contactRequestId,
      });
      toast.success(t("form.toast_created"));
      onCreated(token);
    } catch (err) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast.error(msg ?? t("form.toast_create_error"));
    }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg text-primary">{t("form.heading") || "Add New Client"}</h3>
        <button type="button" onClick={onCancel} className="p-1.5 text-muted-foreground hover:text-primary cursor-pointer"><X className="w-5 h-5" /></button>
      </div>
      {prefill && (
        <div className="flex items-center gap-2.5 rounded-xl border border-[#d4a726]/30 bg-[#d4a726]/8 px-4 py-3">
          <Globe className="w-4 h-4 text-[#d4a726] shrink-0" />
          <p className="text-sm font-semibold text-[#0f2040]">This client came through VisaClear — attribution will be recorded automatically.</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">{t("form.name_placeholder") || "Client name"}</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Sarah Okonkwo" className="w-full px-4 py-3 text-base rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">{t("form.phone_placeholder") || "Phone number (optional)"}</label>
          <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+234 xxx xxx xxxx" className="w-full px-4 py-3 text-base rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">{t("form.email_placeholder") || "Email address (optional)"}</label>
        <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com" className="w-full px-4 py-3 text-base rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">{t("form.destination_placeholder") || "Destination country"}</label>
          <select value={destination} onChange={(e) => { setDestination(e.target.value); setVisaType(""); }} className="w-full px-4 py-3 text-base rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select country...</option>
            {AVAILABLE_DESTINATIONS.map((d) => <option key={d} value={d}>{DESTINATION_FLAGS[d] ?? "🌍"} {translateCountry(d)}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">{t("form.visa_type_placeholder") || "Visa type"}</label>
          <select value={visaType} onChange={(e) => setVisaType(e.target.value as VisaType)} disabled={!destination} className="w-full px-4 py-3 text-base rounded-xl border border-input bg-background disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select visa type...</option>
            {visaTypes.map((vt) => <option key={vt} value={vt}>{VISA_TYPES.find((v) => v.value === vt)?.label ?? vt}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1 cursor-pointer" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 cursor-pointer" disabled={saving} onClick={() => { void handleCreate(); }}>
          {saving ? t("form.creating") : t("form.create")}
        </Button>
      </div>
    </div>
  );
}

// ─── Case Intelligence ────────────────────────────────────────────────────────

type ReadinessSummaryEntry = {
  intakeId: ConvexId<"client_intakes">;
  score: number;
  criticalCount: number;
  mediumCount: number;
  fraudSignalCount: number;
  computedAt: string;
};

function ReadinessBadge({ entry }: { entry?: ReadinessSummaryEntry }) {
  if (!entry) return null;
  const { score, criticalCount, fraudSignalCount } = entry;
  const colour =
    score >= 80 ? "text-green-600 bg-green-50 border-green-200"
    : score >= 60 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold leading-none", colour)}>
      {score}%
      {criticalCount > 0 && <AlertTriangle className="w-2.5 h-2.5" />}
      {fraudSignalCount > 0 && <ShieldAlert className="w-2.5 h-2.5" />}
    </span>
  );
}

type CaseIntelligenceData = {
  readiness: Doc<"case_readiness"> | null;
  fixItems: Doc<"case_fix_items">[];
  consistencyChecks: Doc<"document_consistency_checks">[];
  fraudSignals: Doc<"fraud_signals">[];
  coverLetter: Doc<"cover_letters"> | null;
} | null | undefined;

type CaseIntelligenceTab = "readiness" | "fixes" | "consistency" | "fraud" | "cover";

function CaseIntelligencePanel({ intake }: { intake: Intake }) {
  const [tab, setTab] = useState<CaseIntelligenceTab>("readiness");
  const [running, setRunning] = useState(false);
  const [runningAI, setRunningAI] = useState(false);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [savingLetter, setSavingLetter] = useState(false);
  const [letterEdit, setLetterEdit] = useState<string | null>(null);
  const [visaRoute, setVisaRoute] = useState(`${intake.destination} ${intake.visaType}`);

  const data: CaseIntelligenceData = useQuery(api.caseReadiness.getIntakeReadiness, { intakeId: intake._id });
  const computeReadiness = useMutation(api.caseReadiness.computeReadiness);
  const resolveFixItem = useMutation(api.caseReadiness.resolveFixItem);
  const unresolveFixItem = useMutation(api.caseReadiness.unresolveFixItem);
  const reviewFraudSignal = useMutation(api.caseReadiness.reviewFraudSignal);
  const saveCoverLetter = useMutation(api.caseReadiness.saveCoverLetter);
  const runAIAnalysis = useAction(api.caseIntelligenceActions.runConsistencyAndFraudAnalysis);
  const generateCoverLetter = useAction(api.caseIntelligenceActions.generateCoverLetter);

  // Keep letter editor in sync with generated content when a new letter arrives
  useEffect(() => {
    if (data?.coverLetter) {
      setLetterEdit(data.coverLetter.editedContent ?? data.coverLetter.generatedContent);
    }
  }, [data?.coverLetter?.generatedContent]);

  const checklist = getChecklist(intake.destination, intake.visaType as VisaType);
  const requiredDocLabels = useMemo(
    () => checklist?.items.filter((i) => i.required).map((i) => i.title) ?? [],
    [checklist],
  );

  const handleCompute = useCallback(async () => {
    setRunning(true);
    try {
      await computeReadiness({ intakeId: intake._id, requiredDocLabels });
      toast.success("Readiness score updated.");
    } catch {
      toast.error("Failed to compute readiness. Try again.");
    } finally {
      setRunning(false);
    }
  }, [computeReadiness, intake._id, requiredDocLabels]);

  const handleRunAI = useCallback(async () => {
    setRunningAI(true);
    try {
      const result = await runAIAnalysis({ intakeId: intake._id });
      toast.success(`AI analysis complete — ${result.consistencyCheckCount} checks, ${result.fraudSignalCount} signals.`);
    } catch {
      toast.error("AI analysis failed. Check your OpenAI key and try again.");
    } finally {
      setRunningAI(false);
    }
  }, [runAIAnalysis, intake._id]);

  const handleGenerateLetter = useCallback(async () => {
    setGeneratingLetter(true);
    try {
      await generateCoverLetter({ intakeId: intake._id, visaRoute });
      toast.success("Cover letter generated.");
    } catch {
      toast.error("Cover letter generation failed.");
    } finally {
      setGeneratingLetter(false);
    }
  }, [generateCoverLetter, intake._id, visaRoute]);

  const handleSaveLetter = useCallback(async () => {
    if (letterEdit === null) return;
    setSavingLetter(true);
    try {
      await saveCoverLetter({ intakeId: intake._id, editedContent: letterEdit });
      toast.success("Cover letter saved.");
    } catch {
      toast.error("Failed to save cover letter.");
    } finally {
      setSavingLetter(false);
    }
  }, [saveCoverLetter, intake._id, letterEdit]);

  const r = data?.readiness;
  const fixItems = data?.fixItems ?? [];
  const openFixes = fixItems.filter((f) => !f.resolvedAt);
  const resolvedFixes = fixItems.filter((f) => f.resolvedAt);
  const consistencyChecks = data?.consistencyChecks ?? [];
  const fraudSignals = data?.fraudSignals ?? [];
  const coverLetter = data?.coverLetter;

  const TABS: { id: CaseIntelligenceTab; label: string; count?: number; warn?: boolean }[] = [
    { id: "readiness", label: "Readiness" },
    { id: "fixes", label: "Fix List", count: openFixes.length, warn: openFixes.some((f) => f.severity === "critical") },
    { id: "consistency", label: "Cross-Doc", count: consistencyChecks.filter((c) => c.status === "mismatch").length, warn: consistencyChecks.some((c) => c.status === "mismatch") },
    { id: "fraud", label: "Fraud Signals", count: fraudSignals.filter((s) => !s.reviewedAt).length, warn: fraudSignals.some((s) => s.severity === "high" && !s.reviewedAt) },
    { id: "cover", label: "Cover Letter" },
  ];

  return (
    <div className="mt-4 rounded-xl border border-[#0f2040]/20 bg-background overflow-hidden shadow-sm">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f2040]/5 border-b border-[#0f2040]/10">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#0f2040]" />
          <span className="text-xs font-bold text-[#0f2040] uppercase tracking-wide">Case Intelligence</span>
          {r && (
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              r.score >= 80 ? "bg-green-100 text-green-700" : r.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
            )}>{r.score}% Ready</span>
          )}
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => { void handleCompute(); }}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#0f2040]/60 hover:text-[#0f2040] transition-colors cursor-pointer disabled:opacity-40"
        >
          <RefreshCw className={cn("w-3 h-3", running && "animate-spin")} />
          {r ? "Re-run" : "Run check"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer",
              tab === t.id
                ? "border-[#0f2040] text-[#0f2040]"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {(t.count ?? 0) > 0 && (
              <span className={cn(
                "inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold",
                t.warn ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground",
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">

        {/* ── Readiness ── */}
        {tab === "readiness" && (
          <div className="space-y-4">
            {!r ? (
              <div className="text-center py-8">
                <FileSearch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No readiness check yet.</p>
                <button
                  type="button"
                  disabled={running}
                  onClick={() => { void handleCompute(); }}
                  className="px-4 py-2 rounded-lg bg-[#0f2040] text-white text-sm font-semibold cursor-pointer disabled:opacity-40"
                >
                  {running ? "Computing…" : "Run case check"}
                </button>
              </div>
            ) : (
              <>
                {/* Score + stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Score", value: `${r.score}%`, colour: r.score >= 80 ? "text-green-600" : r.score >= 60 ? "text-amber-600" : "text-red-600" },
                    { label: "Uploaded", value: `${r.uploadedCount}/${r.requiredCount}`, colour: "text-foreground" },
                    { label: "Critical", value: r.criticalCount, colour: r.criticalCount > 0 ? "text-red-600" : "text-muted-foreground" },
                    { label: "Fraud Signals", value: r.fraudSignalCount, colour: r.fraudSignalCount > 0 ? "text-purple-600" : "text-muted-foreground" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-muted/40 px-3 py-2.5 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{stat.label}</p>
                      <p className={cn("text-lg font-bold font-serif", stat.colour)}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Required doc checklist */}
                {requiredDocLabels.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Required documents</p>
                    <div className="rounded-xl border border-border overflow-hidden">
                      {requiredDocLabels.map((label, i) => {
                        const uploadedNorm = (intake.documents ?? []).map((d) => d.label.toLowerCase());
                        const matched = uploadedNorm.some(
                          (u) => u.includes(label.toLowerCase()) || label.toLowerCase().includes(u),
                        );
                        return (
                          <div key={i} className={cn("flex items-center gap-2.5 px-3 py-2 text-sm", i > 0 && "border-t border-border")}>
                            {matched ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-red-300 shrink-0" />
                            )}
                            <span className={cn("flex-1", matched ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", matched ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                              {matched ? "Uploaded" : "Missing"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI analysis trigger */}
                <div className="flex items-center justify-between rounded-xl border border-dashed border-[#0f2040]/20 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-[#0f2040]">AI deep analysis</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {r.aiAnalysisRunAt
                        ? `Last run ${new Date(r.aiAnalysisRunAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                        : "Cross-doc check + fraud signals — not run yet"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={runningAI}
                    onClick={() => { void handleRunAI(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f2040] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                  >
                    {runningAI ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                    {runningAI ? "Analysing…" : "Run AI"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Fix List ── */}
        {tab === "fixes" && (
          <div className="space-y-3">
            {openFixes.length === 0 && resolvedFixes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No fix items yet. Run a case check first.</p>
            ) : (
              <>
                {openFixes.map((fix) => (
                  <div key={fix._id} className="rounded-xl border border-border overflow-hidden">
                    <div className="flex items-start gap-3 p-3">
                      <div className={cn("w-1 self-stretch rounded-full shrink-0", fix.severity === "critical" ? "bg-red-500" : fix.severity === "medium" ? "bg-amber-500" : "bg-blue-500")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md", fix.severity === "critical" ? "bg-red-50 text-red-700" : fix.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>
                            {fix.severity}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{fix.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fix.description}</p>
                        <p className="text-xs text-foreground/80 mt-2 bg-muted/40 rounded-lg px-2.5 py-1.5">{fix.action}</p>
                      </div>
                    </div>
                    <div className="px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => { void resolveFixItem({ fixItemId: fix._id }).then(() => toast.success("Marked as resolved.")).catch(() => toast.error("Couldn't mark this as resolved.")); }}
                        className="text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                      >
                        ✓ Mark resolved
                      </button>
                    </div>
                  </div>
                ))}
                {resolvedFixes.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{resolvedFixes.length} resolved</p>
                    {resolvedFixes.map((fix) => (
                      <div key={fix._id} className="flex items-center gap-2 px-2 py-1.5 opacity-50">
                        <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="text-xs text-foreground line-through flex-1">{fix.title}</span>
                        <button
                          type="button"
                          onClick={() => { void unresolveFixItem({ fixItemId: fix._id }).catch(() => toast.error("Couldn't undo this.")); }}
                          className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                        >Undo</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Cross-Doc Consistency ── */}
        {tab === "consistency" && (
          <div className="space-y-2">
            {consistencyChecks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">No consistency checks yet.</p>
                <button
                  type="button"
                  disabled={runningAI}
                  onClick={() => { void handleRunAI(); }}
                  className="px-4 py-2 rounded-lg bg-[#0f2040] text-white text-sm font-semibold cursor-pointer disabled:opacity-40"
                >
                  {runningAI ? "Analysing…" : "Run AI analysis"}
                </button>
              </div>
            ) : (
              <>
                {consistencyChecks.some((c) => c.status === "mismatch") && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 mb-3">
                    <p className="text-xs font-semibold text-red-700">
                      {consistencyChecks.filter((c) => c.status === "mismatch").length} mismatch{consistencyChecks.filter((c) => c.status === "mismatch").length !== 1 ? "es" : ""} detected — resolve before submission.
                    </p>
                  </div>
                )}
                {consistencyChecks.map((check, i) => (
                  <div key={check._id} className={cn("rounded-xl border p-3 grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center", check.status === "mismatch" ? "border-red-200 bg-red-50/50" : check.status === "similar" ? "border-amber-200 bg-amber-50/50" : "border-green-200 bg-green-50/50")}>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{check.sourceDoc}</p>
                      <p className={cn("text-xs font-medium", check.status === "mismatch" ? "text-red-700" : "text-foreground")}>{check.sourceValue}</p>
                    </div>
                    <span className="text-muted-foreground text-sm">↔</span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{check.targetDoc}</p>
                      <p className={cn("text-xs font-medium", check.status === "mismatch" ? "text-red-700" : "text-foreground")}>{check.targetValue}</p>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap",
                      check.status === "match" ? "bg-green-100 text-green-700"
                      : check.status === "mismatch" ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700")}>
                      {check.status === "match" ? "✓ Match" : check.status === "mismatch" ? "⚠ Mismatch" : "~ Similar"}
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center pt-1">Field: {consistencyChecks[0]?.fieldName && consistencyChecks.map((c) => c.fieldName).join(", ")}</p>
              </>
            )}
          </div>
        )}

        {/* ── Fraud Signals ── */}
        {tab === "fraud" && (
          <div className="space-y-3">
            {fraudSignals.length === 0 ? (
              <div className="text-center py-6">
                <ShieldAlert className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No fraud signals detected yet.</p>
                <button
                  type="button"
                  disabled={runningAI}
                  onClick={() => { void handleRunAI(); }}
                  className="px-4 py-2 rounded-lg bg-[#0f2040] text-white text-sm font-semibold cursor-pointer disabled:opacity-40"
                >
                  {runningAI ? "Analysing…" : "Run AI analysis"}
                </button>
              </div>
            ) : (
              <>
                {fraudSignals.some((s) => s.severity === "high" && !s.reviewedAt) && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2">
                    <p className="text-xs font-semibold text-red-700">⚠ High-confidence signal requires action. Do not submit until resolved.</p>
                  </div>
                )}
                {fraudSignals.map((signal) => (
                  <div key={signal._id} className={cn("rounded-xl border p-3 flex gap-3", signal.reviewedAt ? "opacity-50" : signal.severity === "high" ? "border-red-200 border-l-4 border-l-red-500" : signal.severity === "medium" ? "border-amber-200 border-l-4 border-l-amber-500" : "border-blue-200 border-l-4 border-l-blue-400")}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", signal.severity === "high" ? "bg-red-100 text-red-700" : signal.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                          {signal.severity}
                        </span>
                        <span className="text-xs font-semibold text-foreground">{signal.signalType}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{signal.detail}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Document: {signal.documentLabel}</p>
                      {/* Confidence bar */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", signal.severity === "high" ? "bg-red-500" : signal.severity === "medium" ? "bg-amber-500" : "bg-blue-400")} style={{ width: `${Math.round(signal.confidence * 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground">{Math.round(signal.confidence * 100)}%</span>
                      </div>
                    </div>
                    {!signal.reviewedAt && (
                      <button
                        type="button"
                        onClick={() => { void reviewFraudSignal({ signalId: signal._id }).then(() => toast.success("Marked as reviewed.")).catch(() => toast.error("Couldn't mark this as reviewed.")); }}
                        className="shrink-0 text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer self-start"
                      >Reviewed</button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Cover Letter ── */}
        {tab === "cover" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={visaRoute}
                onChange={(e) => setVisaRoute(e.target.value)}
                placeholder="e.g. UK Skilled Worker"
                maxLength={100}
                className="flex-1 min-w-[140px] text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
              />
              <button
                type="button"
                disabled={generatingLetter}
                onClick={() => { void handleGenerateLetter(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f2040] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                {generatingLetter ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {coverLetter ? "Regenerate" : "Generate"}
              </button>
            </div>

            {!coverLetter ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No letter yet. Set the visa route and generate.</p>
              </div>
            ) : (
              <>
                {/* Issues addressed */}
                {coverLetter.issuesAddressed.length > 0 && (
                  <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mb-1.5">Issues pre-empted in this letter</p>
                    <div className="space-y-1">
                      {coverLetter.issuesAddressed.map((issue, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-green-800">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Editable letter */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cover letter — editable</span>
                    <span className="text-[10px] text-muted-foreground">{coverLetter.visaRoute}</span>
                  </div>
                  <textarea
                    value={letterEdit ?? ""}
                    onChange={(e) => setLetterEdit(e.target.value)}
                    rows={12}
                    maxLength={20000}
                    className="w-full text-xs font-mono leading-relaxed text-foreground bg-background px-4 py-3 resize-none focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setLetterEdit(coverLetter.generatedContent)}
                    className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >Reset to original</button>
                  <button
                    type="button"
                    disabled={savingLetter || letterEdit === (coverLetter.editedContent ?? coverLetter.generatedContent)}
                    onClick={() => { void handleSaveLetter(); }}
                    className="px-3 py-1.5 rounded-lg bg-[#0f2040] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                  >
                    {savingLetter ? "Saving…" : "Save edits"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Client row (table row with expand) ──────────────────────────────────────

// ─── Mobile client card ───────────────────────────────────────────────────────

function ClientCard({ intake, readinessEntry }: { intake: Intake; readinessEntry?: ReadinessSummaryEntry }) {
  const { t } = useTranslation("agent-dashboard");
  const translateCountry = useCountryName();
  const [expanded, setExpanded] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notes, setNotes] = useState(intake.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const updateStatus = useMutation(api.clientIntakes.updateIntakeStatus);
  const updateNotes = useMutation(api.clientIntakes.updateIntakeNotes);
  const archiveIntake = useMutation(api.clientIntakes.archiveIntake);
  const getDocumentUrl = useMutation(api.clientIntakes.getClientDocumentDownloadUrl);
  const handleOpenDocument = async (documentId: Id<"client_documents">) => {
    try {
      const url = await getDocumentUrl({ documentId });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't open that document. Please try again.");
    }
  };
  const required = requiredDocCount(intake.destination, intake.visaType);
  const days = daysSince(intake.createdAt);
  const s = STATUS_STYLES[intake.status];

  const STATUS_LABELS: Record<IntakeStatus, string> = {
    awaiting_documents: t("status.awaiting_documents"),
    documents_received: t("status.documents_received"),
    in_review: t("status.in_review"),
    complete: t("status.complete"),
  };

  const handleStatus = async (newStatus: IntakeStatus) => {
    if (newStatus === intake.status) return;
    setUpdatingStatus(true);
    try { await updateStatus({ token: intake.token, status: newStatus }); toast.success(`Moved to "${STATUS_LABELS[newStatus]}"`); }
    catch { toast.error("Status update failed."); }
    finally { setUpdatingStatus(false); }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try { await updateNotes({ token: intake.token, notes }); toast.success("Notes saved."); }
    catch { toast.error("Failed to save notes."); }
    finally { setSavingNotes(false); }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try { await archiveIntake({ token: intake.token }); toast.success(`${intake.clientName} archived.`); }
    catch { toast.error("Archive failed."); setArchiving(false); }
  };

  return (
    <div className={cn("rounded-2xl border bg-card p-4 space-y-3", days >= 7 && intake.status === "awaiting_documents" ? "border-red-200" : "border-border")}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-base font-serif">
            {intake.clientName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-base text-foreground leading-tight">{intake.clientName}</p>
              {intake.sourceContactRequestId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#d4a726]/15 text-[#0f2040] border border-[#d4a726]/30">
                  <Globe className="w-2.5 h-2.5" /> Via VisaClear
                </span>
              )}
              {intake.notes && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  <NotebookPen className="w-2.5 h-2.5" /> Note
                </span>
              )}
              <ReadinessBadge entry={readinessEntry} />
            </div>
            {intake.clientEmail && <p className="text-xs text-muted-foreground mt-0.5 truncate">{intake.clientEmail}</p>}
          </div>
        </div>
        <button type="button" onClick={() => setExpanded(v => !v)} className="p-2 text-muted-foreground hover:text-primary cursor-pointer shrink-0">
          <ChevronDown className={cn("w-5 h-5 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {/* Info row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Destination</p>
          <p className="text-sm font-medium text-foreground">{DESTINATION_FLAGS[intake.destination] ?? "🌍"} {translateCountry(intake.destination)}</p>
          <p className="text-xs text-muted-foreground">{visaTypeLabel(intake.visaType)}</p>
        </div>
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Status</p>
          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border", s.badge)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
            {STATUS_LABELS[intake.status]}
          </span>
        </div>
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Documents</p>
          <p className={cn("text-sm font-semibold", intake.documents.length >= required && required > 0 ? "text-green-600" : "text-foreground")}>
            {intake.documents.length}{required > 0 ? `/${required}` : ""} uploaded
          </p>
        </div>
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Age</p>
          <p className={cn("text-sm font-semibold", days >= 7 ? "text-red-600" : days >= 3 ? "text-amber-600" : "text-muted-foreground")}>
            {days === 0 ? "Today" : `${days} days`}
          </p>
        </div>
      </div>

      {/* Send link */}
      <SendLinkButtons token={intake.token} clientName={intake.clientName} clientPhone={intake.clientPhone} />

      {/* Expanded: stage control + notes + docs + archive */}
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Stage control */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Move to stage</p>
            <div className="flex flex-wrap gap-2">
              {(["awaiting_documents", "documents_received", "in_review", "complete"] as IntakeStatus[]).map((st) => (
                <button key={st} type="button" disabled={updatingStatus || st === intake.status}
                  onClick={() => { void handleStatus(st); }}
                  className={cn("px-3 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed",
                    st === intake.status
                      ? cn(STATUS_STYLES[st].badge, "ring-1 ring-offset-1 ring-primary/20")
                      : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 disabled:opacity-40"
                  )}>{STATUS_LABELS[st]}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <NotebookPen className="w-3 h-3" /> Notes
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Add private notes about this client — only you can see these."
              className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 text-foreground placeholder:text-muted-foreground/60"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-muted-foreground">{notes.length}/5000</span>
              <button
                type="button"
                disabled={savingNotes || notes === (intake.notes ?? "")}
                onClick={() => { void handleSaveNotes(); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-opacity"
              >
                {savingNotes ? "Saving…" : "Save notes"}
              </button>
            </div>
          </div>

          {/* Documents */}
          {intake.documents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Documents</p>
              {intake.documents.map((doc) => (
                <button key={doc._id} type="button" onClick={() => void handleOpenDocument(doc._id)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 w-full text-left cursor-pointer hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-accent shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{doc.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(doc.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </button>
              ))}
            </div>
          )}

          <WaitTimeStat destination={intake.destination} visaType={intake.visaType} variant="inline" />

          {/* Case Intelligence */}
          <CaseIntelligencePanel intake={intake} />

          {/* Archive */}
          {confirmArchive ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
              <span className="text-xs text-red-700 font-medium flex-1">Archive {intake.clientName}? They won't appear in your active list.</span>
              <button type="button" onClick={() => { void handleArchive(); }} disabled={archiving}
                className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer disabled:opacity-40">
                {archiving ? "Archiving…" : "Confirm"}
              </button>
              <button type="button" onClick={() => setConfirmArchive(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer ml-1">Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmArchive(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600 transition-colors cursor-pointer">
              <Archive className="w-3.5 h-3.5" /> Archive client
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Desktop client table row ─────────────────────────────────────────────────

function ClientRow({ intake, isLast, readinessEntry }: { intake: Intake; isLast: boolean; readinessEntry?: ReadinessSummaryEntry }) {
  const { t } = useTranslation("agent-dashboard");
  const translateCountry = useCountryName();
  const [expanded, setExpanded] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notes, setNotes] = useState(intake.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const updateStatus = useMutation(api.clientIntakes.updateIntakeStatus);
  const updateNotes = useMutation(api.clientIntakes.updateIntakeNotes);
  const archiveIntake = useMutation(api.clientIntakes.archiveIntake);
  const getDocumentUrl = useMutation(api.clientIntakes.getClientDocumentDownloadUrl);
  const handleOpenDocument = async (documentId: Id<"client_documents">) => {
    try {
      const url = await getDocumentUrl({ documentId });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't open that document. Please try again.");
    }
  };
  const required = requiredDocCount(intake.destination, intake.visaType);
  const days = daysSince(intake.createdAt);
  const s = STATUS_STYLES[intake.status];

  const STATUS_LABELS: Record<IntakeStatus, string> = {
    awaiting_documents: t("status.awaiting_documents"),
    documents_received: t("status.documents_received"),
    in_review: t("status.in_review"),
    complete: t("status.complete"),
  };

  const handleStatus = async (newStatus: IntakeStatus) => {
    if (newStatus === intake.status) return;
    setUpdatingStatus(true);
    try { await updateStatus({ token: intake.token, status: newStatus }); toast.success(`Moved to "${STATUS_LABELS[newStatus]}"`); }
    catch { toast.error("Status update failed."); }
    finally { setUpdatingStatus(false); }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try { await updateNotes({ token: intake.token, notes }); toast.success("Notes saved."); }
    catch { toast.error("Failed to save notes."); }
    finally { setSavingNotes(false); }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try { await archiveIntake({ token: intake.token }); toast.success(`${intake.clientName} archived.`); }
    catch { toast.error("Archive failed."); setArchiving(false); }
  };

  return (
    <>
      <tr
        className={cn("hover:bg-muted/30 transition-colors cursor-pointer", !isLast && "border-b border-border", expanded && "bg-muted/20")}
        onClick={() => setExpanded(v => !v)}
      >
        {/* Name */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-base font-serif">
              {intake.clientName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-base text-foreground leading-tight">{intake.clientName}</p>
                {intake.sourceContactRequestId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#d4a726]/15 text-[#0f2040] border border-[#d4a726]/30 shrink-0">
                    <Globe className="w-2.5 h-2.5" /> Via VisaClear
                  </span>
                )}
                {intake.notes && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                    <NotebookPen className="w-2.5 h-2.5" /> Note
                  </span>
                )}
                <ReadinessBadge entry={readinessEntry} />
              </div>
              {intake.clientEmail && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{intake.clientEmail}</p>}
            </div>
          </div>
        </td>
        {/* Destination */}
        <td className="px-4 py-4 hidden md:table-cell">
          <p className="text-sm font-medium text-foreground">{DESTINATION_FLAGS[intake.destination] ?? "🌍"} {translateCountry(intake.destination)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{visaTypeLabel(intake.visaType)}</p>
        </td>
        {/* Status */}
        <td className="px-4 py-4">
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", s.badge)}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
            {STATUS_LABELS[intake.status]}
          </span>
        </td>
        {/* Docs */}
        <td className="px-4 py-4 hidden sm:table-cell text-center">
          <span className={cn("text-sm font-semibold", intake.documents.length >= required && required > 0 ? "text-green-600" : "text-foreground")}>
            {intake.documents.length}{required > 0 ? `/${required}` : ""}
          </span>
        </td>
        {/* Age */}
        <td className="px-4 py-4 hidden lg:table-cell">
          <span className={cn("text-sm font-medium", days >= 7 ? "text-red-600" : days >= 3 ? "text-amber-600" : "text-muted-foreground")}>
            {days === 0 ? "Today" : `${days}d`}
          </span>
        </td>
        {/* Actions */}
        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1.5">
            <a
              href={`/client-portal/${intake.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card text-foreground hover:bg-muted/50 hover:border-primary/30 transition-colors"
              title="Open client portal"
            >
              Open <ChevronRight className="w-3 h-3" />
            </a>
            <SendLinkButtons token={intake.token} clientName={intake.clientName} clientPhone={intake.clientPhone} compact />
          </div>
        </td>
        {/* Expand toggle */}
        <td className="px-4 py-4 w-8">
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </td>
      </tr>

      {expanded && (
        <tr className={cn(!isLast && "border-b border-border")}>
          <td colSpan={7} className="px-5 pb-5 pt-0 bg-muted/10">
            <div className="pt-4 space-y-4">
              {/* Status control */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Move to stage</p>
                <div className="flex flex-wrap gap-2">
                  {(["awaiting_documents", "documents_received", "in_review", "complete"] as IntakeStatus[]).map((st) => (
                    <button
                      key={st} type="button"
                      disabled={updatingStatus || st === intake.status}
                      onClick={() => { void handleStatus(st); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed",
                        st === intake.status
                          ? cn(STATUS_STYLES[st].badge, "ring-1 ring-offset-1 ring-primary/20")
                          : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 disabled:opacity-40"
                      )}
                    >{STATUS_LABELS[st]}</button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <NotebookPen className="w-3 h-3" /> Notes
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder="Add private notes about this client — only you can see these."
                  className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 text-foreground placeholder:text-muted-foreground/60"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-muted-foreground">{notes.length}/5000</span>
                  <button
                    type="button"
                    disabled={savingNotes || notes === (intake.notes ?? "")}
                    onClick={(e) => { e.stopPropagation(); void handleSaveNotes(); }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-opacity"
                  >
                    {savingNotes ? "Saving…" : "Save notes"}
                  </button>
                </div>
              </div>

              {/* Documents */}
              {intake.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">{t("intake.empty")}</p>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Documents received</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {intake.documents.map((doc) => (
                      <button key={doc._id} type="button" onClick={() => void handleOpenDocument(doc._id)}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors w-full text-left cursor-pointer">
                        <div className="min-w-0 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">{doc.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(doc.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wait time */}
              <WaitTimeStat destination={intake.destination} visaType={intake.visaType} variant="inline" />

              {/* Case Intelligence */}
              <CaseIntelligencePanel intake={intake} />

              {/* Archive */}
              {confirmArchive ? (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-red-700 font-medium flex-1">Archive {intake.clientName}? They won't appear in your active list.</span>
                  <button type="button" onClick={() => { void handleArchive(); }} disabled={archiving}
                    className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer disabled:opacity-40">
                    {archiving ? "Archiving…" : "Confirm"}
                  </button>
                  <button type="button" onClick={() => setConfirmArchive(false)}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
                </div>
              ) : (
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmArchive(true); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600 transition-colors cursor-pointer">
                  <Archive className="w-3.5 h-3.5" /> Archive client
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Section: Clients ─────────────────────────────────────────────────────────

function ClientsSection({
  intakes,
  convertPayload,
  onConvertHandled,
  readinessSummaries,
}: {
  intakes: Intake[];
  convertPayload?: ConvertPayload;
  onConvertHandled?: () => void;
  readinessSummaries?: ReadinessSummaryEntry[];
}) {
  const { t } = useTranslation("agent-dashboard");
  const [showForm, setShowForm] = useState(!!convertPayload);
  const [activePrefill, setActivePrefill] = useState<ConvertPayload | undefined>(convertPayload);
  const [justCreatedToken, setJustCreatedToken] = useState<string | null>(null);
  const justCreatedIntake = intakes.find((i) => i.token === justCreatedToken);

  // If a new convertPayload arrives (user clicked Convert from Overview), open form
  useEffect(() => {
    if (convertPayload) {
      setActivePrefill(convertPayload);
      setShowForm(true);
    }
  }, [convertPayload]);

  const handleClose = () => {
    setShowForm(false);
    setActivePrefill(undefined);
    onConvertHandled?.();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-primary">My Clients</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{intakes.length} {intakes.length === 1 ? "client" : "clients"} total</p>
        </div>
        <Button size="lg" className="cursor-pointer gap-2" onClick={() => { setActivePrefill(undefined); setShowForm(true); setJustCreatedToken(null); }}>
          <UserPlus className="w-5 h-5" /> {t("clients.add")}
        </Button>
      </div>

      {showForm && (
        <NewClientForm
          prefill={activePrefill}
          onCreated={(token) => { setShowForm(false); setActivePrefill(undefined); setJustCreatedToken(token); onConvertHandled?.(); }}
          onCancel={handleClose}
        />
      )}

      {justCreatedToken && justCreatedIntake && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">Client link ready — send it to {justCreatedIntake.clientName}</p>
            <p className="text-xs text-green-600 truncate mt-0.5">{`${window.location.origin}/client-portal/${justCreatedToken}`}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SendLinkButtons token={justCreatedToken} clientName={justCreatedIntake.clientName} clientPhone={justCreatedIntake.clientPhone} />
            <button type="button" onClick={() => setJustCreatedToken(null)} className="p-1.5 text-green-600 hover:text-green-800 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {intakes.length === 0 && !showForm ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg text-foreground mb-2">No clients yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Add your first client to generate a secure document upload link.</p>
          <Button size="lg" className="cursor-pointer" onClick={() => setShowForm(true)}>
            <UserPlus className="w-5 h-5 mr-2" /> Add First Client
          </Button>
        </div>
      ) : intakes.length > 0 ? (
        <>
          {/* Mobile: card stack */}
          <div className="md:hidden space-y-3">
            {intakes.map((intake) => (
              <ClientCard
                key={intake._id}
                intake={intake}
                readinessEntry={readinessSummaries?.find((r) => r.intakeId === intake._id)}
              />
            ))}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Client</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Destination</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Docs</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Age</th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">Actions</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {intakes.map((intake, i) => (
                    <ClientRow
                      key={intake._id}
                      intake={intake}
                      isLast={i === intakes.length - 1}
                      readinessEntry={readinessSummaries?.find((r) => r.intakeId === intake._id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Section: Pipeline ────────────────────────────────────────────────────────

function PipelineSection({ intakes }: { intakes: Intake[] }) {
  const { t } = useTranslation("agent-dashboard");
  const translateCountry = useCountryName();
  const updateStatus = useMutation(api.clientIntakes.updateIntakeStatus);

  const STATUS_LABELS: Record<IntakeStatus, string> = {
    awaiting_documents: t("column.awaiting_documents"),
    documents_received: t("column.documents_received"),
    in_review: t("column.in_review"),
    complete: t("column.complete"),
  };

  const columns: IntakeStatus[] = ["awaiting_documents", "documents_received", "in_review", "complete"];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-primary">Pipeline</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Use the buttons on each card to move clients between stages</p>
      </div>

      {intakes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No clients in the pipeline yet. Add a client to get started.</p>
        </div>
      ) : (
        <div className="-mx-4 sm:mx-0 overflow-x-auto pb-2 sm:pb-0">
        <div className="flex gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4 min-w-[640px] sm:min-w-0 px-4 sm:px-0">
          {columns.map((stage) => {
            const colIntakes = intakes.filter((i) => i.status === stage);
            const s = STATUS_STYLES[stage];
            return (
              <div key={stage} className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", s.dot)} />
                    <span className="text-sm font-semibold text-primary">{STATUS_LABELS[stage]}</span>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", s.badge)}>{colIntakes.length}</span>
                </div>
                {colIntakes.map((intake) => {
                  const days = daysSince(intake.createdAt);
                  const urgent = days >= 7;
                  const warning = days >= 3 && days < 7;
                  return (
                    <article
                      key={intake._id}
                      className={cn("rounded-xl border-2 border-l-4 p-4 shadow-sm transition-shadow hover:shadow-md",
                        urgent ? "border-red-200 border-l-red-500 bg-red-50/60" : warning ? "border-amber-200 border-l-amber-400 bg-amber-50/60" : "border-border border-l-transparent bg-card")}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base text-foreground leading-tight truncate">{intake.clientName}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">{DESTINATION_FLAGS[intake.destination] ?? "🌍"} {translateCountry(intake.destination)}</p>
                        </div>
                        <span className={cn("shrink-0 text-xs font-bold px-2 py-0.5 rounded-full", urgent ? "text-red-700 bg-red-100" : warning ? "text-amber-700 bg-amber-100" : "text-muted-foreground bg-secondary")}>
                          {days === 0 ? "Today" : `${days}d`}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{visaTypeLabel(intake.visaType)} · {intake.documents.length}{requiredDocCount(intake.destination, intake.visaType) > 0 ? `/${requiredDocCount(intake.destination, intake.visaType)}` : ""} docs</p>
                      {/* Quick status buttons */}
                      <div className="flex flex-wrap gap-1">
                        {columns.filter(st => st !== stage).map(st => (
                          <button key={st} type="button"
                            onClick={() => { void updateStatus({ token: intake.token, status: st }).catch(() => toast.error("Update failed.")); }}
                            className="text-xs px-2 py-1 rounded-lg border border-border text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-colors cursor-pointer"
                          >→ {STATUS_LABELS[st]}</button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: Analytics ───────────────────────────────────────────────────────

function AnalyticsSection({ intakes, unreadEnquiries, viewStats }: {
  intakes: Intake[];
  unreadEnquiries: number;
  viewStats: { viewsToday: number; views7d: number; views30d: number } | null | undefined;
}) {
  const { t } = useTranslation("agent-dashboard");
  const translateCountry = useCountryName();

  const topDestination = useMemo(() => {
    if (intakes.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const i of intakes) counts[i.destination] = (counts[i.destination] ?? 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return top ?? null;
  }, [intakes]);

  const completionRate = intakes.length > 0
    ? Math.round((intakes.filter(i => i.status === "complete").length / intakes.length) * 100)
    : 0;

  const stats = [
    { label: t("analytics.total_clients"), value: String(intakes.length), sub: "All-time clients" },
    { label: t("analytics.completion_rate"), value: intakes.length > 0 ? `${completionRate}%` : "—", sub: "Applications completed" },
    { label: t("analytics.top_destination"), value: topDestination ? `${DESTINATION_FLAGS[topDestination] ?? "🌍"} ${translateCountry(topDestination)}` : "—", sub: "Most common destination" },
    { label: "New Enquiries", value: String(unreadEnquiries), sub: "Waiting for your response" },
    { label: "Awaiting Docs", value: String(intakes.filter(i => i.status === "awaiting_documents").length), sub: "Clients to chase" },
    { label: "Ready to Review", value: String(intakes.filter(i => i.status === "documents_received").length), sub: "Documents received" },
  ];

  const stageData = [
    { stage: "awaiting_documents" as IntakeStatus, label: "Awaiting Docs", count: intakes.filter(i => i.status === "awaiting_documents").length, color: "bg-slate-400" },
    { stage: "documents_received" as IntakeStatus, label: "Docs Received", count: intakes.filter(i => i.status === "documents_received").length, color: "bg-amber-400" },
    { stage: "in_review" as IntakeStatus, label: "In Review", count: intakes.filter(i => i.status === "in_review").length, color: "bg-blue-500" },
    { stage: "complete" as IntakeStatus, label: "Complete", count: intakes.filter(i => i.status === "complete").length, color: "bg-emerald-500" },
  ];
  const total = intakes.length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-primary">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Your practice at a glance</p>
      </div>

      {/* Pipeline distribution */}
      {total > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Pipeline Distribution</p>
          {/* Stacked bar */}
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-4">
            {stageData.map((s) => s.count > 0 && (
              <div
                key={s.stage}
                className={cn("transition-all", s.color)}
                style={{ width: `${(s.count / total) * 100}%` }}
                title={`${s.label}: ${s.count}`}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stageData.map((s) => (
              <div key={s.stage} className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", s.color)} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                  <p className="text-lg font-bold text-primary tabular-nums">{s.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile views */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-accent" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profile Views</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Today",    value: viewStats?.viewsToday ?? "—" },
            { label: "7 days",   value: viewStats?.views7d    ?? "—" },
            { label: "30 days",  value: viewStats?.views30d   ?? "—" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-primary tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
          Counted each time an applicant opens your public profile page. Updates live.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-6 hover:shadow-sm transition-shadow">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</p>
            <p className="text-3xl font-semibold text-primary tabular-nums">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Security section */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <LockKeyhole className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-primary">{t("security.title")}</h3>
            <p className="text-sm text-muted-foreground">{t("security.description")}</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            [t("security.item1_title"), t("security.item1_body")],
            [t("security.item2_title"), t("security.item2_body")],
            [t("security.item3_title"), t("security.item3_body")],
          ].map(([title, detail]) => (
            <div key={title} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-background">
              <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-base text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section: Referrals ───────────────────────────────────────────────────────

function ReferralsSection() {
  const { t } = useTranslation("agent-dashboard");
  const stats = useQuery(api.agentReferralCommissions.getMyReferralCommissionStatus, {});
  const ledger = useQuery(api.agentReferralCommissions.getMyReferralCommissionLedger, {});
  const payoutHistory = useQuery(api.agentReferralCommissions.getMyPayoutRequests, {});
  const requestPayout = useMutation(api.agentReferralCommissions.requestPayout);
  const [copied, setCopied] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutAmountStr, setPayoutAmountStr] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const totalPaid = payoutHistory
    ?.filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.amountCents, 0) ?? 0;
  const availableCents = Math.max(0, (stats?.totalCommissionCents ?? 0) - totalPaid);
  const hasPendingRequest = payoutHistory?.some((r) => r.status === "pending") ?? false;

  const handleRequestPayout = async () => {
    const amountCents = Math.round(parseFloat(payoutAmountStr || "0") * 100);
    if (!amountCents || amountCents < 100) {
      toast.error("Enter an amount of at least $1.00.");
      return;
    }
    setSubmittingPayout(true);
    try {
      await requestPayout({ amountCents, notes: payoutNotes.trim() || undefined });
      toast.success("Payout request submitted. The team will process it within 3–5 business days.");
      setShowPayoutForm(false);
      setPayoutAmountStr("");
      setPayoutNotes("");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not submit request. Try again.");
    } finally {
      setSubmittingPayout(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-primary">{t("referral.title")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t("referral.description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{t("referral.signups_label")}</p>
          <p className="text-3xl font-semibold text-primary">{stats?.referredSignupCount ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{t("referral.code_label")}</p>
          <button
            type="button" disabled={!stats?.referralCode}
            onClick={() => {
              if (!stats?.referralCode) return;
              const link = `${window.location.origin}/checklist?ac=${stats.referralCode}`;
              navigator.clipboard.writeText(link).then(() => { setCopied(true); toast.success(t("referral.toast_copied")); setTimeout(() => setCopied(false), 2000); }).catch(() => toast.error(t("referral.toast_copy_failed")));
            }}
            className="flex items-center gap-3 mt-1 cursor-pointer disabled:opacity-50 group"
          >
            <span className="text-2xl font-semibold text-primary font-mono">{stats?.referralCode ?? "—"}</span>
            {stats?.referralCode && (copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />)}
          </button>
          <p className="text-sm text-muted-foreground mt-2">Click to copy your referral link — share it so clients get straight to the free checklist and you get credited when they upgrade</p>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{t("referral.paying_clients")}</p>
            <p className="text-3xl font-semibold text-primary">{stats.payingClientCount}</p>
          </div>
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{t("referral.commission_earned")}</p>
            <p className="text-3xl font-semibold text-accent">{formatCents(stats.totalCommissionCents)}</p>
          </div>
        </div>
      )}

      {/* Payout section */}
      {stats && stats.totalCommissionCents > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Available to withdraw</p>
              <p className="text-3xl font-semibold text-primary">{formatCents(availableCents)}</p>
              {totalPaid > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{formatCents(totalPaid)} already paid out</p>
              )}
            </div>
            {!hasPendingRequest && availableCents >= 100 && !showPayoutForm && (
              <button
                onClick={() => setShowPayoutForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors cursor-pointer shrink-0"
              >
                <CircleDollarSign className="w-3.5 h-3.5" /> Request payout
              </button>
            )}
            {hasPendingRequest && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                <Clock3 className="w-3 h-3" /> Request pending
              </span>
            )}
          </div>

          {showPayoutForm && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Confirm your payout details. Make sure your bank or mobile money account is set in profile settings before requesting.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={payoutAmountStr}
                  onChange={(e) => setPayoutAmountStr(e.target.value)}
                  placeholder={`Max ${formatCents(availableCents)}`}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <textarea
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Optional note for the team (account name, preferred method…)"
                maxLength={500}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
              />
              <div className="flex gap-2">
                <button
                  disabled={submittingPayout}
                  onClick={() => { void handleRequestPayout(); }}
                  className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submittingPayout ? "Submitting…" : "Submit request"}
                </button>
                <button
                  onClick={() => { setShowPayoutForm(false); setPayoutAmountStr(""); setPayoutNotes(""); }}
                  className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Payout history */}
          {payoutHistory && payoutHistory.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Payout history</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-2 text-xs font-semibold text-muted-foreground">Amount</th>
                    <th className="pb-2 text-xs font-semibold text-muted-foreground">Requested</th>
                    <th className="pb-2 text-xs font-semibold text-muted-foreground text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payoutHistory.map((req) => (
                    <tr key={req._id}>
                      <td className="py-2.5 font-semibold tabular-nums text-foreground">{formatCents(req.amountCents)}</td>
                      <td className="py-2.5 text-muted-foreground">{new Date(req.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="py-2.5 text-right">
                        <span className={cn(
                          "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
                          req.status === "paid" ? "bg-green-50 text-green-700 border-green-200" :
                          req.status === "declined" ? "bg-red-50 text-red-600 border-red-200" :
                          "bg-amber-50 text-amber-700 border-amber-200",
                        )}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {ledger && ledger.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{t("referral.recent_commissions")}</p>
          <div className="space-y-3">
            {ledger.slice(0, 5).map((c) => (
              <div key={c._id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">
                  {t("referral.ledger_line", {
                    plan: c.plan === "expert" ? t("referral.plan_expert") : t("referral.plan_pro"),
                    rate: c.commissionRatePercent,
                    date: new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                  })}
                </span>
                <span className="font-semibold text-base text-foreground">{formatCents(c.commissionCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: License ─────────────────────────────────────────────────────────

function LicenseSection() {
  const { t } = useTranslation("agent-dashboard");
  const TIER_LABELS: Record<string, string> = {
    agent_listing: t("tier.agent_listing"),
    agent_featured: t("tier.agent_featured"),
    agency_white_label: t("tier.agency_white_label"),
  };
  const myProfile = useQuery(api.agents.getMyProfile, {});
  const redeemCode = useMutation(api.licenseCodes.redeemLicenseCode);
  const openBillingPortal = useAction(api.stripe.createAgentBillingPortalSession);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const navigate = useNavigate();

  const handleOpenBillingPortal = async () => {
    setOpeningPortal(true);
    try {
      const { url } = await openBillingPortal({});
      window.location.href = url;
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not open billing portal. Try again.");
      setOpeningPortal(false);
    }
  };

  const handleRedeem = async () => {
    if (!code.trim()) { toast.error(t("license.toast_need_code")); return; }
    setRedeeming(true);
    try {
      const result = await redeemCode({ code });
      toast.success(t("license.toast_activated", { plan: TIER_LABELS[result.plan] ?? result.plan }));
      setCode("");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("license.toast_error"));
    } finally { setRedeeming(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-primary">{t("license.title")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t("license.description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{t("license.current_plan")}</p>
          <p className="text-2xl font-semibold text-primary">{myProfile?.tier ? TIER_LABELS[myProfile.tier] ?? myProfile.tier : t("license.free")}</p>
          {myProfile?.verified && (
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified agent
            </span>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{t("license.code_label")}</p>
          <div className="flex flex-col gap-3">
            <input
              value={code} onChange={(e) => setCode(e.target.value)}
              placeholder={t("license.placeholder")} disabled={redeeming}
              className="w-full px-4 py-3 text-base rounded-xl border border-input bg-background font-mono disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button disabled={redeeming} onClick={() => { void handleRedeem(); }} className="cursor-pointer w-full sm:w-auto">
              {redeeming ? t("license.redeeming") : t("license.redeem")}
            </Button>
          </div>
        </div>
        {/* Billing portal — only shown when agent has a Stripe subscription */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Billing & Invoices</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Download invoices, update your payment method, or manage your subscription.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={openingPortal}
            onClick={() => { void handleOpenBillingPortal(); }}
            className="cursor-pointer w-full"
          >
            {openingPortal ? "Opening…" : "Manage Subscription"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary p-6 text-primary-foreground">
        <h3 className="font-serif text-xl font-semibold mb-2">{t("firstmin.h2")}</h3>
        <p className="text-sm text-primary-foreground/70 mb-5">{t("firstmin.subtitle")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["1", t("firstmin.step1_title"), t("firstmin.step1_body")],
            ["2", t("firstmin.step2_title"), t("firstmin.step2_body")],
            ["3", t("firstmin.step3_title"), t("firstmin.step3_body")],
            ["4", t("firstmin.step4_title"), t("firstmin.step4_body")],
          ].map(([step, title, detail]) => (
            <div key={step} className="rounded-xl border border-white/15 bg-white/10 p-4">
              <div className="w-8 h-8 rounded-md bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center mb-3">{step}</div>
              <h4 className="font-semibold text-base">{title}</h4>
              <p className="text-sm text-primary-foreground/70 mt-1">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AI Banner (shown once on Overview until dismissed) ──────────────────────

function AIBanner({ mode, onTryIt }: { mode: "agent" | "business"; onTryIt: () => void }) {
  const key = `vc_ai_banner_${mode}`;
  const [visible, setVisible] = useState(() => localStorage.getItem(key) !== "1");

  const dismiss = () => {
    localStorage.setItem(key, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">
          {mode === "agent" ? "AI Casework Assistant" : "AI HR Assistant"}{" "}
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 bg-primary/8 rounded px-1.5 py-0.5 ml-1 align-middle">New</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug hidden sm:block">
          {mode === "agent"
            ? "Ask who needs chasing, get a pipeline summary, or draft a client follow-up."
            : "Check cohort readiness, flag stalled employees, or draft an HR follow-up."}
        </p>
      </div>
      <button
        onClick={onTryIt}
        className="shrink-0 text-xs font-semibold text-primary-foreground bg-primary rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity cursor-pointer"
      >
        Try it →
      </button>
      <button
        onClick={dismiss}
        className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Section: AI Assistant ────────────────────────────────────────────────────

function AISection() {
  return (
    <div className="h-[calc(100vh-10rem)] min-h-130">
      <AgentAIChat mode="agent" className="h-full" />
    </div>
  );
}

// ─── Section: Overview ────────────────────────────────────────────────────────

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function OverviewSection({
  intakes,
  contactRequests,
  kpis,
  newUploads,
  agentName,
  onConvertToClient,
  onGoToClients,
  commissionStats,
  onGoToEarnings,
  onGoToAI,
}: {
  intakes: Intake[];
  contactRequests: ContactRequest[];
  kpis: { label: string; value: string | number; detail: string; Icon: LucideIcon }[];
  newUploads: number;
  agentName?: string;
  onConvertToClient: (payload: ConvertPayload) => void;
  onGoToClients: () => void;
  commissionStats: { totalCommissionCents: number; payingClientCount: number; referredSignupCount: number; referralCode: string | null } | null;
  onGoToEarnings: () => void;
  onGoToAI: () => void;
}) {
  const { t } = useTranslation("agent-dashboard");
  const markRead = useMutation(api.agents.markContactRequestRead);
  const demandSignals = useQuery(api.agents.getMyDemandSignals, {});

  const actions = useMemo(() => {
    const items: { key: string; title: string; detail: string; priority: string; urgent: boolean }[] = [];
    for (const req of contactRequests.filter((r) => !r.read).slice(0, 5)) {
      items.push({
        key: `req-${req._id}`,
        title: t("actions.new_enquiry", { name: req.fromName || req.fromEmail || t("actions.an_applicant") }),
        detail: req.message || t("actions.sent_via_marketplace"),
        priority: "New",
        urgent: true,
      });
    }
    for (const intake of intakes) {
      const days = daysSince(intake.createdAt);
      if (intake.status === "awaiting_documents" && days >= 3) {
        items.push({ key: `chase-${intake._id}`, title: `Chase ${intake.clientName}`, detail: `${days} days — still no documents uploaded`, priority: days >= 7 ? "Urgent" : "Overdue", urgent: days >= 7 });
      }
      if (intake.status === "documents_received") {
        items.push({ key: `review-${intake._id}`, title: `Review ${intake.clientName}`, detail: "Documents received — ready for your review", priority: "Ready", urgent: false });
      }
    }
    return items.slice(0, 8);
  }, [intakes, contactRequests, t]);

  const totalUrgent = actions.filter(a => a.urgent).length;
  const allClear = actions.length === 0 && newUploads === 0;
  const firstName = agentName?.split(" ")[0];

  return (
    <div className="space-y-6">
      <AIBanner mode="agent" onTryIt={onGoToAI} />
      {/* Daily greeting */}
      <div className="rounded-2xl bg-[#0f2040] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-white/70 text-sm font-medium mb-1">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white leading-snug">
            {greetingWord()}{firstName ? `, ${firstName}` : ""}.
          </h2>
          <p className="text-white/80 text-base mt-1">
            {allClear
              ? "Everything is under control — no actions needed right now."
              : totalUrgent > 0
              ? `${totalUrgent} matter${totalUrgent > 1 ? "s" : ""} need your attention today.`
              : `${actions.length} task${actions.length > 1 ? "s" : ""} waiting for you.`}
          </p>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 flex-wrap">
          <div className="text-center">
            <p className="text-3xl font-bold text-[#d4a726]">{intakes.length}</p>
            <p className="text-sm text-white/80 mt-1 uppercase tracking-wider font-medium">Clients</p>
          </div>
          <div className="w-px h-10 bg-white/15" />
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{intakes.filter(i => i.status === "complete").length}</p>
            <p className="text-sm text-white/80 mt-1 uppercase tracking-wider font-medium">Complete</p>
          </div>
          {newUploads > 0 && (
            <>
              <div className="w-px h-10 bg-white/15" />
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-300">{newUploads}</p>
                <p className="text-sm text-white/80 mt-1 uppercase tracking-wider font-medium">New docs</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, i) => {
          const palettes = [
            { bar: "bg-blue-500",   icon: "bg-blue-50 text-blue-600",   border: "border-t-blue-500" },
            { bar: "bg-amber-500",  icon: "bg-amber-50 text-amber-600",  border: "border-t-amber-500" },
            { bar: "bg-emerald-500",icon: "bg-emerald-50 text-emerald-600", border: "border-t-emerald-500" },
            { bar: "bg-violet-500", icon: "bg-violet-50 text-violet-600",border: "border-t-violet-500" },
          ];
          const p = palettes[i % palettes.length];
          return (
            <div key={kpi.label} className={cn("rounded-2xl border-2 border-t-4 border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow", p.border)}>
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", p.icon)}>
                  <kpi.Icon className="w-5 h-5" />
                </div>
                <div className={cn("w-2 h-2 rounded-full mt-1.5", p.bar)} />
              </div>
              <p className="text-4xl font-bold text-primary mb-1 tabular-nums">{kpi.value}</p>
              <p className="text-base font-semibold text-foreground">{kpi.label}</p>
              <p className="text-sm text-muted-foreground mt-1">{kpi.detail}</p>
            </div>
          );
        })}
      </div>

      {/* Earnings summary bar — shown only when commission data is available */}
      {commissionStats !== null && (
        <button
          type="button"
          onClick={onGoToEarnings}
          className="w-full rounded-2xl border border-accent/25 bg-accent/5 hover:bg-accent/10 transition-colors p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Your Earnings</p>
              <p className="text-2xl font-bold text-accent tabular-nums leading-none">{formatCents(commissionStats.totalCommissionCents)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">total commission earned</p>
            </div>
          </div>
          <div className="flex items-center gap-6 sm:border-l sm:border-border sm:pl-6 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Paying clients</p>
              <p className="text-xl font-bold text-primary tabular-nums">{commissionStats.payingClientCount}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Total signups</p>
              <p className="text-xl font-bold text-primary tabular-nums">{commissionStats.referredSignupCount}</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline ml-auto shrink-0">
              View full breakdown <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>
      )}

      {/* Demand signals */}
      {demandSignals && (
        <div className={cn(
          "rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
          demandSignals.isFeatured
            ? "border-amber-300/60 bg-amber-50/60"
            : "border-border bg-[#0f2040] text-white",
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
              demandSignals.isFeatured ? "bg-amber-100 text-amber-600" : "bg-white/10 text-[#d4a726]",
            )}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className={cn("text-sm font-semibold mb-0.5", demandSignals.isFeatured ? "text-amber-800" : "text-white")}>
                {demandSignals.totalSearches > 0
                  ? `${demandSignals.totalSearches.toLocaleString()} applicant${demandSignals.totalSearches !== 1 ? "s" : ""} searched your routes this month`
                  : "No searches recorded for your routes yet — it's early."}
              </p>
              <p className={cn("text-xs leading-relaxed", demandSignals.isFeatured ? "text-amber-700" : "text-white/70")}>
                {demandSignals.isFeatured
                  ? "Your profile appears at the top of these search results."
                  : demandSignals.totalSearches > 0
                  ? "Your profile is listed below featured agents in these results. Upgrade to appear first."
                  : `We track every search for ${demandSignals.specialisations.join(", ")}. You'll see demand here as it builds.`}
              </p>
            </div>
          </div>
          {!demandSignals.isFeatured && (
            <button
              onClick={() => { window.location.href = "/payment?product=agent&plan=agent_featured&billing=monthly"; }}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4a726] text-[#0f2040] text-xs font-bold hover:bg-[#d4a726]/90 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" /> Get Featured
            </button>
          )}
        </div>
      )}

      {/* Today's actions */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Clock3 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-primary">{t("actions.heading")}</h3>
            <p className="text-sm text-muted-foreground">Tasks that need attention today</p>
          </div>
        </div>

        {actions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-base text-foreground">All caught up</p>
            <p className="text-sm text-muted-foreground mt-1">No actions needed right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => {
              const isEnquiry = action.key.startsWith("req-");
              const req = isEnquiry ? contactRequests.find(r => `req-${r._id}` === action.key) : undefined;
              return (
                <div
                  key={action.key}
                  className={cn(
                    "rounded-xl border p-4",
                    action.urgent
                      ? "border-red-200 bg-red-50"
                      : "border-border bg-background"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-base text-foreground leading-tight">{action.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{action.detail}</p>
                    </div>
                    <span className={cn(
                      "shrink-0 text-xs font-bold px-2.5 py-1 rounded-full",
                      action.priority === "Urgent" ? "bg-red-100 text-red-700" :
                      action.priority === "New"    ? "bg-blue-100 text-blue-700" :
                      action.priority === "Overdue"? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    )}>
                      {action.priority}
                    </span>
                  </div>
                  {isEnquiry && req ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          onConvertToClient({
                            contactRequestId: req._id,
                            clientName: req.fromName,
                            clientEmail: req.fromEmail,
                          });
                          void markRead({ id: req._id }).catch(() => {});
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#0f2040] text-white hover:bg-[#1a3060] transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Convert to Client
                      </button>
                      <button
                        type="button"
                        onClick={() => void markRead({ id: req._id }).catch(() => toast.error("Couldn't mark this as read."))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground border border-border hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        Mark read
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onGoToClients}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-border text-foreground hover:bg-muted/50 hover:border-primary/20 transition-colors cursor-pointer"
                    >
                      Go to Client <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent activity */}
      {(() => {
        const recentDocs = intakes
          .flatMap((i) => i.documents.map((d) => ({ ...d, clientName: i.clientName, intakeId: i._id })))
          .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
          .slice(0, 5);
        if (recentDocs.length === 0) return null;
        return (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-primary">Recent Activity</h3>
                <p className="text-sm text-muted-foreground">Latest document uploads</p>
              </div>
            </div>
            <ol className="space-y-0">
              {recentDocs.map((doc, idx) => {
                const hoursAgo = Math.floor((Date.now() - new Date(doc.uploadedAt).getTime()) / 3_600_000);
                const timeStr = hoursAgo === 0 ? "Just now" : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;
                return (
                  <li key={doc._id} className={cn("flex items-start gap-4 py-3.5", idx < recentDocs.length - 1 && "border-b border-border")}>
                    <div className="relative mt-0.5 shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug truncate">
                        {doc.clientName} <span className="font-normal text-muted-foreground">uploaded</span> {doc.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.fileName}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums pt-0.5">{timeStr}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })()}

      {/* Client portal preview */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">{t("portal.eyebrow")}</p>
            <h3 className="font-serif text-xl font-semibold text-primary mb-2">{t("portal.title")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t("portal.description")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[t("portal.feature1"), t("portal.feature2"), t("portal.feature3"), t("portal.feature4")].map((f) => (
                <div key={f} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto w-full max-w-xs rounded-[2rem] border border-primary/20 bg-primary p-3 shadow-xl relative">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest bg-accent text-white px-2.5 py-0.5 rounded-full">
              {t("portal.sample_preview")}
            </span>
            <div className="rounded-[1.4rem] bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">{t("portal.file_progress")}</p>
              <h4 className="font-serif text-lg font-semibold text-primary mb-3">{t("portal.sample_visa")}</h4>
              <div className="h-2 rounded-full bg-secondary mb-3 overflow-hidden">
                <div className="h-full w-[62%] rounded-full bg-accent" />
              </div>
              <div className="space-y-2">
                {[
                  { label: t("portal.checklist1"), done: true },
                  { label: t("portal.checklist2"), done: true },
                  { label: t("portal.checklist3"), done: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                    {item.done ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <UploadCloud className="w-4 h-4 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  section,
  setSection,
  unread,
  onClose,
  onSignOut,
}: {
  section: Section;
  setSection: (s: Section) => void;
  unread: number;
  onClose?: () => void;
  onSignOut: () => void;
}) {
  const { t } = useTranslation("agent-dashboard");
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#0f2040] text-white">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-serif font-semibold text-white text-base leading-none">VisaClear</p>
            <p className="text-[10px] text-white/70 tracking-widest uppercase mt-0.5">Agent Portal</p>
          </div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ id, labelKey, Icon }) => {
          const active = section === id;
          const badge = id === "overview" && unread > 0 ? unread : null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { setSection(id); onClose?.(); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer group",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/75 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", active ? "text-[#d4a726]" : "text-white/65 group-hover:text-white/90")} />
              <span className="font-semibold text-[15px] leading-none">{t(labelKey) || id}</span>
              {badge && (
                <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold shrink-0">{badge}</span>
              )}
              {active && <div className="ml-auto w-1 h-5 rounded-full bg-[#d4a726] shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">Back to site</span>
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">{t("header.sign_out")}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Inner dashboard (requires Convex auth) ───────────────────────────────────

function DashboardInner() {
  const { t } = useTranslation("agent-dashboard");
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [convertPayload, setConvertPayload] = useState<ConvertPayload | undefined>(undefined);

  const handleConvertToClient = (payload: ConvertPayload) => {
    setConvertPayload(payload);
    setSection("clients");
  };

  const myProfile = useQuery(api.agents.getMyProfile, {});
  const trialStatus = useQuery(api.agentTrials.getMyTrialStatus, {});
  const viewStats = useQuery(api.agents.getMyProfileViewStats, {});
  const intakesRaw = useQuery(api.clientIntakes.listMyIntakes, {}) as Intake[] | undefined;
  const intakes = useMemo(() => intakesRaw ?? [], [intakesRaw]);
  const contactRequests = (useQuery(api.agents.getMyContactRequests, {}) ?? []) as ContactRequest[];
  const commissionStats = useQuery(api.agentReferralCommissions.getMyReferralCommissionStatus, {});
  const readinessSummaries = (useQuery(api.caseReadiness.getAgentReadinessSummary, {}) ?? []) as ReadinessSummaryEntry[];
  const markDashboardViewed = useMutation(api.agents.markDashboardViewed);

  const lastViewedAt = myProfile?.lastDashboardViewAt;
  const newUploads = useMemo(() => {
    if (!lastViewedAt) return 0;
    let count = 0;
    for (const intake of intakes) {
      for (const doc of intake.documents) {
        if (new Date(doc.uploadedAt) > new Date(lastViewedAt)) count += 1;
      }
    }
    return count;
  }, [intakes, lastViewedAt]);

  // Marks the dashboard "viewed" when the agent actually leaves, not the
  // instant it loads — firing on mount meant the "N new uploads since last
  // visit" badge cleared itself within one network round trip of arriving,
  // defeating the point of a since-you-were-last-here summary. Firing on
  // unmount instead keeps the count stable for the whole visit.
  useEffect(() => {
    if (!myProfile) return;
    return () => {
      void markDashboardViewed({}).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfile?._id]);

  const unreadEnquiries = contactRequests.filter((r) => !r.read).length;

  const kpis: { label: string; value: string | number; detail: string; Icon: LucideIcon }[] = [
    { label: t("kpi.total_clients"), value: intakes.length, detail: t("kpi.total_clients_detail", { count: intakes.filter(i => i.status === "complete").length }), Icon: Users },
    { label: t("kpi.awaiting"), value: intakes.filter(i => i.status === "awaiting_documents").length, detail: t("kpi.awaiting_detail"), Icon: ClipboardCheck },
    { label: t("kpi.ready"), value: intakes.filter(i => i.status === "documents_received").length, detail: t("kpi.ready_detail"), Icon: BadgeCheck },
    { label: t("kpi.enquiries"), value: unreadEnquiries, detail: newUploads > 0 ? `${newUploads} new upload${newUploads > 1 ? "s" : ""} since last visit` : t("kpi.enquiries_detail_marketplace"), Icon: CircleDollarSign },
  ];

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 sticky top-0 h-screen">
        <Sidebar section={section} setSection={setSection} unread={unreadEnquiries + newUploads} onSignOut={() => { void handleSignOut(); }} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "tween", duration: 0.22 }}
              className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden"
            >
              <Sidebar section={section} setSection={setSection} unread={unreadEnquiries + newUploads} onClose={() => setSidebarOpen(false)} onSignOut={() => { void handleSignOut(); }} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-white/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary transition-colors cursor-pointer"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-serif text-xl font-semibold text-primary capitalize">{NAV.find(n => n.id === section)?.id || "Overview"}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Agent Operating System</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {unreadEnquiries > 0 && (
                <button type="button" onClick={() => setSection("overview")}
                  className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadEnquiries}</span>
                </button>
              )}
              <NotificationBell />
              <button
                type="button"
                onClick={() => navigate("/agents/marketplace-leads")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-secondary border border-border transition-colors cursor-pointer"
                title="Lead Marketplace"
              >
                <Inbox className="w-4 h-4" />
                <span className="hidden sm:inline">Leads</span>
              </button>
              <Button size="default" className="cursor-pointer gap-2" onClick={() => setSection("clients")}>
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">{t("header.add_client")}</span>
              </Button>
              <button
                type="button"
                onClick={() => { void handleSignOut(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 border border-border transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Trial banner — shown whenever admin has granted an active trial */}
          {trialStatus && (
            <div className={cn(
              "mb-5 rounded-2xl border p-4 sm:p-5 flex items-start gap-4 relative overflow-hidden",
              trialStatus.daysLeft <= 7
                ? "border-amber-200 bg-gradient-to-br from-amber-50/80 to-red-50/40"
                : "border-accent/25 bg-gradient-to-br from-accent/5 to-purple-500/5",
            )}>
              <div className={cn(
                "absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl",
                trialStatus.daysLeft <= 7
                  ? "bg-linear-to-r from-amber-400 to-red-500"
                  : "bg-linear-to-r from-accent to-purple-500",
              )} />
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                trialStatus.daysLeft <= 7 ? "bg-amber-500" : "bg-accent",
              )}>
                {trialStatus.daysLeft <= 7
                  ? <Zap className="w-5 h-5 text-white" />
                  : <Star className="w-5 h-5 text-white" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-primary">
                    {trialStatus.daysLeft <= 7 ? "Trial Ending Soon" : `${trialStatus.plan === "agent_listing" ? "Listing" : trialStatus.plan === "agent_featured" ? "Featured" : "White Label"} Plan Trial`}
                  </span>
                  <span className={cn(
                    "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full text-white",
                    trialStatus.daysLeft <= 7
                      ? "bg-linear-to-r from-amber-500 to-red-500"
                      : "bg-linear-to-r from-accent to-purple-500",
                  )}>
                    {trialStatus.daysLeft <= 7 ? `${trialStatus.daysLeft} days left` : "Free Trial"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  {trialStatus.daysLeft <= 7
                    ? <>Your trial expires on <strong>{new Date(trialStatus.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>. Subscribe now to keep your placement, client pipeline, and listing without interruption.</>
                    : <>You have full access to <strong>{trialStatus.plan === "agent_listing" ? "Listing" : trialStatus.plan === "agent_featured" ? "Featured" : "White Label"}</strong> features. Your trial runs until <strong>{new Date(trialStatus.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong> — <strong>{trialStatus.daysLeft} days</strong> from today. No payment until you subscribe.</>
                  }
                </p>
                <button
                  onClick={() => navigate("/pricing?agent=true")}
                  className={cn(
                    "mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer border-none transition-opacity hover:opacity-80",
                    trialStatus.daysLeft <= 7
                      ? "bg-amber-500 text-white"
                      : "bg-accent text-white",
                  )}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Subscribe to keep access →
                </button>
              </div>
              <div className="hidden sm:flex flex-col items-center text-center shrink-0 min-w-[52px]">
                <span className={cn(
                  "text-2xl font-extrabold leading-none",
                  trialStatus.daysLeft <= 7 ? "text-amber-600" : "text-accent",
                )}>{trialStatus.daysLeft}</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">days left</span>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {section === "overview"  && <OverviewSection intakes={intakes} contactRequests={contactRequests} kpis={kpis} newUploads={newUploads} agentName={myProfile?.fullName} onConvertToClient={handleConvertToClient} onGoToClients={() => setSection("clients")} commissionStats={commissionStats ?? null} onGoToEarnings={() => setSection("referrals")} onGoToAI={() => setSection("ai")} />}
              {section === "clients"   && <ClientsSection intakes={intakes} convertPayload={convertPayload} onConvertHandled={() => setConvertPayload(undefined)} readinessSummaries={readinessSummaries} />}
              {section === "pipeline"  && <PipelineSection intakes={intakes} />}
              {section === "analytics" && <AnalyticsSection intakes={intakes} unreadEnquiries={unreadEnquiries} viewStats={viewStats} />}
              {section === "referrals" && <ReferralsSection />}
              {section === "license"   && <LicenseSection />}
              {section === "ai"        && <AISection />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function AgentDashboardPreviewPage() {
  const navigate = useNavigate();
  useSeo({
    title: "Agent Dashboard",
    description: "VisaClear agent operating system: manage clients, track documents, and grow your visa consultancy.",
  });

  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="space-y-4 w-full max-w-sm px-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
          <div className="hidden md:flex md:w-80 lg:w-96 bg-[#0f2040] flex-col justify-between p-10 shrink-0">
            <div>
              <div className="flex items-center gap-3 mb-10">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="font-serif text-xl font-semibold text-white">VisaClear</span>
              </div>
              <h2 className="font-serif text-3xl font-semibold text-white leading-snug mb-4">Agent Operating System</h2>
              <p className="text-white/80 text-sm leading-relaxed mb-8">Manage your clients, track documents, and grow your consultancy — all in one place.</p>
              <div className="space-y-4">
                {[
                  { icon: Users, text: "Secure client document portals" },
                  { icon: ClipboardCheck, text: "Pipeline tracking by stage" },
                  { icon: CircleDollarSign, text: "Referral commissions" },
                  { icon: Shield, text: "CISA-certified privacy model" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#d4a726]" />
                    </div>
                    <p className="text-white/85 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate("/agents")}
                className="flex items-center gap-2 text-white/65 hover:text-white transition-colors cursor-pointer text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Browse agent marketplace
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-white/65 hover:text-white transition-colors cursor-pointer text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to VisaClear
              </button>
              <p className="text-white/60 text-xs pt-2">© {new Date().getFullYear()} Vericore Ltd.</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col px-6 py-8 bg-gray-50">
            {/* Mobile back link — left panel is hidden on small screens */}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="md:hidden flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 cursor-pointer self-start"
            >
              <ArrowLeft className="w-4 h-4" /> Back to VisaClear
            </button>
            <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <LogIn className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-primary mb-2">Sign In</h2>
                <p className="text-sm text-muted-foreground">Access your agent dashboard</p>
              </div>
              <AuthAccessPanel returnPath="/agents/dashboard" hideDemoOption />
            </div>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <DashboardInner />
      </Authenticated>
    </>
  );
}
