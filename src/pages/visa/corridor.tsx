import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { WaitTimeStat } from "@/components/wait-time-stat.tsx";
import { CorridorAlertSignup } from "@/components/visa/CorridorAlertSignup.tsx";
import { CorridorAgentList } from "@/components/visa/CorridorAgentList.tsx";
import {
  getCorridorDefinition,
  getCorridorVisaType,
  slugToCountry,
  type CorridorVisaType,
} from "@/lib/corridor-data.ts";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  ChevronRight,
  ArrowLeft,
  TrendingUp,
  Info,
  Calculator,
  BookOpen,
  Star,
  AlertCircle,
  Quote,
  Loader2,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const TAG_STYLES = {
  required: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  advisable: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  watch: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
};
const TAG_LABELS = { required: "Required", advisable: "Advisable", watch: "Watch" };
const TAG_ICONS = {
  required: <CheckCircle2 className="h-3.5 w-3.5" />,
  advisable: <Info className="h-3.5 w-3.5" />,
  watch: <AlertTriangle className="h-3.5 w-3.5" />,
};

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
  entrepreneur: "Startup / Entrepreneur",
};

// ── Cost calculator state ────────────────────────────────────────────────────

function CostCalculator({ visaType }: { visaType: CorridorVisaType }) {
  const { costs } = visaType;
  const [optionals, setOptionals] = useState<Record<string, boolean>>({});

  const total = useMemo(() => {
    return costs.items.reduce((sum, item) => {
      if (item.optional && !optionals[item.label]) return sum;
      return sum + Math.round((item.amountMin + item.amountMax) / 2);
    }, 0);
  }, [costs.items, optionals]);

  const totalMin = useMemo(() => {
    return costs.items.reduce((sum, item) => {
      if (item.optional && !optionals[item.label]) return sum;
      return sum + item.amountMin;
    }, 0);
  }, [costs.items, optionals]);

  const totalMax = useMemo(() => {
    return costs.items.reduce((sum, item) => {
      if (item.optional && !optionals[item.label]) return sum;
      return sum + item.amountMax;
    }, 0);
  }, [costs.items, optionals]);

  function fmt(n: number) {
    return n.toLocaleString("en-GB");
  }

  return (
    <div className="space-y-3">
      {costs.items.map((item) => (
        <div
          key={item.label}
          className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
            item.optional
              ? optionals[item.label]
                ? "border-border bg-card"
                : "border-border/40 bg-muted/30 opacity-60"
              : "border-border bg-card"
          }`}
        >
          <div className="flex items-start gap-2 min-w-0">
            {item.optional && (
              <input
                type="checkbox"
                id={`cost-${item.label}`}
                checked={!!optionals[item.label]}
                onChange={(e) =>
                  setOptionals((prev) => ({ ...prev, [item.label]: e.target.checked }))
                }
                className="mt-0.5 shrink-0 h-3.5 w-3.5 cursor-pointer accent-primary"
              />
            )}
            <div className="min-w-0">
              <label
                htmlFor={item.optional ? `cost-${item.label}` : undefined}
                className={`text-sm text-foreground leading-snug ${item.optional ? "cursor-pointer" : ""}`}
              >
                {item.label}
              </label>
              {item.note && (
                <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {item.amountMin === item.amountMax
                ? `${costs.currencySymbol}${fmt(item.amountMin)}`
                : `${costs.currencySymbol}${fmt(item.amountMin)}–${fmt(item.amountMax)}`}
            </span>
            {item.optional && (
              <p className="text-xs text-muted-foreground">optional</p>
            )}
          </div>
        </div>
      ))}

      {/* Total */}
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">Estimated total</p>
          <p className="text-xs text-muted-foreground">
            {totalMin === totalMax
              ? `${costs.currencySymbol}${fmt(totalMin)}`
              : `${costs.currencySymbol}${fmt(totalMin)} – ${costs.currencySymbol}${fmt(totalMax)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary tabular-nums">
            {costs.currencySymbol}{fmt(total)}
          </p>
          <p className="text-xs text-muted-foreground">{costs.currency} midpoint</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Toggle optional items with the checkboxes. Figures are estimates — verify
        current fees on the official government portal before paying.
      </p>
    </div>
  );
}

// ── Rejection stories widget ──────────────────────────────────────────────────

function RejectionWidget({ destination, visaType }: { destination: string; visaType: string }) {
  const stories = useQuery(api.visaCorridors.getApprovedStoriesForCorridor, {
    destination,
    visaType,
  });

  if (stories === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading community stories…
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/30 p-5 text-center">
        <Quote className="h-7 w-7 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">
          No approved stories for this corridor yet.
        </p>
        <Link
          to="/wall-of-fame"
          className="mt-2 inline-block text-sm text-primary hover:underline"
        >
          Share your approval story →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stories.map((s) => (
        <div
          key={s.id.toString()}
          className="rounded-xl border border-border/60 bg-card p-4 space-y-2"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                ✓
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Verified approval</p>
                {s.refusalCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {s.refusalCount} refusal{s.refusalCount !== 1 ? "s" : ""} before approval
                  </p>
                )}
              </div>
            </div>
            <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium px-2.5 py-0.5">
              Approved ✓
            </span>
          </div>
          {s.whatWentWrong && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">What went wrong: </span>
              {s.whatWentWrong}
            </p>
          )}
          {s.whatFixedIt && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">What fixed it: </span>
              {s.whatFixedIt}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(s.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
      ))}
      <Link
        to="/wall-of-fame"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
      >
        Share your story <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ── JSON-LD injection ────────────────────────────────────────────────────────

function useCorridorJsonLd(
  visaType: CorridorVisaType | null,
  origin: string,
  destination: string,
  url: string,
) {
  useEffect(() => {
    if (!visaType) return;
    const existing = document.getElementById("vc-corridor-jsonld");
    if (existing) existing.remove();

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: visaType.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    };

    const howToSchema = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to apply for ${visaType.name} from ${origin} to ${destination}`,
      description: `Step-by-step guide for ${origin} citizens applying for ${visaType.name} to ${destination}.`,
      totalTime: visaType.processingTime,
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: visaType.costs.currency,
        value: visaType.fee,
      },
      url,
      step: visaType.timeline.map((step, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: step.phase,
        text: step.description,
        itemListElement: {
          "@type": "HowToDirection",
          text: `Duration: ${step.duration}`,
        },
      })),
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://visaclear.app" },
        { "@type": "ListItem", position: 2, name: "Visa Guides", item: "https://visaclear.app/visa" },
        { "@type": "ListItem", position: 3, name: `${origin} → ${destination}`, item: url.split("/").slice(0, -1).join("/") },
        { "@type": "ListItem", position: 4, name: visaType.name, item: url },
      ],
    };

    const script = document.createElement("script");
    script.id = "vc-corridor-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify([faqSchema, howToSchema, breadcrumbSchema]);
    document.head.appendChild(script);

    return () => {
      document.getElementById("vc-corridor-jsonld")?.remove();
    };
  }, [visaType, origin, destination, url]);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CorridorPage() {
  const { originSlug, destinationSlug, visaTypeSlug } = useParams<{
    originSlug: string;
    destinationSlug: string;
    visaTypeSlug: string;
  }>();
  const navigate = useNavigate();

  const corridor = useMemo(
    () =>
      originSlug && destinationSlug
        ? getCorridorDefinition(originSlug, destinationSlug)
        : null,
    [originSlug, destinationSlug],
  );

  const visaType = useMemo(
    () =>
      originSlug && destinationSlug && visaTypeSlug
        ? getCorridorVisaType(originSlug, destinationSlug, visaTypeSlug)
        : null,
    [originSlug, destinationSlug, visaTypeSlug],
  );

  const canonicalUrl = `https://visaclear.app/visa/${originSlug}/${destinationSlug}/${visaTypeSlug}`;

  useSeo({
    title: visaType && corridor
      ? `${corridor.originFlag} ${corridor.origin} → ${corridor.destinationFlag} ${corridor.destination}: ${visaType.shortName}`
      : "Visa Corridor",
    description: visaType && corridor
      ? `${visaType.name} from ${corridor.origin} to ${corridor.destination}. Processing: ${visaType.processingTime}. Approval rate: ${visaType.approvalRate}. Real requirements, costs, and community data.`
      : "Visa corridor guide with real requirements, processing times, and costs.",
    canonical: canonicalUrl,
  });

  useCorridorJsonLd(
    visaType,
    corridor?.origin ?? "",
    corridor?.destination ?? "",
    canonicalUrl,
  );

  const [activeTab, setActiveTab] = useState<
    "requirements" | "timeline" | "costs" | "community"
  >("requirements");

  // Corridor not in our data yet
  if (!corridor || !visaType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Corridor not found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We don't have data for{" "}
            {originSlug && destinationSlug
              ? `${slugToCountry(originSlug) ?? originSlug} → ${slugToCountry(destinationSlug) ?? destinationSlug}`
              : "this corridor"}{" "}
            yet.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/visa"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Browse all corridors
            </Link>
            <Link to="/contact" className="text-sm text-primary hover:underline">
              Request this corridor →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const corridorLabel = `${corridor.originFlag} ${corridor.origin} → ${corridor.destinationFlag} ${corridor.destination} (${visaType.shortName})`;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Breadcrumb + back ──────────────────────────────────────────────── */}
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
          <span className="text-foreground font-medium truncate">{corridor.origin} → {corridor.destination}</span>
        </div>
      </div>

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <section className="border-b border-border/40 bg-gradient-to-b from-[#F8F5EF] to-background dark:from-[#141A31] dark:to-background">
        <div className="mx-auto max-w-6xl px-4 py-10">
          {/* Flag route */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 text-3xl">
              <span>{corridor.originFlag}</span>
              <span className="text-muted-foreground text-xl">→</span>
              <span>{corridor.destinationFlag}</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {corridor.origin} → {corridor.destination}
              </p>
              <span
                className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTCOME_BADGE[visaType.outcome] ?? "bg-muted text-muted-foreground"}`}
              >
                {OUTCOME_LABEL[visaType.outcome] ?? visaType.outcome}
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 [text-wrap:balance]">
            {visaType.name}
          </h1>

          {/* Key stats row */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="rounded-xl border border-border/60 bg-card px-4 py-2.5 text-center min-w-[120px]">
              <p className="text-xs text-muted-foreground">Processing time</p>
              <p className="text-sm font-semibold text-foreground mt-0.5 flex items-center gap-1 justify-center">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {visaType.processingTime}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card px-4 py-2.5 text-center min-w-[120px]">
              <p className="text-xs text-muted-foreground">Approval rate</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1 justify-center">
                <TrendingUp className="h-3.5 w-3.5" />
                {visaType.approvalRate}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card px-4 py-2.5 text-center min-w-[120px]">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{visaType.duration}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card px-4 py-2.5 text-center min-w-[120px]">
              <p className="text-xs text-muted-foreground">Gov't fee</p>
              <p className="text-sm font-semibold text-foreground mt-0.5 flex items-center gap-1 justify-center">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                {visaType.fee}
              </p>
            </div>
            {visaType.minIncome && (
              <div className="rounded-xl border border-border/60 bg-card px-4 py-2.5 text-center min-w-[140px]">
                <p className="text-xs text-muted-foreground">Min. income</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{visaType.minIncome}</p>
              </div>
            )}
            {visaType.minScore && (
              <div className="rounded-xl border border-border/60 bg-card px-4 py-2.5 text-center min-w-[140px]">
                <p className="text-xs text-muted-foreground">Min. score</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{visaType.minScore}</p>
              </div>
            )}
          </div>

          {/* Community wait time */}
          <div className="mb-2">
            <WaitTimeStat
              destination={corridor.destination}
              visaType={visaType.name}
              variant="card"
            />
          </div>

          {/* Legal basis */}
          {visaType.legalBasis && (
            <p className="text-xs text-muted-foreground mt-3">
              <span className="font-medium">Legal basis:</span> {visaType.legalBasis}
            </p>
          )}

          {/* Last verified */}
          <p className="text-xs text-muted-foreground mt-1">
            Data verified:{" "}
            {new Date(visaType.lastVerified).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}
          </p>

          {/* Visa type tabs (other visas on this corridor) */}
          {corridor.visaTypes.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {corridor.visaTypes.map((vt) => (
                <Link
                  key={vt.slug}
                  to={`/visa/${originSlug}/${destinationSlug}/${vt.slug}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                    vt.slug === visaTypeSlug
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-card"
                  }`}
                >
                  {vt.shortName}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left column (main content) ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Tab navigation */}
          <div className="flex gap-1 rounded-xl border border-border/50 bg-muted/30 p-1 overflow-x-auto">
            {(
              [
                { id: "requirements", label: "Requirements", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
                { id: "timeline", label: "Timeline", icon: <Clock className="h-3.5 w-3.5" /> },
                { id: "costs", label: "Cost Calculator", icon: <Calculator className="h-3.5 w-3.5" /> },
                { id: "community", label: "Community", icon: <Users className="h-3.5 w-3.5" /> },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Requirements tab ──────────────────────────────────────────── */}
          {activeTab === "requirements" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Visa requirements
                </h2>

                {/* Legend */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(["required", "advisable", "watch"] as const).map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TAG_STYLES[tag]}`}
                    >
                      {TAG_ICONS[tag]}
                      {TAG_LABELS[tag]}
                    </span>
                  ))}
                </div>

                <div className="space-y-3">
                  {visaType.requirements.map((req, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/60 bg-card p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground leading-snug">{req.name}</p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${TAG_STYLES[req.tag]}`}
                        >
                          {TAG_ICONS[req.tag]}
                          {TAG_LABELS[req.tag]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{req.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common mistakes */}
              {visaType.commonMistakes.length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Common mistakes that get applications rejected
                  </h3>
                  <ul className="space-y-2">
                    {visaType.commonMistakes.map((mistake, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 px-3.5 py-2.5"
                      >
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── Timeline tab ─────────────────────────────────────────────── */}
          {activeTab === "timeline" && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Application timeline
              </h2>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border/60" />
                <div className="space-y-0">
                  {visaType.timeline.map((step, i) => (
                    <div key={i} className="relative flex gap-5 pb-8 last:pb-0">
                      {/* Step dot */}
                      <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/30 bg-background shrink-0">
                        <span className="text-xs font-bold text-primary">{i + 1}</span>
                      </div>
                      <div className="pt-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-semibold text-foreground">{step.phase}</h3>
                          <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">
                            {step.duration}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Costs tab ────────────────────────────────────────────────── */}
          {activeTab === "costs" && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Cost calculator
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Toggle optional items to build your personal cost estimate. All figures in{" "}
                <span className="font-medium">{visaType.costs.currency}</span>.
              </p>
              <CostCalculator visaType={visaType} />
            </div>
          )}

          {/* ── Community tab ────────────────────────────────────────────── */}
          {activeTab === "community" && (
            <div className="space-y-6">
              {/* Approval stories */}
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Approved applicant stories
                </h2>
                <RejectionWidget
                  destination={corridor.destination}
                  visaType={visaType.name}
                />
              </div>

              {/* Community wait time (already shown in header too but useful as full card here) */}
              <div>
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Community wait time data
                </h2>
                <WaitTimeStat
                  destination={corridor.destination}
                  visaType={visaType.name}
                  variant="card"
                />
              </div>
            </div>
          )}

          {/* ── FAQs ─────────────────────────────────────────────────────── */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {visaType.faqs.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-border/60 bg-card"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-foreground list-none select-none">
                    {faq.q}
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="border-t border-border/40 px-4 py-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column (sidebar) ────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Policy alert signup */}
          <CorridorAlertSignup
            origin={corridor.origin}
            destination={corridor.destination}
            visaType={visaType.name}
            corridorLabel={corridorLabel}
          />

          {/* Verified agents */}
          <div>
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Verified agents for {corridor.destination}
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              Licensed immigration consultants who specialise in{" "}
              {corridor.origin} → {corridor.destination} applications.
            </p>
            <CorridorAgentList
              destination={corridor.destination}
            />
          </div>

          {/* Compare CTA */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
            <h3 className="text-sm font-bold text-foreground mb-1">Compare this route</h3>
            <p className="text-xs text-muted-foreground mb-3">
              See how {corridor.destination} compares against other destinations side-by-side.
            </p>
            <Link
              to="/visa/compare"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Open comparison tool <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                This guide is for informational purposes only and does not constitute
                legal or immigration advice. Always verify current requirements on the
                official government portal or with a licensed immigration consultant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Globe icon used in the not-found fallback
function Globe({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <ellipse cx="12" cy="12" rx="4" ry="10" />
      <path d="M2 12h20" />
    </svg>
  );
}
