import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { cn } from "@/lib/utils.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { Doc } from "@/convex/_generated/dataModel.js";
import {
  ArrowLeft, Globe, MapPin, Calendar, Shield, AlertTriangle,
  CheckCircle2, Clock, ChevronRight, FileText, Plane, AlertCircle,
  RefreshCw, Info,
} from "lucide-react";

// ── EU jurisdiction config (mirrors convex/visaStatus.ts JURISDICTIONS) ──────
const EU_JURISDICTIONS: Record<string, {
  label: string; flag: string; hostCountry: string;
  rule: "eu_ltr" | "rolling_year"; maxConsecutiveDays: number; maxTotalDays: number;
  warningConsecutiveDays: number; warningTotalDays: number;
}> = {
  eu_ltr:  { label: "EU Long-Term Residency",              flag: "🇪🇺", hostCountry: "EU Member State", rule: "eu_ltr", maxConsecutiveDays: 182, maxTotalDays: 304, warningConsecutiveDays: 150, warningTotalDays: 270 },
  de_nbe:  { label: "Niederlassungserlaubnis",             flag: "🇩🇪", hostCountry: "Germany",         rule: "eu_ltr", maxConsecutiveDays: 182, maxTotalDays: 304, warningConsecutiveDays: 150, warningTotalDays: 270 },
  fr_cr:   { label: "Carte de résident",                   flag: "🇫🇷", hostCountry: "France",          rule: "eu_ltr", maxConsecutiveDays: 182, maxTotalDays: 304, warningConsecutiveDays: 150, warningTotalDays: 270 },
  nl_vvotd:{ label: "Verblijfsvergunning voor onbepaalde tijd", flag: "🇳🇱", hostCountry: "Netherlands", rule: "eu_ltr", maxConsecutiveDays: 182, maxTotalDays: 304, warningConsecutiveDays: 150, warningTotalDays: 270 },
  pl_kp:   { label: "Karta Pobytu",                        flag: "🇵🇱", hostCountry: "Poland",          rule: "eu_ltr", maxConsecutiveDays: 182, maxTotalDays: 304, warningConsecutiveDays: 150, warningTotalDays: 270 },
  pl_perm: { label: "Zezwolenie na pobyt stały",           flag: "🇵🇱", hostCountry: "Poland",          rule: "eu_ltr", maxConsecutiveDays: 182, maxTotalDays: 304, warningConsecutiveDays: 150, warningTotalDays: 270 },
  lt_lgl:  { label: "Leidimas gyventi",                    flag: "🇱🇹", hostCountry: "Lithuania",       rule: "eu_ltr", maxConsecutiveDays: 182, maxTotalDays: 304, warningConsecutiveDays: 150, warningTotalDays: 270 },
  be_ts:   { label: "Titre de séjour",                     flag: "🇧🇪", hostCountry: "Belgium",         rule: "eu_ltr", maxConsecutiveDays: 182, maxTotalDays: 304, warningConsecutiveDays: 150, warningTotalDays: 270 },
  at_nb:   { label: "Niederlassungsbewilligung",           flag: "🇦🇹", hostCountry: "Austria",         rule: "eu_ltr", maxConsecutiveDays: 182, maxTotalDays: 304, warningConsecutiveDays: 150, warningTotalDays: 270 },
  se_ut:   { label: "Uppehållstillstånd",                  flag: "🇸🇪", hostCountry: "Sweden",          rule: "eu_ltr", maxConsecutiveDays: 182, maxTotalDays: 304, warningConsecutiveDays: 150, warningTotalDays: 270 },
};

const EU_DOCUMENT_CHECKLIST = [
  { id: "passport",    label: "Valid national passport (covers permit + 6 months)",      required: true },
  { id: "permit",      label: "Current residence permit card (not expired)",              required: true },
  { id: "photos",      label: "Biometric photos (35×45 mm, as per national standard)",   required: true },
  { id: "proof_addr",  label: "Proof of registered address (utility bill / lease)",       required: true },
  { id: "employment",  label: "Employer letter or contract (shows stable income)",        required: true },
  { id: "payslips",    label: "3 months payslips + bank statements",                     required: true },
  { id: "tax",         label: "Tax clearance / ZUS statement (Poland) or equivalent",    required: false },
  { id: "travel_log",  label: "Printed travel history (every absence recorded)",         required: true },
  { id: "fees",        label: "Application fee receipt",                                  required: false },
];

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_VISA: Doc<"visa_status"> = {
  _id: "demo_visa" as Doc<"visa_status">["_id"],
  _creationTime: Date.now() - 86400000 * 730,
  userId: "demo_user" as Doc<"visa_status">["userId"],
  jurisdiction: "pl_kp",
  visaType: "Temporary Residence — Work",
  hostCountry: "Poland",
  grantDate: "2022-03-15",
  expiryDate: "2026-03-14",
  sponsorEmployer: "Warsaw Tech Sp. z o.o.",
  notes: "Biometric card valid for 3 years. Renewal application due 3 months before expiry.",
  active: true,
  createdAt: new Date(Date.now() - 86400000 * 730).toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEMO_TRIPS: Doc<"travel_trips">[] = [
  {
    _id: "trip1" as Doc<"travel_trips">["_id"],
    _creationTime: Date.now(),
    userId: "demo_user" as Doc<"travel_trips">["userId"],
    destination: "Nigeria", destinationEmoji: "🇳🇬",
    departureDate: "2025-12-20", returnDate: "2026-01-10", daysAbsent: 21,
    purpose: "Family", notes: undefined, createdAt: "", updatedAt: "",
  },
  {
    _id: "trip2" as Doc<"travel_trips">["_id"],
    _creationTime: Date.now(),
    userId: "demo_user" as Doc<"travel_trips">["userId"],
    destination: "Germany", destinationEmoji: "🇩🇪",
    departureDate: "2026-03-05", returnDate: "2026-03-10", daysAbsent: 5,
    purpose: "Business", notes: undefined, createdAt: "", updatedAt: "",
  },
  {
    _id: "trip3" as Doc<"travel_trips">["_id"],
    _creationTime: Date.now(),
    userId: "demo_user" as Doc<"travel_trips">["userId"],
    destination: "United Kingdom", destinationEmoji: "🇬🇧",
    departureDate: "2026-05-01", returnDate: "2026-05-07", daysAbsent: 6,
    purpose: "Holiday", notes: undefined, createdAt: "", updatedAt: "",
  },
];

// ── Helper functions ──────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(s: string): string {
  return new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr + "T00:00:00Z").getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Compute max consecutive days absent from a list of trips
function maxConsecutiveAbsence(trips: Doc<"travel_trips">[]): number {
  if (!trips.length) return 0;
  return Math.max(...trips.map((t) => t.daysAbsent));
}

// Compute total absence days within the 5-year qualifying window from grantDate
function totalAbsenceInQualifyingPeriod(
  trips: Doc<"travel_trips">[],
  grantDate: string,
): number {
  const windowEnd = todayStr();
  return trips.reduce((sum, t) => {
    if (t.returnDate >= grantDate && t.departureDate <= windowEnd) return sum + t.daysAbsent;
    return sum;
  }, 0);
}

// Compute Schengen usage: days in any rolling 180-day window ending today
function computeSchengen180(trips: Doc<"travel_trips">[]): {
  used: number;
  remaining: number;
  windowStart: string;
  windowEnd: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowStart = new Date(today.getTime() - 179 * 86400000);
  const wsStr = windowStart.toISOString().slice(0, 10);
  const weStr = today.toISOString().slice(0, 10);

  let used = 0;
  for (const trip of trips) {
    if (trip.returnDate < wsStr || trip.departureDate > weStr) continue;
    const start = trip.departureDate < wsStr ? wsStr : trip.departureDate;
    const end = trip.returnDate > weStr ? weStr : trip.returnDate;
    const dep = new Date(start + "T00:00:00Z");
    const ret = new Date(end + "T00:00:00Z");
    used += Math.max(0, Math.ceil((ret.getTime() - dep.getTime()) / 86400000));
  }

  return { used, remaining: Math.max(90 - used, 0), windowStart: wsStr, windowEnd: weStr };
}

// ── Small UI components ───────────────────────────────────────────────────────
function StatusPill({ status }: { status: "safe" | "warning" | "critical" | "info" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold",
      status === "safe"     && "bg-emerald-50 text-emerald-700 border border-emerald-200",
      status === "warning"  && "bg-amber-50 text-amber-700 border border-amber-200",
      status === "critical" && "bg-red-50 text-red-600 border border-red-200",
      status === "info"     && "bg-blue-50 text-blue-700 border border-blue-100",
    )}>
      {status === "safe" && "Safe"}
      {status === "warning" && "Warning"}
      {status === "critical" && "Critical"}
      {status === "info" && "Info"}
    </span>
  );
}

function MetricTile({ label, value, sub, color = "blue" }: {
  label: string; value: React.ReactNode; sub?: string;
  color?: "blue" | "green" | "amber" | "red" | "slate";
}) {
  const accent: Record<string, string> = {
    blue: "text-blue-700", green: "text-emerald-700",
    amber: "text-amber-700", red: "text-red-600", slate: "text-slate-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className={cn("text-2xl font-black tracking-tight leading-none tabular-nums", accent[color])}>{value}</div>
      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-2">{label}</div>
      {sub && <div className="text-[11px] font-medium text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function GaugeBar({ used, limit, warning }: { used: number; limit: number; warning: number }) {
  const pct = Math.min(used / limit, 1) * 100;
  const color = used >= limit ? "#DC2626" : used >= warning ? "#D97706" : "#059669";
  return (
    <div>
      <div className="flex justify-between text-[10px] font-semibold mb-1">
        <span style={{ color }}>
          {used} days used
        </span>
        <span className="text-slate-400">{limit} max</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>0</span>
        <span className="text-amber-600 inline-flex items-center gap-1">{warning} <AlertTriangle className="w-3.5 h-3.5 shrink-0" /></span>
        <span>{limit}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconBg = "bg-blue-50", iconColor = "text-blue-600", badge, children }: {
  title: string; icon: React.ElementType; iconBg?: string; iconColor?: string;
  badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", iconBg)}>
            <Icon className={cn("w-3.5 h-3.5", iconColor)} />
          </div>
          <span className="text-sm font-bold text-slate-900 tracking-tight">{title}</span>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EuropeanTrackerPage() {
  useSeo({
    title: "European Residence Tracker — VisaClear",
    description: "Track your EU residence permit, absence days, Schengen 90/180 usage, and document readiness in one place.",
  });

  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated } = useDemoAuth();

  const visaStatus = useQuery(api.visaStatus.getMyVisaStatus, isDemoAuthenticated ? "skip" : {});
  const trips = useQuery(api.travelLog.getMyTrips, isDemoAuthenticated ? "skip" : {});

  const resolvedVisa = isDemoAuthenticated ? DEMO_VISA : visaStatus;
  const resolvedTrips = isDemoAuthenticated ? DEMO_TRIPS : (trips ?? []);

  const loading = !isDemoAuthenticated && (visaStatus === undefined || trips === undefined);

  const jInfo = resolvedVisa ? EU_JURISDICTIONS[resolvedVisa.jurisdiction] : null;
  const isEUJurisdiction = !!jInfo;

  // ── Computed metrics ──────────────────────────────────────────────────────
  const daysToExpiry = resolvedVisa ? daysUntil(resolvedVisa.expiryDate) : 0;
  const renewalWindowStart = resolvedVisa ? addDays(resolvedVisa.expiryDate, -90) : null;
  const inRenewalWindow = renewalWindowStart ? renewalWindowStart <= todayStr() : false;
  const renewalDaysLeft = renewalWindowStart ? daysUntil(renewalWindowStart) : null;

  const maxConsec = useMemo(() => maxConsecutiveAbsence(resolvedTrips), [resolvedTrips]);
  const totalQualifying = useMemo(
    () => resolvedVisa ? totalAbsenceInQualifyingPeriod(resolvedTrips, resolvedVisa.grantDate) : 0,
    [resolvedTrips, resolvedVisa],
  );
  const schengen = useMemo(() => computeSchengen180(resolvedTrips), [resolvedTrips]);

  const jMaxConsec = jInfo?.maxConsecutiveDays ?? 182;
  const jWarnConsec = jInfo?.warningConsecutiveDays ?? 150;
  const jMaxTotal = jInfo?.maxTotalDays ?? 304;
  const jWarnTotal = jInfo?.warningTotalDays ?? 270;

  const consecStatus: "safe" | "warning" | "critical" =
    maxConsec >= jMaxConsec ? "critical" : maxConsec >= jWarnConsec ? "warning" : "safe";
  const totalStatus: "safe" | "warning" | "critical" =
    totalQualifying >= jMaxTotal ? "critical" : totalQualifying >= jWarnTotal ? "warning" : "safe";
  const schengenStatus: "safe" | "warning" | "critical" =
    schengen.used >= 90 ? "critical" : schengen.used >= 75 ? "warning" : "safe";

  // Persisted to localStorage — this was previously in-memory only, so a
  // refresh silently wiped every box a user had checked with no warning.
  const EU_DOC_STORAGE_KEY = "vc_eu_tracker_checked_docs";
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(EU_DOC_STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const toggleDoc = (id: string) =>
    setCheckedDocs((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      try {
        localStorage.setItem(EU_DOC_STORAGE_KEY, JSON.stringify([...s]));
      } catch {
        // Private browsing / storage disabled — checklist still works for
        // this session, it just won't survive a refresh. Not worth erroring.
      }
      return s;
    });
  const docProgress = Math.round((checkedDocs.size / EU_DOCUMENT_CHECKLIST.length) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF2F7]">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900">European Residence Tracker</span>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF2F7]">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight">European Residence Tracker</div>
            {resolvedVisa && jInfo && (
              <div className="text-[11px] text-slate-500 hidden sm:block">
                {jInfo.flag} {jInfo.hostCountry} · {jInfo.label}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate("/dashboard/immigration-status")}
          className="h-8 px-3 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Full immigration status</span>
          <span className="sm:hidden">Status</span>
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* ── No visa configured ── */}
        {!resolvedVisa && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">No EU permit configured</h2>
            <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
              Set up your EU residence permit in the Immigration Status page. Choose from Poland, Germany, France, Netherlands, and more.
            </p>
            <button
              onClick={() => navigate("/dashboard/immigration-status")}
              className="h-10 px-6 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              Set up visa <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Non-EU visa configured ── */}
        {resolvedVisa && !isEUJurisdiction && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Your current visa is not an EU jurisdiction</p>
              <p className="text-sm text-amber-700 mt-1">
                Your configured permit ({resolvedVisa.hostCountry} — {resolvedVisa.visaType}) is not an EU residence permit. This tracker is designed for EU member state permits.
              </p>
              <button
                onClick={() => navigate("/dashboard/immigration-status")}
                className="mt-3 text-sm font-semibold text-amber-700 underline underline-offset-2 cursor-pointer"
              >
                View your immigration status instead →
              </button>
            </div>
          </div>
        )}

        {/* ── Renewal window alert ── */}
        {resolvedVisa && isEUJurisdiction && inRenewalWindow && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900">Renewal window is open — apply now</p>
              <p className="text-sm text-red-700 mt-0.5">
                Your {jInfo!.label} expires in <strong>{daysToExpiry} days</strong> ({fmtDate(resolvedVisa.expiryDate)}).
                Applications should be submitted well before expiry to maintain your legal status.
              </p>
            </div>
          </div>
        )}

        {/* ── Renewal approaching banner (not yet in window) ── */}
        {resolvedVisa && isEUJurisdiction && !inRenewalWindow && renewalDaysLeft !== null && renewalDaysLeft <= 120 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">Renewal window opens in {renewalDaysLeft} days</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Your {jInfo!.label} renewal window opens on <strong>{fmtDate(renewalWindowStart!)}</strong>. Start preparing documents now.
              </p>
            </div>
          </div>
        )}

        {/* ── Metric strip ── */}
        {resolvedVisa && isEUJurisdiction && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricTile
              label="Permit expires"
              value={`${Math.max(daysToExpiry, 0)}`}
              sub={`days · ${fmtDate(resolvedVisa.expiryDate)}`}
              color={daysToExpiry < 90 ? "red" : daysToExpiry < 180 ? "amber" : "blue"}
            />
            <MetricTile
              label="Max single absence"
              value={`${maxConsec}d`}
              sub={`of ${jMaxConsec} allowed`}
              color={consecStatus === "critical" ? "red" : consecStatus === "warning" ? "amber" : "green"}
            />
            <MetricTile
              label="Total absence"
              value={`${totalQualifying}d`}
              sub={`of ${jMaxTotal} over 5 yrs`}
              color={totalStatus === "critical" ? "red" : totalStatus === "warning" ? "amber" : "green"}
            />
            <MetricTile
              label="Schengen 90/180"
              value={`${schengen.used}d`}
              sub={`${schengen.remaining} remaining`}
              color={schengenStatus === "critical" ? "red" : schengenStatus === "warning" ? "amber" : "green"}
            />
          </div>
        )}

        {/* ── Card: Permit status ── */}
        {resolvedVisa && isEUJurisdiction && (
          <SectionCard
            title="Residence Permit"
            icon={Shield}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            badge={
              <span className={cn(
                "text-[10.5px] font-bold px-2 py-0.5 rounded-full border",
                daysToExpiry < 90 ? "bg-red-50 text-red-600 border-red-200" :
                daysToExpiry < 180 ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-emerald-50 text-emerald-700 border-emerald-200",
              )}>
                {daysToExpiry < 90 ? "Expires soon" : daysToExpiry < 180 ? "Renew in 6 months" : "Valid"}
              </span>
            }
          >
            <div className="p-5 grid sm:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: "Country", value: `${jInfo!.flag} ${jInfo!.hostCountry}` },
                { label: "Permit type", value: jInfo!.label },
                { label: "Visa category", value: resolvedVisa.visaType },
                { label: "Grant date", value: fmtDate(resolvedVisa.grantDate) },
                { label: "Expiry date", value: fmtDate(resolvedVisa.expiryDate), highlight: daysToExpiry < 180 },
                { label: "Days to expiry", value: `${Math.max(daysToExpiry, 0)} days`, highlight: daysToExpiry < 90 },
                ...(resolvedVisa.sponsorEmployer ? [{ label: "Sponsor", value: resolvedVisa.sponsorEmployer }] : []),
                { label: "Renewal window opens", value: renewalWindowStart ? fmtDate(renewalWindowStart) : "—" },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-slate-500 text-xs">{label}</span>
                  <span className={cn("font-semibold text-xs text-right", highlight ? "text-red-600" : "text-slate-900")}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            {resolvedVisa.notes && (
              <div className="mx-5 mb-5 flex items-start gap-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                <span>{resolvedVisa.notes}</span>
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Card: EU LTR absence compliance ── */}
        {resolvedVisa && isEUJurisdiction && (
          <SectionCard
            title="EU Residency Absence Compliance"
            icon={MapPin}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          >
            <div className="p-5 space-y-5">
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
                <span>
                  EU Long-Term Residency (Directive 2003/109/EC) requires that you have not been absent from {jInfo!.hostCountry} for more than <strong>6 consecutive months</strong> or <strong>10 months total</strong> over your 5-year qualifying period. Exceeding either limit may reset your qualifying period.
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Consecutive */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Longest single absence</span>
                    <StatusPill status={consecStatus} />
                  </div>
                  <GaugeBar used={maxConsec} limit={jMaxConsec} warning={jWarnConsec} />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Based on your longest logged trip. Any single absence over {jMaxConsec} days may invalidate your qualifying period.
                  </p>
                </div>

                {/* Total */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total absence (5-year period)</span>
                    <StatusPill status={totalStatus} />
                  </div>
                  <GaugeBar used={totalQualifying} limit={jMaxTotal} warning={jWarnTotal} />
                  <p className="text-[11px] text-slate-500 mt-2">
                    Total days absent since your permit was granted ({fmtDate(resolvedVisa.grantDate)}). Maximum {jMaxTotal} days over the qualifying period.
                  </p>
                </div>
              </div>

              {/* Trip summary */}
              {resolvedTrips.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Recent trips ({resolvedTrips.length} total)
                  </div>
                  <div className="space-y-1.5">
                    {resolvedTrips.slice(0, 5).map((trip) => (
                      <div key={trip._id} className="flex items-center justify-between gap-2 py-2 px-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <Plane className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-medium text-slate-700 truncate">
                            {trip.destinationEmoji ?? "🌍"} {trip.destination}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-slate-400">{fmtDate(trip.departureDate)} – {fmtDate(trip.returnDate)}</span>
                          <span className={cn(
                            "text-[11px] font-bold",
                            trip.daysAbsent >= jMaxConsec ? "text-red-600" : trip.daysAbsent >= jWarnConsec ? "text-amber-600" : "text-slate-600",
                          )}>
                            {trip.daysAbsent}d
                          </span>
                        </div>
                      </div>
                    ))}
                    {resolvedTrips.length > 5 && (
                      <button
                        onClick={() => navigate("/dashboard/immigration-status")}
                        className="text-xs text-blue-600 font-semibold mt-1 hover:underline cursor-pointer"
                      >
                        View all {resolvedTrips.length} trips →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {resolvedTrips.length === 0 && (
                <div className="py-6 text-center border border-dashed border-slate-200 rounded-xl">
                  <MapPin className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600 mb-1">No trips logged</p>
                  <p className="text-xs text-slate-400 mb-3">Log every absence to track your EU residency compliance accurately.</p>
                  <button
                    onClick={() => navigate("/dashboard/immigration-status")}
                    className="h-8 px-4 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Log trips →
                  </button>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* ── Card: Schengen 90/180 tracker ── */}
        {resolvedVisa && isEUJurisdiction && (
          <SectionCard
            title="Schengen Area — 90/180 Day Tracker"
            icon={Plane}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            badge={<StatusPill status={schengenStatus} />}
          >
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-800">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-600" />
                <span>
                  As a third-country national, you may be subject to the 90-day limit in any 180-day rolling period when visiting Schengen countries outside your country of residence. This tracker uses your logged trip days as an approximation.
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <div className={cn(
                    "text-3xl font-black tabular-nums",
                    schengenStatus === "critical" ? "text-red-600" : schengenStatus === "warning" ? "text-amber-600" : "text-purple-700",
                  )}>
                    {schengen.used}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">days used</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <div className={cn(
                    "text-3xl font-black tabular-nums",
                    schengen.remaining <= 0 ? "text-red-600" : schengen.remaining <= 15 ? "text-amber-600" : "text-emerald-700",
                  )}>
                    {Math.max(schengen.remaining, 0)}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">days left</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <div className="text-3xl font-black tabular-nums text-slate-700">90</div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">day limit</div>
                </div>
              </div>

              <GaugeBar used={schengen.used} limit={90} warning={75} />

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>
                  Rolling 180-day window: {fmtDate(schengen.windowStart)} — {fmtDate(schengen.windowEnd)}
                </span>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Card: Document readiness ── */}
        {resolvedVisa && isEUJurisdiction && (
          <SectionCard
            title="Renewal Document Readiness"
            icon={FileText}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            badge={
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {docProgress}% ready
              </span>
            }
          >
            <div className="p-5 space-y-3">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${docProgress}%` }}
                />
              </div>

              {EU_DOCUMENT_CHECKLIST.map((doc) => {
                const checked = checkedDocs.has(doc.id);
                return (
                  <button
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-left"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                      checked ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300",
                    )}>
                      {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={cn("text-xs flex-1", checked ? "line-through text-slate-400" : "text-slate-700")}>
                      {doc.label}
                    </span>
                    {doc.required && !checked && (
                      <span className="text-[10px] font-bold text-red-500 shrink-0">Required</span>
                    )}
                  </button>
                );
              })}

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                <span>
                  Requirements vary by country and permit type. Always verify with your local immigration authority or legal representative before submitting.
                </span>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Bottom nav ── */}
        <div className="flex items-center justify-between pt-2 pb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => navigate("/dashboard/immigration-status")}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors cursor-pointer"
          >
            Full immigration status
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
