import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Clock,
  TrendingUp,
  DollarSign,
  Check,
  Minus,
  ChevronRight,
  Globe,
} from "lucide-react";
import { useSeo } from "@/hooks/use-seo.ts";
import {
  POPULAR_CORRIDORS,
  getCorridorDefinition,
  countryToSlug,
  type CorridorVisaType,
  type CorridorDefinition,
} from "@/lib/corridor-data.ts";

// ── Types ────────────────────────────────────────────────────────────────────

interface SelectedCorridor {
  originSlug: string;
  destinationSlug: string;
  visaTypeSlug: string;
  corridor: CorridorDefinition;
  visaType: CorridorVisaType;
}

const MAX_COMPARE = 3;

const OUTCOME_BADGE: Record<string, string> = {
  permanent_residence: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  temporary_work: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  study: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  visit: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  entrepreneur: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};
const OUTCOME_LABEL: Record<string, string> = {
  permanent_residence: "Permanent Residence",
  temporary_work: "Work Visa",
  study: "Study",
  visit: "Visitor",
  entrepreneur: "Startup",
};

// ── Corridor picker ──────────────────────────────────────────────────────────

function CorridorPicker({
  onAdd,
  existing,
}: {
  onAdd: (c: SelectedCorridor) => void;
  existing: SelectedCorridor[];
}) {
  const [step, setStep] = useState<"corridor" | "visatype">("corridor");
  const [chosenCorridor, setChosenCorridor] = useState<{
    originSlug: string;
    destinationSlug: string;
    corridor: CorridorDefinition;
  } | null>(null);

  function pickCorridor(p: (typeof POPULAR_CORRIDORS)[0]) {
    const corridor = getCorridorDefinition(p.originSlug, p.destinationSlug);
    if (!corridor) return;
    if (corridor.visaTypes.length === 1) {
      // Only one visa type — add immediately
      const vt = corridor.visaTypes[0];
      onAdd({
        originSlug: p.originSlug,
        destinationSlug: p.destinationSlug,
        visaTypeSlug: vt.slug,
        corridor,
        visaType: vt,
      });
      return;
    }
    setChosenCorridor({ originSlug: p.originSlug, destinationSlug: p.destinationSlug, corridor });
    setStep("visatype");
  }

  if (step === "visatype" && chosenCorridor) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => setStep("corridor")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
        </div>
        <p className="text-sm font-semibold text-foreground">
          Choose a visa type for{" "}
          {chosenCorridor.corridor.originFlag} {chosenCorridor.corridor.origin} →{" "}
          {chosenCorridor.corridor.destinationFlag} {chosenCorridor.corridor.destination}:
        </p>
        <div className="space-y-2">
          {chosenCorridor.corridor.visaTypes.map((vt) => (
            <button
              key={vt.slug}
              onClick={() => {
                onAdd({
                  originSlug: chosenCorridor.originSlug,
                  destinationSlug: chosenCorridor.destinationSlug,
                  visaTypeSlug: vt.slug,
                  corridor: chosenCorridor.corridor,
                  visaType: vt,
                });
              }}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background hover:border-primary/50 hover:bg-muted/50 px-3.5 py-2.5 text-left transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{vt.shortName}</p>
                <p className="text-xs text-muted-foreground">{vt.processingTime} · {vt.approvalRate} approval</p>
              </div>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${OUTCOME_BADGE[vt.outcome] ?? "bg-muted text-muted-foreground"}`}
              >
                {OUTCOME_LABEL[vt.outcome] ?? vt.outcome}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const availableCorridors = POPULAR_CORRIDORS.filter((p) => {
    const key = `${p.originSlug}/${p.destinationSlug}`;
    return !existing.some(
      (e) => `${e.originSlug}/${e.destinationSlug}` === key,
    );
  });

  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5">
      <p className="text-sm font-semibold text-foreground mb-3">Add a corridor to compare:</p>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {availableCorridors.map((p) => (
          <button
            key={`${p.originSlug}/${p.destinationSlug}`}
            onClick={() => pickCorridor(p)}
            className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card hover:border-primary/50 hover:shadow-sm px-3.5 py-2.5 text-left transition-all"
          >
            <span className="text-xl">{p.originFlag}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xl">{p.destinationFlag}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {p.origin} → {p.destination}
              </p>
              <p className="text-xs text-muted-foreground">{p.visaTypeCount} visa type{p.visaTypeCount !== 1 ? "s" : ""}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Comparison table ─────────────────────────────────────────────────────────

const FIELD_ROWS: Array<{
  label: string;
  getValue: (s: SelectedCorridor) => string | null;
  highlight?: (values: Array<string | null>) => number | null;
}> = [
  {
    label: "Visa type",
    getValue: (s) => s.visaType.shortName,
  },
  {
    label: "Outcome",
    getValue: (s) => OUTCOME_LABEL[s.visaType.outcome] ?? s.visaType.outcome,
  },
  {
    label: "Processing time",
    getValue: (s) => s.visaType.processingTime,
  },
  {
    label: "Approval rate",
    getValue: (s) => s.visaType.approvalRate,
  },
  {
    label: "Duration",
    getValue: (s) => s.visaType.duration,
  },
  {
    label: "Government fee",
    getValue: (s) => s.visaType.fee,
  },
  {
    label: "Min. income",
    getValue: (s) => s.visaType.minIncome ?? "—",
  },
  {
    label: "Min. score",
    getValue: (s) => s.visaType.minScore ?? "—",
  },
  {
    label: "Legal basis",
    getValue: (s) => s.visaType.legalBasis ?? "—",
  },
  {
    label: "Requirements",
    getValue: (s) => `${s.visaType.requirements.filter((r) => r.tag === "required").length} required`,
  },
  {
    label: "Total cost estimate",
    getValue: (s) => {
      const { items, currencySymbol } = s.visaType.costs;
      const required = items.filter((i) => !i.optional);
      const min = required.reduce((acc, i) => acc + i.amountMin, 0);
      const max = required.reduce((acc, i) => acc + i.amountMax, 0);
      return min === max
        ? `${currencySymbol}${min.toLocaleString("en-GB")}`
        : `${currencySymbol}${min.toLocaleString("en-GB")} – ${currencySymbol}${max.toLocaleString("en-GB")}`;
    },
  },
  {
    label: "Data verified",
    getValue: (s) =>
      new Date(s.visaType.lastVerified).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
  },
];

function CompareTable({ selected }: { selected: SelectedCorridor[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-40">
              Criteria
            </th>
            {selected.map((s, i) => (
              <th
                key={i}
                className="px-4 py-3 text-center"
              >
                <div className="text-base mb-0.5">
                  {s.corridor.originFlag} → {s.corridor.destinationFlag}
                </div>
                <div className="text-xs font-medium text-foreground">
                  {s.corridor.origin} → {s.corridor.destination}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIELD_ROWS.map((row, ri) => {
            const values = selected.map((s) => row.getValue(s));
            return (
              <tr
                key={ri}
                className={`border-b border-border/40 ${ri % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
              >
                <td className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {row.label}
                </td>
                {values.map((v, ci) => (
                  <td key={ci} className="px-4 py-3 text-center">
                    <span className="text-sm text-foreground">{v ?? "—"}</span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function VisaComparePage() {
  useSeo({
    title: "Compare Visa Corridors",
    description:
      "Side-by-side comparison of visa corridors — processing times, approval rates, fees, and requirements across multiple routes.",
    canonical: "https://visaclear.app/visa/compare",
  });

  const navigate = useNavigate();
  const [selected, setSelected] = useState<SelectedCorridor[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  function addCorridor(c: SelectedCorridor) {
    setSelected((prev) => {
      if (prev.length >= MAX_COMPARE) return prev;
      const duplicate = prev.some(
        (e) =>
          e.originSlug === c.originSlug &&
          e.destinationSlug === c.destinationSlug &&
          e.visaTypeSlug === c.visaTypeSlug,
      );
      if (duplicate) return prev;
      return [...prev, c];
    });
    setShowPicker(false);
  }

  function removeCorridor(index: number) {
    setSelected((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="border-b border-border/40 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          <Link to="/visa" className="hover:text-foreground transition-colors">Visa Guide</Link>
          <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          <span className="text-foreground font-medium">Compare</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Compare visa corridors
          </h1>
          <p className="text-muted-foreground">
            Add up to {MAX_COMPARE} corridors to compare them side by side.
          </p>
        </div>

        {/* ── Selected corridors + add button ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {selected.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-primary/30 bg-card p-4 relative"
            >
              <button
                onClick={() => removeCorridor(i)}
                className="absolute top-3 right-3 rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`Remove ${s.corridor.origin} → ${s.corridor.destination}`}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2 mb-3 text-2xl">
                <span>{s.corridor.originFlag}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{s.corridor.destinationFlag}</span>
              </div>

              <p className="text-xs text-muted-foreground mb-0.5">
                {s.corridor.origin} → {s.corridor.destination}
              </p>
              <p className="text-sm font-semibold text-foreground mb-3">{s.visaType.shortName}</p>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Processing:</span>
                  <span className="font-medium text-foreground">{s.visaType.processingTime}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-muted-foreground">Approval:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{s.visaType.approvalRate}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Gov't fee:</span>
                  <span className="font-medium text-foreground">{s.visaType.fee}</span>
                </div>
              </div>

              <Link
                to={`/visa/${s.originSlug}/${s.destinationSlug}/${s.visaTypeSlug}`}
                className="mt-4 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Full details <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          ))}

          {/* Add corridor slot */}
          {selected.length < MAX_COMPARE && (
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/30 transition-all min-h-[160px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <div className="h-10 w-10 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Add corridor</span>
              <span className="text-xs opacity-70">{MAX_COMPARE - selected.length} slot{MAX_COMPARE - selected.length !== 1 ? "s" : ""} remaining</span>
            </button>
          )}
        </div>

        {/* ── Picker panel ─────────────────────────────────────────────────── */}
        {showPicker && (
          <div className="mb-8">
            <CorridorPicker onAdd={addCorridor} existing={selected} />
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {selected.length === 0 && !showPicker && (
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-12 text-center">
            <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">No corridors selected yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Add up to {MAX_COMPARE} corridors using the button above to compare processing
              times, fees, approval rates, and requirements side by side.
            </p>
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Add your first corridor
            </button>
          </div>
        )}

        {/* ── Comparison table (shows once 2+ selected) ─────────────────── */}
        {selected.length >= 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              Side-by-side comparison
            </h2>
            <CompareTable selected={selected} />

            {/* Requirements diff */}
            <div>
              <h2 className="text-base font-bold text-foreground mb-4">Requirements at a glance</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selected.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border/60 bg-card p-4"
                  >
                    <div className="flex items-center gap-2 text-lg mb-3">
                      <span>{s.corridor.originFlag}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{s.corridor.destinationFlag}</span>
                      <span className="text-sm font-medium text-foreground ml-1">{s.visaType.shortName}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {s.visaType.requirements.map((req, ri) => (
                        <li key={ri} className="flex items-start gap-2 text-xs">
                          {req.tag === "required" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : req.tag === "watch" ? (
                            <span className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5 flex items-center justify-center font-bold">!</span>
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <span className={req.tag === "watch" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}>
                            {req.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={`/visa/${s.originSlug}/${s.destinationSlug}/${s.visaTypeSlug}`}
                      className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Full requirements <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground border-t border-border/40 pt-4">
              Comparison data is verified against official government sources as at the date shown per corridor.
              Fees, processing times, and thresholds change periodically. Always verify on the official portal
              or with a licensed immigration consultant before applying.
            </p>
          </div>
        )}

        {/* Single selection hint */}
        {selected.length === 1 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add at least one more corridor to see the comparison table.
          </p>
        )}
      </div>
    </div>
  );
}
