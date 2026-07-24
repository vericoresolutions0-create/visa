import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { trustedHTML } from "@/lib/trusted-types.ts";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";
import { canUseDocumentVault, canUseRejectionAnalyser } from "@/lib/plan-gates.ts";
import {
  ArrowLeft, Globe, Plus, Pencil, Trash2, Download, Printer,
  ChevronDown, CheckCircle2, AlertTriangle, Clock, Lock,
  MapPin, Calendar, Building2, X, Save, FileText, Shield, ArrowRight,
} from "lucide-react";

// ── Jurisdiction config ──────────────────────────────────────────────────────
// EU LTR rule: Directive 2003/109/EC — max 6 consecutive months absent,
// max 10 months total over 5 years. National permits follow same floor.
// All existing value keys are preserved so stored records continue to resolve.
const JURISDICTIONS = [
  // ── United Kingdom ──────────────────────────────────────────────────────
  { value: "uk_ilr",         label: "🇬🇧 United Kingdom — Indefinite Leave to Remain (ILR)", absenceLabel: "180 days / rolling 12-month period", limit: 180, warning: 150, rule: "rolling_year" },
  { value: "uk_flr",         label: "🇬🇧 United Kingdom — Further Leave to Remain (FLR)", absenceLabel: "180 days / rolling 12-month period", limit: 180, warning: 150, rule: "rolling_year" },

  // ── EU — generic fallback ───────────────────────────────────────────────
  { value: "eu_ltr",         label: "🇪🇺 EU — Long-Term Residency (generic)", absenceLabel: "6 months consecutive / 10 months total over 5 yrs", limit: 304, warning: 270, rule: "eu_ltr" },

  // ── EU Member States A–Z ────────────────────────────────────────────────
  { value: "at_nb",          label: "🇦🇹 Austria — Niederlassungsbewilligung", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "be_ts",          label: "🇧🇪 Belgium — Titre de séjour / Verblijfstitel", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "bg_dp",          label: "🇧🇬 Bulgaria — Разрешение за постоянно пребиваване", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "hr_bp",          label: "🇭🇷 Croatia — Boravišna dozvola", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "cy_pr",          label: "🇨🇾 Cyprus — Άδεια Μόνιμης Κατοικίας", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "cz_pp",          label: "🇨🇿 Czech Republic — Povolení k trvalému pobytu", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "dk_op",          label: "🇩🇰 Denmark — Opholdstilladelse (permanent)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "ee_ep",          label: "🇪🇪 Estonia — Elamisluba (alaline)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "fi_op",          label: "🇫🇮 Finland — Oleskelulupa (pysyvä)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "fr_cr",          label: "🇫🇷 France — Carte de résident (10 ans)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "de_nbe",         label: "🇩🇪 Germany — Niederlassungserlaubnis", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "de_nbe_eu",      label: "🇩🇪 Germany — Erlaubnis zum Daueraufenthalt-EU", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "gr_at",          label: "🇬🇷 Greece — Άδεια Διαμονής (αόριστης διάρκειας)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "hu_at",          label: "🇭🇺 Hungary — Tartózkodási engedély (állandó)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "ie_stamp4",      label: "🇮🇪 Ireland — Stamp 4 (Long-Term Residence)", absenceLabel: "6 months consecutive / 10 months total over 5 yrs", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "ie_stamp4eu",    label: "🇮🇪 Ireland — Stamp 4 EUFam", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "it_ps",          label: "🇮🇹 Italy — Permesso di soggiorno (lungo periodo)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "lv_up",          label: "🇱🇻 Latvia — Uzturēšanās atļauja (pastāvīgā)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "lt_lgl",         label: "🇱🇹 Lithuania — Leidimas nuolat gyventi", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "lu_as",          label: "🇱🇺 Luxembourg — Autorisation de séjour (perm.)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "mt_rc",          label: "🇲🇹 Malta — Residency Card (permanent)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "nl_vvotd",       label: "🇳🇱 Netherlands — Verblijfsvergunning onbepaalde tijd", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "pl_kp",          label: "🇵🇱 Poland — Karta Pobytu (czasowy)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "pl_perm",        label: "🇵🇱 Poland — Zezwolenie na pobyt stały", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "pt_ar",          label: "🇵🇹 Portugal — Autorização de Residência (perm.)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "ro_sr",          label: "🇷🇴 Romania — Drept de ședere permanentă", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "sk_pd",          label: "🇸🇰 Slovakia — Povolenie na trvalý pobyt", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "si_dp",          label: "🇸🇮 Slovenia — Dovoljenje za stalno prebivanje", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "es_tar",         label: "🇪🇸 Spain — Tarjeta de Residencia (larga duración)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "se_ut",          label: "🇸🇪 Sweden — Uppehållstillstånd (permanent)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },

  // ── EEA (non-EU) ────────────────────────────────────────────────────────
  { value: "is_dv",          label: "🇮🇸 Iceland — Dvalarleyfi (durable)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "li_at",          label: "🇱🇮 Liechtenstein — Aufenthaltsbewilligung (B)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "no_op",          label: "🇳🇴 Norway — Oppholdstillatelse (permanent)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },
  { value: "ch_au",          label: "🇨🇭 Switzerland — Ausweis C (Niederlassungsbewilligung)", absenceLabel: "6 months consecutive / 10 months total", limit: 304, warning: 270, rule: "eu_ltr" },

  // ── Other major destinations ─────────────────────────────────────────────
  { value: "au_pr",          label: "🇦🇺 Australia — Permanent Residence", absenceLabel: "5-year RRV travel facility", limit: 365, warning: 300, rule: "rolling_year" },
  { value: "ca_pr",          label: "🇨🇦 Canada — Permanent Residence (COPR)", absenceLabel: "730 days / 5-year period", limit: 730, warning: 600, rule: "rolling_year" },
  { value: "us_gc",          label: "🇺🇸 United States — Green Card", absenceLabel: "180 days continuous absence triggers scrutiny", limit: 180, warning: 150, rule: "rolling_year" },
  { value: "ae_res",         label: "🇦🇪 UAE — Residence Visa", absenceLabel: "180 days outside UAE cancels visa", limit: 180, warning: 150, rule: "rolling_year" },
  { value: "sg_pr",          label: "🇸🇬 Singapore — Permanent Residence (PR)", absenceLabel: "No statutory limit but re-entry permit required", limit: 365, warning: 300, rule: "rolling_year" },

  { value: "other",          label: "🌍 Other jurisdiction", absenceLabel: "See local rules", limit: 180, warning: 150, rule: "rolling_year" },
] as const;

type JKey = typeof JURISDICTIONS[number]["value"];

const PURPOSES = ["Holiday", "Business", "Family", "Medical", "Education", "Other"];
const COUNTRY_FLAGS: Record<string, string> = {
  "Nigeria": "🇳🇬", "Ghana": "🇬🇭", "United Kingdom": "🇬🇧", "United States": "🇺🇸",
  "Germany": "🇩🇪", "France": "🇫🇷", "Spain": "🇪🇸", "Italy": "🇮🇹",
  "Canada": "🇨🇦", "Australia": "🇦🇺", "India": "🇮🇳", "Pakistan": "🇵🇰",
  "Kenya": "🇰🇪", "South Africa": "🇿🇦", "Netherlands": "🇳🇱", "Portugal": "🇵🇹",
  "Brazil": "🇧🇷", "China": "🇨🇳", "Japan": "🇯🇵", "UAE": "🇦🇪",
};

function flagFor(country: string): string {
  return COUNTRY_FLAGS[country] ?? "🌍";
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(s: string): string {
  return new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function monthsBetween(from: string, to: string): number {
  const a = new Date(from), b = new Date(to);
  return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
}
function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr + "T00:00:00Z").getTime() - new Date().setHours(0,0,0,0)) / 86400000);
}
function fmtYear(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").getFullYear().toString().slice(-2);
}

// ── Small components ─────────────────────────────────────────────────────────
function Chip({ children, color = "neutral" }: { children: React.ReactNode; color?: "green" | "amber" | "red" | "blue" | "neutral" | "purple" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold",
      color === "green" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
      color === "amber" && "bg-amber-50 text-amber-700 border border-amber-200",
      color === "red" && "bg-red-50 text-red-600 border border-red-200",
      color === "blue" && "bg-blue-50 text-blue-700",
      color === "purple" && "bg-purple-50 text-purple-700",
      color === "neutral" && "bg-slate-100 text-slate-600",
    )}>
      {children}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
}

function CardHeader({ title, icon: Icon, iconBg = "bg-blue-50", iconColor = "text-blue-600", right }: {
  title: string; icon: React.ElementType; iconBg?: string; iconColor?: string; right?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        </div>
        <span className="text-sm font-bold text-slate-900 tracking-tight">{title}</span>
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

function MetricCard({ label, value, sub, color = "blue" }: {
  label: string; value: React.ReactNode; sub?: string; color?: "blue" | "green" | "amber" | "purple" | "slate";
}) {
  const accent = {
    blue: "text-blue-700",
    green: "text-emerald-700",
    amber: "text-amber-700",
    purple: "text-purple-700",
    slate: "text-slate-700",
  }[color];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className={cn("text-2xl font-black tracking-tight leading-none tabular-nums", accent)}>{value}</div>
      <div className="text-[12px] font-bold text-slate-700 uppercase tracking-wider mt-2">{label}</div>
      {sub && <div className="text-[12px] font-medium text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── SVG Ring ─────────────────────────────────────────────────────────────────
function ProgressRing({ percent, label, sub, color = "#1A56DB" }: {
  percent: number; label: string; sub: string; color?: string;
}) {
  const r = 44, c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(percent / 100, 1));
  return (
    <div className="relative w-[104px] h-[104px] shrink-0">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="#E2E8F0" strokeWidth="7" />
        <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 52 52)" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-black text-slate-900 leading-none">{label}</span>
        <span className="text-[9px] text-slate-400 mt-0.5">{sub}</span>
      </div>
    </div>
  );
}

// ── Semicircle gauge ─────────────────────────────────────────────────────────
function AbsenceGauge({ used, limit, warning }: { used: number; limit: number; warning: number }) {
  const r = 62, arcLen = Math.PI * r;
  const pct = Math.min(used / limit, 1);
  const fillLen = arcLen * pct;
  const color = used >= limit ? "#DC2626" : used >= warning ? "#D97706" : "#059669";
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="160" height="92" viewBox="0 0 160 92">
        <path d={`M 18 86 A ${r} ${r} 0 0 1 142 86`} fill="none" stroke="#E2E8F0" strokeWidth="11" strokeLinecap="round" />
        <path d={`M 18 86 A ${r} ${r} 0 0 1 142 86`} fill="none" stroke={color} strokeWidth="11"
          strokeLinecap="round" strokeDasharray={arcLen} strokeDashoffset={arcLen - fillLen} />
        <text x="80" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0F172A"
          fontFamily="-apple-system,Roboto,Arial,sans-serif">{used}</text>
        <text x="80" y="80" textAnchor="middle" fontSize="10" fill="#94A3B8"
          fontFamily="-apple-system,Roboto,Arial,sans-serif">of {limit} days used</text>
      </svg>
      <div className="w-full px-1">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>0</span>
          <span className="text-amber-600 inline-flex items-center gap-0.5">{warning} <AlertTriangle className="w-3.5 h-3.5 shrink-0" /></span>
          <span>{limit}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

// ── ILR Timeline ─────────────────────────────────────────────────────────────
function ILRTimeline({ grantDate, qualifyingYears }: { grantDate: string; qualifyingYears: number }) {
  const todayStr = today();
  const steps = Array.from({ length: qualifyingYears + 1 }, (_, i) => {
    if (i === 0) return { label: "Granted", date: grantDate };
    const d = new Date(grantDate + "T00:00:00Z");
    d.setFullYear(d.getFullYear() + i);
    const ds = d.toISOString().slice(0, 10);
    return { label: i === qualifyingYears ? "Eligible" : `Yr ${i}`, date: ds };
  });

  const doneUntil = steps.filter((s) => s.date <= todayStr).length - 1;
  const progressPct = ((doneUntil + 1) / (steps.length - 1)) * 36; // rough %

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
        {qualifyingYears}-Year Timeline
      </div>
      <div className="relative flex">
        {/* Track */}
        <div className="absolute top-[11px] left-3 right-3 h-0.5 bg-slate-200" />
        <div
          className="absolute top-[11px] left-3 h-0.5 bg-blue-600 transition-all"
          style={{ width: `${progressPct}%` }}
        />
        {steps.map((step, i) => {
          const done = step.date <= todayStr;
          const isNow = !done && (i === 0 || steps[i - 1].date <= todayStr);
          const isTarget = i === steps.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 relative z-10">
              <div className={cn(
                "w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center text-[9px] font-bold",
                done && "bg-blue-600 border-blue-600 text-white",
                isNow && !done && "bg-white border-blue-600 text-blue-600 shadow-[0_0_0_3px_#EBF2FF]",
                !done && !isNow && !isTarget && "bg-white border-slate-200 text-slate-400",
                isTarget && !done && "bg-white border-emerald-500 text-emerald-600",
              )}>
                {done ? "✓" : isTarget ? "★" : i === 0 ? "●" : i}
              </div>
              <div className={cn(
                "text-[9.5px] font-semibold text-center leading-tight",
                done ? "text-slate-500" : isNow ? "text-blue-600" : isTarget ? "text-emerald-600" : "text-slate-400",
              )}>
                {step.label}
              </div>
              <div className={cn("text-[8.5px] text-center", isNow ? "text-blue-500" : "text-slate-300")}>
                {isNow ? "Now" : `'${fmtYear(step.date)}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PDF export ────────────────────────────────────────────────────────────────
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function printTravelHistory(
  trips: Doc<"travel_trips">[],
  visaStatus: Doc<"visa_status"> | null,
  userName: string,
) {
  const rows = trips.map((t) => `
    <tr>
      <td>${esc(t.destinationEmoji ?? "🌍")} ${esc(t.destination)}</td>
      <td>${fmtDate(t.departureDate)}</td>
      <td>${fmtDate(t.returnDate)}</td>
      <td style="text-align:center;font-weight:700">${t.daysAbsent}</td>
      <td>${esc(t.purpose ?? "—")}</td>
      <td>${esc(t.notes ?? "—")}</td>
    </tr>`).join("");

  const totalDays = trips.reduce((s, t) => s + t.daysAbsent, 0);
  const jurisdiction = JURISDICTIONS.find((j) => j.value === visaStatus?.jurisdiction);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Travel History — VisaClear</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid #0A193C; }
  .header h1 { font-size: 18px; font-weight: 800; color: #0A193C; margin: 0 0 2px; }
  .header p { font-size: 11px; color: #64748B; margin: 0; }
  .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; }
  .meta-box label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #94A3B8; display: block; margin-bottom: 3px; }
  .meta-box span { font-size: 13px; font-weight: 700; color: #0F172A; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #0A193C; color: white; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; padding: 8px 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #F1F5F9; font-size: 11px; color: #334155; vertical-align: top; }
  tr:nth-child(even) td { background: #FAFBFC; }
  .total { background: #F5F0E4 !important; font-weight: 700; color: #0A193C !important; }
  .footer { margin-top: 24px; font-size: 10px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 12px; }
  .note { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 10px 12px; font-size: 11px; color: #78350F; margin-top: 16px; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>VisaClear — Travel History Report</h1>
    <p>Prepared for: <strong>${esc(userName)}</strong> &nbsp;·&nbsp; Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
  </div>
  <div style="text-align:right;font-size:11px;color:#64748B">
    <div style="font-weight:700;color:#0A193C;font-size:13px">VisaClear</div>
    <div>by Vericore Ltd</div>
  </div>
</div>
<div class="meta">
  <div class="meta-box">
    <label>Visa Type</label>
    <span>${esc(visaStatus?.visaType ?? "Not set")}</span>
  </div>
  <div class="meta-box">
    <label>Host Country</label>
    <span>${esc(visaStatus?.hostCountry ?? "Not set")}</span>
  </div>
  <div class="meta-box">
    <label>Route</label>
    <span>${esc(jurisdiction?.label.replace(/^.* — /, "") ?? "Not set")}</span>
  </div>
  <div class="meta-box">
    <label>Visa Grant Date</label>
    <span>${visaStatus ? fmtDate(visaStatus.grantDate) : "—"}</span>
  </div>
  <div class="meta-box">
    <label>Visa Expiry Date</label>
    <span>${visaStatus ? fmtDate(visaStatus.expiryDate) : "—"}</span>
  </div>
  <div class="meta-box">
    <label>Total Days Absent</label>
    <span>${totalDays} days across ${trips.length} trip${trips.length !== 1 ? "s" : ""}</span>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th>Destination</th>
      <th>Departure</th>
      <th>Return</th>
      <th>Days Out</th>
      <th>Purpose</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr>
      <td colspan="3" style="font-weight:700;background:#F5F0E4;color:#0A193C">Total</td>
      <td style="font-weight:800;background:#F5F0E4;color:#0A193C;text-align:center">${totalDays}</td>
      <td colspan="2" style="background:#F5F0E4"></td>
    </tr>
  </tbody>
</table>
<div class="note">
  <strong>Note:</strong> This report is based on trips you have manually logged in VisaClear.
  It does not constitute legal advice. Verify all dates against your passport stamps before
  submitting to any immigration authority or legal representative.
</div>
<div class="footer">
  VisaClear by Vericore Ltd &nbsp;·&nbsp; This document was generated from your personal travel log &nbsp;·&nbsp; visaclear.app
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { toast.error("Allow pop-ups to generate the PDF."); return; }
  w.document.write(trustedHTML(html));
  w.document.close();
}

// ── Visa setup form ────────────────────────────────────────────────────────
function VisaSetupForm({ onSave, initial }: {
  onSave: (data: {
    jurisdiction: string; visaType: string; hostCountry: string;
    grantDate: string; expiryDate: string; sponsorEmployer?: string; notes?: string;
  }) => void;
  initial?: Doc<"visa_status"> | null;
}) {
  // Empty by default for a new visa — forces a conscious choice instead of
  // silently pre-selecting the first jurisdiction in the list (previously
  // defaulted to "uk_ilr", so anyone who didn't notice the dropdown already
  // had a value could save the wrong country's rules without ever choosing).
  const [jurisdiction, setJurisdiction] = useState(initial?.jurisdiction ?? "");
  const [visaType, setVisaType] = useState(initial?.visaType ?? "");
  const [hostCountry, setHostCountry] = useState(initial?.hostCountry ?? "");
  const [grantDate, setGrantDate] = useState(initial?.grantDate ?? "");
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? "");
  const [sponsor, setSponsor] = useState(initial?.sponsorEmployer ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const jInfo = JURISDICTIONS.find((j) => j.value === jurisdiction);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jurisdiction || !visaType.trim() || !hostCountry.trim() || !grantDate || !expiryDate) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ jurisdiction, visaType, hostCountry, grantDate, expiryDate, sponsorEmployer: sponsor || undefined, notes: notes || undefined });
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "block text-xs font-semibold text-slate-600 mb-1.5";
  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-900 placeholder:text-slate-400";
  const selectClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-900 appearance-none";

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="p-5 space-y-4">
      <div>
        <label className={labelClass}>Jurisdiction *</label>
        <div className="relative">
          <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} className={cn(selectClass, !jurisdiction && "text-slate-400")} required>
            <option value="" disabled>Choose your jurisdiction…</option>
            {JURISDICTIONS.map((j) => (
              <option key={j.value} value={j.value} className="text-slate-900">{j.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {jInfo && (
          <p className="text-[11px] text-slate-500 mt-1.5">
            Absence limit: <strong>{jInfo.absenceLabel}</strong>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Visa type *</label>
          <input value={visaType} onChange={(e) => setVisaType(e.target.value)} placeholder="e.g. Skilled Worker" className={inputClass} maxLength={100} />
        </div>
        <div>
          <label className={labelClass}>Host country *</label>
          <input value={hostCountry} onChange={(e) => setHostCountry(e.target.value)} placeholder="e.g. United Kingdom" className={inputClass} maxLength={100} />
        </div>
        <div>
          <label className={labelClass}>Grant date *</label>
          <input type="date" value={grantDate} onChange={(e) => setGrantDate(e.target.value)} className={inputClass} max={today()} />
        </div>
        <div>
          <label className={labelClass}>Expiry date *</label>
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} min={grantDate || undefined} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Sponsor / employer <span className="font-normal text-slate-400">(optional)</span></label>
        <input value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="e.g. Meridian Tech Ltd" className={inputClass} maxLength={200} />
      </div>

      <div>
        <label className={labelClass}>Notes <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000}
          placeholder="Any extra context about this visa..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none text-slate-900 placeholder:text-slate-400" />
      </div>

      <button type="submit" disabled={saving}
        className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
        <Save className="w-4 h-4" />
        {saving ? "Saving…" : "Save visa status"}
      </button>
    </form>
  );
}

// ── Trip form ─────────────────────────────────────────────────────────────────
function TripForm({ onSave, onCancel, initial }: {
  onSave: (data: {
    destination: string; destinationEmoji?: string; departureDate: string;
    returnDate: string; purpose?: string; notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
  initial?: Doc<"travel_trips"> | null;
}) {
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [departureDate, setDepartureDate] = useState(initial?.departureDate ?? "");
  const [returnDate, setReturnDate] = useState(initial?.returnDate ?? "");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !departureDate || !returnDate) {
      toast.error("Destination and both dates are required.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        destination: destination.trim(),
        destinationEmoji: flagFor(destination.trim()),
        departureDate,
        returnDate,
        purpose: purpose || undefined,
        notes: notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "block text-xs font-semibold text-slate-600 mb-1.5";
  const inputClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-900 placeholder:text-slate-400";
  const selectClass = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-900 appearance-none";

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="p-4 space-y-3 bg-slate-50 border-b border-slate-100">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Destination *</label>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Nigeria" className={inputClass} maxLength={100} />
        </div>
        <div>
          <label className={labelClass}>Left host country *</label>
          <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className={inputClass} max={today()} />
        </div>
        <div>
          <label className={labelClass}>Returned *</label>
          <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className={inputClass} min={departureDate || undefined} max={today()} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Purpose</label>
          <div className="relative">
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className={selectClass}>
              <option value="">Select purpose…</option>
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={inputClass} maxLength={500} />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="h-9 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
          {saving ? "Saving…" : initial ? "Save changes" : "Add trip"}
        </button>
        <button type="button" onClick={onCancel} className="h-9 px-4 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Document readiness — real, interactive checklist ────────────────────────
// One collapsed row per item; expanding it reveals the exact control that
// writes to convex/visaStatus.ts's updateDocumentChecklist. Every value shown
// here — the ready/not-ready state, the detail text, the overall percent —
// comes from api.visaStatus.getDocumentReadiness, never a constant.
type ReadinessItem = { key: string; label: string; ready: boolean; detail: string; percent?: number };
type DocumentReadiness = { items: ReadinessItem[]; overallPercent: number; yearsElapsed: number };

const READINESS_ICONS: Record<string, React.ElementType> = {
  passport: FileText,
  employment: Building2,
  travelLog: MapPin,
  lifeInUk: Shield,
  english: Globe,
};

function DocReadinessRow({
  icon: Icon, ready, label, detail, expanded, onToggle, children, editable = true,
}: {
  icon: React.ElementType; ready: boolean; label: string; detail: string;
  expanded: boolean; onToggle: () => void; children?: React.ReactNode; editable?: boolean;
}) {
  return (
    <div className="border-b border-slate-50 last:border-0">
      <button
        type="button"
        onClick={editable ? onToggle : undefined}
        className={cn("w-full flex items-center gap-2.5 py-2.5 text-left", editable ? "cursor-pointer" : "cursor-default")}
      >
        <Icon className={cn("w-4 h-4 shrink-0", ready ? "text-emerald-500" : "text-slate-400")} />
        <span className="flex-1 text-xs text-slate-700">{label}</span>
        <span className={cn("text-[11px] font-semibold shrink-0", ready ? "text-emerald-600" : "text-slate-400")}>{detail}</span>
        {editable && (
          <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 text-slate-300 transition-transform", expanded && "rotate-180")} />
        )}
      </button>
      {expanded && children && <div className="pb-3.5 pl-6.5 pr-1">{children}</div>}
    </div>
  );
}

function EditorActions({ onSave, onCancel, saving, disabled }: {
  onSave: () => void; onCancel: () => void; saving: boolean; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <button type="button" onClick={onSave} disabled={saving || disabled}
        className="h-7 px-3 bg-blue-600 text-white text-[11px] font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={onCancel} className="h-7 px-3 text-[11px] font-medium text-slate-500 hover:text-slate-700">
        Cancel
      </button>
    </div>
  );
}

function PassportEditor({ initial, onSave, saving, onCancel }: {
  initial: string | undefined; onSave: (date: string) => void; saving: boolean; onCancel: () => void;
}) {
  const [date, setDate] = useState(initial ?? "");
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Passport expiry date</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
        className="h-8 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-900" />
      <EditorActions onSave={() => date && onSave(date)} onCancel={onCancel} saving={saving} disabled={!date} />
    </div>
  );
}

function EmploymentYearsEditor({ yearsElapsed, initial, onSave, saving, onCancel }: {
  yearsElapsed: number; initial: number[]; onSave: (years: number[]) => void; saving: boolean; onCancel: () => void;
}) {
  const [years, setYears] = useState<number[]>(initial);
  const toggle = (y: number) => setYears((prev) => (prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y].sort((a, b) => a - b)));
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Which qualifying years do you hold employment records for?</label>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: yearsElapsed }, (_, i) => i + 1).map((y) => (
          <button key={y} type="button" onClick={() => toggle(y)}
            className={cn(
              "h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-colors",
              years.includes(y) ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-slate-200 text-slate-500 hover:border-slate-300",
            )}>
            Year {y}{years.includes(y) ? " ✓" : ""}
          </button>
        ))}
      </div>
      <EditorActions onSave={() => onSave(years)} onCancel={onCancel} saving={saving} />
    </div>
  );
}

function ToggleDetailEditor({
  confirmLabel, initialConfirmed, detailType, detailPlaceholder, initialDetail, onSave, saving, onCancel,
}: {
  confirmLabel: string; initialConfirmed: boolean; detailType: "date" | "text" | null;
  detailPlaceholder?: string; initialDetail?: string;
  onSave: (confirmed: boolean, detail?: string) => void; saving: boolean; onCancel: () => void;
}) {
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [detail, setDetail] = useState(initialDetail ?? "");
  return (
    <div>
      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30" />
        {confirmLabel}
      </label>
      {confirmed && detailType && (
        <input
          type={detailType === "date" ? "date" : "text"}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={detailPlaceholder}
          maxLength={detailType === "text" ? 100 : undefined}
          className="mt-2 h-8 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-900 placeholder:text-slate-400 w-full max-w-[220px]"
        />
      )}
      <EditorActions onSave={() => onSave(confirmed, detail || undefined)} onCancel={onCancel} saving={saving} />
    </div>
  );
}

// ── Demo data ────────────────────────────────────────────────────────────────
const DEMO_VISA: Doc<"visa_status"> = {
  _id: "demo_visa" as Doc<"visa_status">["_id"],
  _creationTime: 0,
  userId: "demo_user" as Doc<"visa_status">["userId"],
  jurisdiction: "uk_ilr",
  visaType: "Skilled Worker",
  hostCountry: "United Kingdom",
  grantDate: "2022-03-15",
  expiryDate: "2027-03-14",
  sponsorEmployer: "Meridian Tech Ltd",
  active: true,
  createdAt: "2022-03-15T00:00:00.000Z",
  updatedAt: "2022-03-15T00:00:00.000Z",
  passportExpiryDate: "2029-06-01",
  employmentRecordsConfirmedYears: [1, 2, 3],
  travelLogConfirmedComplete: false,
  lifeInUkTestTaken: true,
  lifeInUkTestDate: "2025-11-02",
  englishQualificationConfirmed: false,
};

const DEMO_TRIPS: Doc<"travel_trips">[] = [
  {
    _id: "demo_trip_1" as Doc<"travel_trips">["_id"],
    _creationTime: 0,
    userId: "demo_user" as Doc<"travel_trips">["userId"],
    destination: "Nigeria",
    destinationEmoji: "🇳🇬",
    departureDate: "2023-12-20",
    returnDate: "2024-01-08",
    daysAbsent: 19,
    purpose: "Family",
    createdAt: "2024-01-10T00:00:00.000Z",
    updatedAt: "2024-01-10T00:00:00.000Z",
  },
  {
    _id: "demo_trip_2" as Doc<"travel_trips">["_id"],
    _creationTime: 0,
    userId: "demo_user" as Doc<"travel_trips">["userId"],
    destination: "Spain",
    destinationEmoji: "🇪🇸",
    departureDate: "2024-07-05",
    returnDate: "2024-07-19",
    daysAbsent: 14,
    purpose: "Holiday",
    createdAt: "2024-07-20T00:00:00.000Z",
    updatedAt: "2024-07-20T00:00:00.000Z",
  },
  {
    _id: "demo_trip_3" as Doc<"travel_trips">["_id"],
    _creationTime: 0,
    userId: "demo_user" as Doc<"travel_trips">["userId"],
    destination: "United States",
    destinationEmoji: "🇺🇸",
    departureDate: "2025-03-10",
    returnDate: "2025-03-17",
    daysAbsent: 7,
    purpose: "Business",
    createdAt: "2025-03-18T00:00:00.000Z",
    updatedAt: "2025-03-18T00:00:00.000Z",
  },
];

const DEMO_ABSENCE_SUMMARY = {
  windowStart: "2025-07-03",
  daysUsedThisWindow: 21,
  totalTrips: 3,
  totalDaysAllTime: 40,
  longestSingleTripDays: 19,
  totalDaysSinceGrant: 40,
};

// Mirrors what convex/visaStatus.ts's getDocumentReadiness would compute for
// DEMO_VISA (grant date 2022-03-15) if it were a real, saved record.
const DEMO_DOCUMENT_READINESS: DocumentReadiness = {
  items: [
    { key: "passport", label: "Valid host-country passport (6+ months beyond ILR date)", ready: true, detail: "Expires 2029-06-01" },
    { key: "employment", label: "Employment records for all 5 years so far", ready: false, detail: "3 of 5 confirmed", percent: 60 },
    { key: "travelLog", label: "Complete absence travel log (full history required)", ready: false, detail: "Not yet confirmed" },
    { key: "lifeInUk", label: "Life in the UK Test certificate (or equivalent)", ready: true, detail: "Taken 2025-11-02" },
    { key: "english", label: "English language qualification (B1+ CEFR)", ready: false, detail: "Not yet gathered" },
  ],
  overallPercent: 52,
  yearsElapsed: 5,
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ImmigrationStatusPage() {
  useSeo({ title: "Immigration Status — VisaClear", description: "Track your visa, ILR countdown, and absence days." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated, user: demoUser } = useDemoAuth();

  const user = useQuery(api.users.getCurrentUser, isDemoAuthenticated ? "skip" : {});
  const plan = isDemoAuthenticated ? (demoUser?.plan ?? "expert") : (user?.plan ?? "free");
  const canSeeDocReadiness = canUseDocumentVault(plan);
  const canSeeRejectionRoadmap = canUseRejectionAnalyser(plan);

  const visaStatus = useQuery(api.visaStatus.getMyVisaStatus, isDemoAuthenticated ? "skip" : {});
  const trips = useQuery(api.travelLog.getMyTrips, isDemoAuthenticated ? "skip" : {});
  const absenceSummary = useQuery(api.travelLog.getAbsenceSummary, isDemoAuthenticated ? "skip" : {});
  const tripsForExport = useQuery(api.travelLog.getTripsForExport, isDemoAuthenticated ? "skip" : {});
  const documentReadiness = useQuery(api.visaStatus.getDocumentReadiness, isDemoAuthenticated ? "skip" : {});

  const setVisaMutation = useMutation(api.visaStatus.setVisaStatus);
  const deleteVisaMutation = useMutation(api.visaStatus.deleteVisaStatus);
  const addTripMutation = useMutation(api.travelLog.addTrip);
  const updateTripMutation = useMutation(api.travelLog.updateTrip);
  const deleteTripMutation = useMutation(api.travelLog.deleteTrip);
  const updateChecklistMutation = useMutation(api.visaStatus.updateDocumentChecklist);

  const [editingVisa, setEditingVisa] = useState(false);
  const [showTripForm, setShowTripForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Doc<"travel_trips"> | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<Id<"travel_trips"> | null>(null);
  const [expandedChecklistItem, setExpandedChecklistItem] = useState<string | null>(null);
  const [checklistSaving, setChecklistSaving] = useState(false);

  // In demo mode: use static demo data, never wait on real queries
  const resolvedVisa = isDemoAuthenticated ? DEMO_VISA : visaStatus;
  const resolvedTrips = isDemoAuthenticated ? DEMO_TRIPS : trips;
  const resolvedAbsenceSummary = isDemoAuthenticated ? DEMO_ABSENCE_SUMMARY : absenceSummary;
  const resolvedTripsForExport = isDemoAuthenticated ? DEMO_TRIPS : tripsForExport;
  const resolvedReadiness: DocumentReadiness | null | undefined = isDemoAuthenticated ? DEMO_DOCUMENT_READINESS : documentReadiness;

  const loading = !isDemoAuthenticated && (visaStatus === undefined || trips === undefined || absenceSummary === undefined);

  // Jurisdiction info
  const jInfo = JURISDICTIONS.find((j) => j.value === (resolvedVisa?.jurisdiction ?? "uk_ilr")) ?? JURISDICTIONS[0];

  // ILR calculations
  const ilrEligibleDate = resolvedVisa
    ? (() => {
        const d = new Date(resolvedVisa.grantDate + "T00:00:00Z");
        d.setFullYear(d.getFullYear() + 5);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  const monthsIntoJourney = resolvedVisa
    ? monthsBetween(resolvedVisa.grantDate, today())
    : 0;
  const journeyPercent = Math.min((monthsIntoJourney / 60) * 100, 100);
  const daysToExpiry = resolvedVisa ? daysUntil(resolvedVisa.expiryDate) : 0;
  const daysToILR = ilrEligibleDate ? daysUntil(ilrEligibleDate) : 0;

  // Absence — the two rules measure genuinely different things, not just
  // different thresholds. "rolling_year" (UK-style) caps days absent in
  // any rolling 12-month window. "eu_ltr" caps total days absent across
  // the whole 5-year qualifying period (the 10-months-total half of the
  // rule) — a rolling-12-month figure doesn't measure that at all, so
  // using the wrong source here would silently under-count an EU-track
  // user's real cumulative absence once they're more than a year in.
  const daysUsed = jInfo.rule === "eu_ltr"
    ? (resolvedAbsenceSummary?.totalDaysSinceGrant ?? resolvedAbsenceSummary?.totalDaysAllTime ?? 0)
    : (resolvedAbsenceSummary?.daysUsedThisWindow ?? 0);
  const absenceLimit = jInfo.limit;
  const absenceWarning = jInfo.warning;
  const daysRemaining = Math.max(absenceLimit - daysUsed, 0);
  const absenceSafe = daysUsed < absenceWarning;
  const absenceCritical = daysUsed >= absenceLimit;
  // The other half of the EU rule — 6 consecutive months in one absence —
  // isn't captured by any total/rolling sum, so it needs its own flag.
  const longestSingleTripDays = resolvedAbsenceSummary?.longestSingleTripDays ?? 0;
  const consecutiveAbsenceWarning = jInfo.rule === "eu_ltr" && longestSingleTripDays >= 150;
  const consecutiveAbsenceCritical = jInfo.rule === "eu_ltr" && longestSingleTripDays >= 182;

  const handleSaveVisa = async (data: Parameters<typeof setVisaMutation>[0]) => {
    if (isDemoAuthenticated) { toast.info("Sign up to save your visa details."); setEditingVisa(false); return; }
    try {
      await setVisaMutation(data);
      setEditingVisa(false);
      toast.success("Visa status saved.");
    } catch (e) {
      const msg = convexErrMsg(e) ?? "Failed to save.";
      toast.error(msg);
      throw e;
    }
  };

  const handleSaveChecklist = async (patch: Parameters<typeof updateChecklistMutation>[0]) => {
    if (isDemoAuthenticated) { toast.info("Sign up to track your own document readiness."); setExpandedChecklistItem(null); return; }
    setChecklistSaving(true);
    try {
      await updateChecklistMutation(patch);
      setExpandedChecklistItem(null);
      toast.success("Saved.");
    } catch (e) {
      toast.error(convexErrMsg(e) ?? "Failed to save.");
    } finally {
      setChecklistSaving(false);
    }
  };

  const handleDeleteVisa = async () => {
    if (isDemoAuthenticated) { toast.info("Sign up to manage your visa details."); return; }
    if (!resolvedVisa) return;
    if (!confirm("Remove this visa status? You can re-add it at any time.")) return;
    try {
      await deleteVisaMutation({ visaStatusId: resolvedVisa._id });
      toast.success("Visa status removed.");
    } catch {
      toast.error("Failed to remove.");
    }
  };

  const handleAddTrip = async (data: Parameters<typeof addTripMutation>[0]) => {
    if (isDemoAuthenticated) { toast.info("Sign up to log your own trips."); setShowTripForm(false); return; }
    try {
      await addTripMutation(data);
      setShowTripForm(false);
      toast.success("Trip logged.");
    } catch (e) {
      const msg = convexErrMsg(e) ?? "Failed to add trip.";
      toast.error(msg);
      throw e;
    }
  };

  const handleUpdateTrip = async (data: Omit<Parameters<typeof updateTripMutation>[0], "tripId">) => {
    if (!editingTrip) return;
    try {
      await updateTripMutation({ tripId: editingTrip._id, ...data });
      setEditingTrip(null);
      toast.success("Trip updated.");
    } catch (e) {
      const msg = convexErrMsg(e) ?? "Failed to update.";
      toast.error(msg);
      throw e;
    }
  };

  const handleDeleteTrip = async (tripId: Id<"travel_trips">) => {
    setDeletingTripId(tripId);
    try {
      await deleteTripMutation({ tripId });
      toast.success("Trip removed.");
    } catch {
      toast.error("Failed to remove trip.");
    } finally {
      setDeletingTripId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF2F7]">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900">Immigration Status</span>
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
          <button onClick={goBack} aria-label="Back" className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer shrink-0">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight">Immigration Dashboard</div>
            <div className="text-[11px] text-slate-500 hidden sm:block">
              {resolvedVisa ? `${resolvedVisa.hostCountry} · ${jInfo.label.replace(/^.* — /, "")}` : "Set up your visa to get started"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {resolvedVisa && !editingVisa && (
            <button onClick={() => setEditingVisa(true)}
              className="h-8 px-3 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit visa
            </button>
          )}
          {!showTripForm && (
            <button onClick={() => { setShowTripForm(true); setEditingTrip(null); }}
              className="h-8 px-3 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Log trip
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* ── Setup prompt ── */}
        {!resolvedVisa && !editingVisa && (
          <Card>
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-2">Set up your immigration status</h2>
              <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                Enter your visa details once. VisaClear will track your ILR countdown, absence days, and document readiness automatically.
              </p>
              <button onClick={() => setEditingVisa(true)}
                className="h-10 px-6 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                Get started
              </button>
            </div>
          </Card>
        )}

        {/* ── Visa setup form (edit mode) ── */}
        {editingVisa && (
          <Card>
            <CardHeader title={resolvedVisa ? "Edit visa status" : "Set up visa status"} icon={Shield} />
            <VisaSetupForm
              onSave={handleSaveVisa}
              initial={resolvedVisa}
            />
            {resolvedVisa && (
              <div className="px-5 pb-4 flex items-center justify-between">
                <button onClick={() => setEditingVisa(false)} className="text-sm text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
                <button onClick={handleDeleteVisa} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Remove visa status
                </button>
              </div>
            )}
          </Card>
        )}

        {/* ── Metric strip ── */}
        {resolvedVisa && !editingVisa && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Visa Status"
              value={<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Active</span>}
              sub={resolvedVisa.visaType}
              color="green"
            />
            <MetricCard
              label="Visa Expiry"
              value={`${daysToExpiry}`}
              sub={`days · ${fmtDate(resolvedVisa.expiryDate)}`}
              color={daysToExpiry < 180 ? "amber" : "blue"}
            />
            <MetricCard
              label="Absence Days"
              value={<span><span className={absenceSafe ? "text-emerald-700" : "text-amber-700"}>{daysUsed}</span><span className="text-sm font-semibold text-slate-400"> / {absenceLimit}</span></span>}
              sub={`${daysRemaining} days left`}
              color={absenceCritical ? "amber" : absenceSafe ? "green" : "amber"}
            />
            <MetricCard
              label="ILR Eligible"
              value={daysToILR > 0 ? `${Math.floor(daysToILR / 365)}yr ${Math.floor((daysToILR % 365) / 30)}mo` : "Now"}
              sub={ilrEligibleDate ? fmtDate(ilrEligibleDate) : ""}
              color="purple"
            />
          </div>
        )}

        {/* ── CARD 1: Status & ILR ── */}
        {resolvedVisa && !editingVisa && (
          <Card>
            <CardHeader
              title="Visa Status & ILR Countdown"
              icon={Clock}
              right={
                <div className="flex items-center gap-2">
                  <Chip color="neutral">5-year route</Chip>
                  <Chip color={journeyPercent >= 80 ? "green" : "blue"}>
                    Yr {Math.floor(monthsIntoJourney / 12) + 1} of 5
                  </Chip>
                </div>
              }
            />
            <div className="p-5">
              <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
                {/* Ring */}
                <div className="flex flex-col items-center gap-3 sm:shrink-0">
                  <ProgressRing
                    percent={journeyPercent}
                    label={`${monthsIntoJourney}`}
                    sub="months in"
                  />
                  <div className="w-full max-w-[120px]">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>{new Date(resolvedVisa.grantDate).getFullYear()}</span>
                      <span>{ilrEligibleDate ? new Date(ilrEligibleDate).getFullYear() : ""}</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${journeyPercent}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 text-center mt-1">{journeyPercent.toFixed(0)}% complete</div>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-sm mb-4">
                    {[
                      { label: "Visa type", value: resolvedVisa.visaType },
                      { label: "Host country", value: `${jInfo.label.split(" — ")[0].trim().slice(0, 2)} ${resolvedVisa.hostCountry}` },
                      { label: "Grant date", value: fmtDate(resolvedVisa.grantDate) },
                      { label: "Expiry date", value: fmtDate(resolvedVisa.expiryDate) },
                      ...(resolvedVisa.sponsorEmployer ? [{ label: "Sponsor", value: resolvedVisa.sponsorEmployer }] : []),
                      { label: "ILR eligible from", value: ilrEligibleDate ? fmtDate(ilrEligibleDate) : "—", highlight: true },
                    ].map(({ label, value, highlight }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-slate-500 text-xs">{label}</span>
                        <span className={cn("font-semibold text-xs text-right", highlight ? "text-blue-700" : "text-slate-900")}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <ILRTimeline grantDate={resolvedVisa.grantDate} qualifyingYears={5} />
                </div>
              </div>

              {/* Document readiness — real, server-computed, editable checklist */}
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">ILR Document Readiness</span>
                  <div className="flex items-center gap-1.5">
                    {canSeeDocReadiness && resolvedReadiness && (
                      <Chip color={resolvedReadiness.overallPercent >= 80 ? "green" : resolvedReadiness.overallPercent >= 40 ? "blue" : "amber"}>
                        {resolvedReadiness.overallPercent}% ready
                      </Chip>
                    )}
                    {!canSeeDocReadiness && <Chip color="blue">Pro Feature</Chip>}
                  </div>
                </div>

                {canSeeDocReadiness ? (
                  resolvedReadiness === undefined ? (
                    <div className="space-y-2 py-1">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
                    </div>
                  ) : resolvedReadiness === null ? (
                    <div className="text-xs text-slate-400 py-3">Set up your visa status above to start tracking document readiness.</div>
                  ) : (
                    <div>
                      {resolvedReadiness.items.map((item) => (
                        <DocReadinessRow
                          key={item.key}
                          icon={READINESS_ICONS[item.key] ?? CheckCircle2}
                          ready={item.ready}
                          label={item.label}
                          detail={item.detail}
                          expanded={expandedChecklistItem === item.key}
                          onToggle={() => setExpandedChecklistItem(expandedChecklistItem === item.key ? null : item.key)}
                        >
                          {item.key === "passport" && (
                            <PassportEditor
                              initial={resolvedVisa.passportExpiryDate}
                              saving={checklistSaving}
                              onCancel={() => setExpandedChecklistItem(null)}
                              onSave={(date) => { void handleSaveChecklist({ passportExpiryDate: date }); }}
                            />
                          )}
                          {item.key === "employment" && (
                            <EmploymentYearsEditor
                              yearsElapsed={resolvedReadiness.yearsElapsed}
                              initial={resolvedVisa.employmentRecordsConfirmedYears ?? []}
                              saving={checklistSaving}
                              onCancel={() => setExpandedChecklistItem(null)}
                              onSave={(years) => { void handleSaveChecklist({ employmentRecordsConfirmedYears: years }); }}
                            />
                          )}
                          {item.key === "travelLog" && (
                            <ToggleDetailEditor
                              confirmLabel="I confirm my travel log above is my complete absence history"
                              initialConfirmed={resolvedVisa.travelLogConfirmedComplete ?? false}
                              detailType={null}
                              saving={checklistSaving}
                              onCancel={() => setExpandedChecklistItem(null)}
                              onSave={(confirmed) => { void handleSaveChecklist({ travelLogConfirmedComplete: confirmed }); }}
                            />
                          )}
                          {item.key === "lifeInUk" && (
                            <ToggleDetailEditor
                              confirmLabel="I've taken the Life in the UK Test"
                              initialConfirmed={resolvedVisa.lifeInUkTestTaken ?? false}
                              detailType="date"
                              detailPlaceholder="Date taken"
                              initialDetail={resolvedVisa.lifeInUkTestDate}
                              saving={checklistSaving}
                              onCancel={() => setExpandedChecklistItem(null)}
                              onSave={(confirmed, detail) => { void handleSaveChecklist({ lifeInUkTestTaken: confirmed, ...(detail ? { lifeInUkTestDate: detail } : {}) }); }}
                            />
                          )}
                          {item.key === "english" && (
                            <ToggleDetailEditor
                              confirmLabel="I hold a qualifying English language qualification"
                              initialConfirmed={resolvedVisa.englishQualificationConfirmed ?? false}
                              detailType="text"
                              detailPlaceholder="e.g. IELTS, degree taught in English"
                              initialDetail={resolvedVisa.englishQualificationType}
                              saving={checklistSaving}
                              onCancel={() => setExpandedChecklistItem(null)}
                              onSave={(confirmed, detail) => { void handleSaveChecklist({ englishQualificationConfirmed: confirmed, ...(detail ? { englishQualificationType: detail } : {}) }); }}
                            />
                          )}
                        </DocReadinessRow>
                      ))}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={cn("font-bold", resolvedReadiness.overallPercent >= 80 ? "text-emerald-600" : "text-blue-700")}>
                            {resolvedReadiness.items.filter((i) => i.ready).length} of {resolvedReadiness.items.length} complete
                          </span>
                          <span className="text-slate-400">{resolvedReadiness.overallPercent}% ready</span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", resolvedReadiness.overallPercent >= 80 ? "bg-emerald-500" : "bg-blue-600")}
                            style={{ width: `${resolvedReadiness.overallPercent}%` }}
                          />
                        </div>
                        <div className="text-[10.5px] text-slate-400 mt-1.5">Tap any item above to update it — ILR applications can take months to compile</div>
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    {/* Locked rows — labels only, no fabricated status */}
                    {resolvedReadiness?.items.map((item) => (
                      <div key={item.key} className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
                        <div className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center shrink-0">
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                        </div>
                        <span className="flex-1 text-xs text-slate-300">{item.label}</span>
                        <span className="text-[11px] font-semibold shrink-0 text-slate-300">Unlock with Pro</span>
                      </div>
                    ))}

                    {/* Real progress, obscured — not a fabricated number */}
                    <div className="mt-3 mb-0.5">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="font-bold text-blue-700 blur-[3px] select-none tabular-nums" aria-hidden="true">
                          {resolvedReadiness ? `${resolvedReadiness.overallPercent}%` : "—"}
                        </span>
                        <span className="text-slate-400">document ready</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${resolvedReadiness?.overallPercent ?? 0}%` }} />
                      </div>
                    </div>

                    {/* Pro gate strip */}
                    <div className="mt-4 -mx-5 px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-extrabold text-blue-900 leading-snug">
                          Your ILR{resolvedReadiness ? ` is ${resolvedReadiness.overallPercent}%` : ""} ready — track the rest with Pro
                        </div>
                        <div className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                          Unlock all 5 document categories, set expiry reminders, and know exactly what the Home Office needs before your application date.
                        </div>
                        <button
                          onClick={() => navigate("/pricing")}
                          className="mt-2.5 h-8 px-4 bg-blue-600 text-white text-[11.5px] font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                        >
                          Upgrade to Pro · £9/mo <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* ── CARD 2: Travel Absence Tracker ── */}
        <Card>
          <CardHeader
            title="Travel Absence Tracker"
            icon={MapPin}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            right={
              <div className="flex items-center gap-2">
                {(resolvedTrips?.length ?? 0) > 0 && (
                  <button
                    onClick={() => resolvedTripsForExport && printTravelHistory(resolvedTripsForExport, resolvedVisa ?? null, "My Travel History")}
                    className="h-7 px-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                    title="Download / print travel history PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Print / PDF</span>
                  </button>
                )}
                {!showTripForm && (
                  <Chip color={absenceSafe ? "green" : absenceCritical ? "red" : "amber"}>
                    {absenceSafe ? "Safe" : absenceCritical ? "Over limit" : "Warning"} · {daysRemaining} left
                  </Chip>
                )}
              </div>
            }
          />

          {/* Alert */}
          {resolvedVisa && (
            <div className="mx-5 mt-4 flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <span>
                {jInfo.rule === "rolling_year"
                  ? `Your ${absenceLimit}-day allowance runs on a rolling 12-month basis — not a calendar year. You've used ${daysUsed} days. Log every trip to keep an accurate record for your ${jInfo.label.replace(/^.*— /, "")} application.`
                  : `EU Long-Term Residency requires no more than 6 consecutive months OR 10 months total absent over 5 years. The gauge below tracks your total since your visa was granted. Log every trip outside ${resolvedVisa.hostCountry}.`}
              </span>
            </div>
          )}

          {/* Consecutive-absence flag — the "6 consecutive months" half of
              the EU rule, which the total-days gauge below doesn't cover
              (a long single trip can trip this even while total days stay
              well under the 10-month cap). */}
          {resolvedVisa && jInfo.rule === "eu_ltr" && consecutiveAbsenceWarning && (
            <div className={`mx-5 mt-2.5 flex items-start gap-2.5 p-3 rounded-lg text-xs ${consecutiveAbsenceCritical ? "bg-red-50 border border-red-200 text-red-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {consecutiveAbsenceCritical
                  ? `Your longest single trip was ${longestSingleTripDays} days — over the 6-consecutive-month limit (≈182 days) on its own, regardless of your total. This can break continuous residence even with a low total-days count.`
                  : `Your longest single trip was ${longestSingleTripDays} days — getting close to the 6-consecutive-month limit (≈182 days). A trip this long counts against continuous residence even if your total absence is otherwise low.`}
              </span>
            </div>
          )}

          {/* Gauge + table layout */}
          <div className="p-5">
            {!resolvedVisa && !resolvedTrips?.length && (
              <p className="text-sm text-slate-500 text-center py-4">
                Set up your visa first to enable absence tracking.
              </p>
            )}
            {(resolvedVisa || (resolvedTrips?.length ?? 0) > 0) && (
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Gauge */}
                <div className="flex flex-col items-center gap-3 sm:shrink-0 sm:w-[170px]">
                  <AbsenceGauge used={daysUsed} limit={absenceLimit} warning={absenceWarning} />
                  <div className="text-center">
                    <div className="text-2xl font-black text-slate-900 font-variant-numeric tabular-nums">{daysRemaining}</div>
                    <div className="text-xs text-slate-500">days remaining</div>
                    <div className="mt-1.5">
                      <Chip color={absenceSafe ? "green" : absenceCritical ? "red" : "amber"}>
                        {absenceSafe ? "Very safe" : absenceCritical ? "Over limit!" : "Getting close"}
                      </Chip>
                    </div>
                  </div>
                </div>

                {/* Trip log */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      All logged trips ({resolvedTrips?.length ?? 0})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {resolvedAbsenceSummary?.totalDaysAllTime ?? 0} total days across all time
                    </span>
                  </div>

                  {/* Add/edit trip form inline */}
                  {(showTripForm || editingTrip) && (
                    <div className="mb-3 bg-white border border-blue-100 rounded-lg overflow-hidden">
                      <TripForm
                        onSave={editingTrip ? handleUpdateTrip : handleAddTrip}
                        onCancel={() => { setShowTripForm(false); setEditingTrip(null); }}
                        initial={editingTrip}
                      />
                    </div>
                  )}

                  {/* Trip table */}
                  {(resolvedTrips?.length ?? 0) === 0 && !showTripForm ? (
                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
                      <MapPin className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-600 mb-1">No trips logged yet</p>
                      <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
                        Every trip outside your host country counts toward your absence limit. Log them all for an accurate ILR record.
                      </p>
                      <button onClick={() => setShowTripForm(true)}
                        className="h-8 px-4 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 mx-auto">
                        <Plus className="w-3.5 h-3.5" /> Log your first trip
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-xs border-collapse min-w-[500px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Destination</th>
                            <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Left</th>
                            <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Returned</th>
                            <th className="text-center px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Days</th>
                            <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden sm:table-cell">Purpose</th>
                            <th className="px-2 py-2.5 text-[10px] w-14" />
                          </tr>
                        </thead>
                        <tbody>
                          {(resolvedTrips ?? []).map((trip) => (
                            <tr key={trip._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                              <td className="px-3 py-2.5 font-medium text-slate-800">
                                {trip.destinationEmoji ?? "🌍"} {trip.destination}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(trip.departureDate)}</td>
                              <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(trip.returnDate)}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="font-bold text-slate-900 tabular-nums">{trip.daysAbsent}</span>
                              </td>
                              <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{trip.purpose ?? "—"}</td>
                              <td className="px-2 py-2.5">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingTrip(trip); setShowTripForm(false); }}
                                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer">
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => { void handleDeleteTrip(trip._id); }}
                                    disabled={deletingTripId === trip._id}
                                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Rule box */}
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 leading-relaxed">
                    <strong className="text-[10px] uppercase tracking-wider text-slate-500">
                      {jInfo.label.replace(/^.*— /, "")} Absence Rule
                    </strong>
                    <div className="mt-1">
                      {jInfo.rule === "rolling_year"
                        ? `You must not be absent from ${resolvedVisa?.hostCountry ?? "the UK"} for more than ${absenceLimit} days in any rolling 12-month period across the 5-year qualifying period. Both long trips and multiple short trips count cumulatively.`
                        : `Under EU Directive 2003/109/EC you must not leave ${resolvedVisa?.hostCountry ?? "your EU host country"} for more than 6 consecutive months or a total of 10 months across the 5-year qualifying period.`}
                    </div>
                  </div>

                  {/* Expert upsell */}
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-blue-800">Track your whole family on Expert</div>
                      <div className="text-[11px] text-blue-600 mt-0.5">Each family member gets their own absence counter and ILR clock.</div>
                    </div>
                    <button onClick={() => navigate("/pricing")}
                      className="h-8 px-3 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shrink-0">
                      Upgrade
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── CARD 3: Rejection Roadmap (Expert gate) ── */}
        <Card>
          <CardHeader
            title="Rejection-to-Reapplication Roadmap"
            icon={FileText}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            right={<Chip color="purple">Expert only</Chip>}
          />

          {canSeeRejectionRoadmap ? (
            /* Expert users — prompt to analyse */
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Upload your refusal letter to get started</h3>
              <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                VisaClear will decode the refusal grounds, identify what needs to change, and build your 12-week reapplication roadmap.
              </p>
              <button onClick={() => navigate("/rejection-analyser")}
                className="h-10 px-6 bg-purple-700 text-white text-sm font-semibold rounded-xl hover:bg-purple-800 transition-colors">
                Analyse refusal letter
              </button>
            </div>
          ) : (
            /* Free / Pro: premium frosted gate */
            <div className="relative overflow-hidden">
              {/* Blurred preview — content visible beneath the overlay */}
              <div className="p-5 select-none pointer-events-none min-h-[400px]" style={{ filter: "blur(2.5px)" }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative w-[76px] h-[76px] shrink-0">
                    <svg width="76" height="76" viewBox="0 0 76 76">
                      <circle cx="38" cy="38" r="32" fill="none" stroke="#E2E8F0" strokeWidth="7" />
                      <circle cx="38" cy="38" r="32" fill="none" stroke="#7C3AED" strokeWidth="7"
                        strokeLinecap="round" strokeDasharray="201" strokeDashoffset="64"
                        transform="rotate(-90 38 38)" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-base font-black text-slate-900 leading-none">68%</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">ready</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[
                      { step: "✓", label: "Refusal grounds identified — V 4.2(b)", cls: "bg-emerald-100 text-emerald-700" },
                      { step: "✓", label: "Bank statement audit complete", cls: "bg-emerald-100 text-emerald-700" },
                      { step: "!", label: "New employer letter required", cls: "bg-amber-100 text-amber-700" },
                    ].map(({ step, label, cls }) => (
                      <div key={label} className="flex items-center gap-2 text-xs py-1.5 border-b border-slate-50">
                        <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0", cls)}>{step}</div>
                        <span className="text-slate-700">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { step: "4", label: "10-year travel history — gaps found", cls: "bg-slate-100 text-slate-400" },
                    { step: "5", label: "Personal statement — rewrite needed", cls: "bg-slate-100 text-slate-400" },
                    { step: "6", label: "Updated biometric appointment booked", cls: "bg-slate-100 text-slate-400" },
                    { step: "7", label: "Sponsor note from legal representative", cls: "bg-slate-100 text-slate-400" },
                  ].map(({ step, label, cls }) => (
                    <div key={label} className="flex items-center gap-2 text-xs py-1.5 border-b border-slate-50">
                      <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0", cls)}>{step}</div>
                      <span className="text-slate-700">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frosted gate — floats from bottom, lifts on hover */}
              <div
                className="absolute left-0 right-0 bottom-0 rounded-b-xl border-t border-purple-100/70 p-5 transition-transform duration-200 hover:-translate-y-1.5"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(18px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(18px) saturate(1.4)",
                  boxShadow: "0 -8px 28px rgba(124,58,237,0.10)",
                }}
              >
                {/* Expert badge */}
                <div className="inline-flex items-center gap-1.5 bg-purple-700 text-white text-[9.5px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full mb-3">
                  <span className="text-[10px]">★</span> Expert
                </div>

                <div className="text-[14px] font-extrabold text-slate-900 leading-snug mb-2">
                  Your rejection letter has been analysed.<br />The roadmap is one step away.
                </div>
                <p className="text-[11.5px] text-slate-500 leading-relaxed mb-3.5">
                  Upload your refusal letter and get a 12-week, step-by-step reapplication plan — built around the exact grounds the officer cited.
                </p>

                <div className="space-y-2.5 mb-4">
                  {[
                    "Every refusal code decoded in plain English — V 4.2(b), Art. 32, IRPA s.11 and more",
                    "Exact documents to fix, add, or replace before reapplying — no guessing",
                    "A ready-to-send appeal letter, written in formal legal English",
                  ].map((b) => (
                    <div key={b} className="flex items-start gap-2 text-[11.5px] text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-purple-600" />
                      </div>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate("/pricing")}
                  className="w-full h-11 bg-purple-700 text-white font-bold text-sm rounded-xl hover:bg-purple-800 transition-colors flex items-center justify-center gap-2"
                >
                  Upgrade to Expert · £19/mo <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[10.5px] text-slate-400 text-center mt-2">Cancel anytime · includes everything in Pro</p>
              </div>
            </div>
          )}
        </Card>

        {/* ── EU residents prompt ── */}
        {resolvedVisa && jInfo?.rule === "eu_ltr" && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">Living in Europe?</div>
                <div className="text-xs text-slate-500 truncate">
                  Track your Schengen days, renewal window, and EU-specific compliance in one view.
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/dashboard/european-tracker")}
              className="h-8 px-4 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shrink-0 flex items-center gap-1.5"
            >
              EU Tracker <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
