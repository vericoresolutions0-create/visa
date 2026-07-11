import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, TrendingUp, Globe2, ChevronRight } from "lucide-react";
import { useSeo } from "@/hooks/use-seo.ts";
import { WORLD_DESTINATIONS } from "@/lib/countries.ts";
import {
  POPULAR_CORRIDORS,
  TRENDING_SEARCHES,
  countryToSlug,
  getCorridorDefinition,
} from "@/lib/corridor-data.ts";

// ── Outcome badge colours ────────────────────────────────────────────────────
const OUTCOME_COLORS: Record<string, string> = {
  permanent_residence: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  temporary_work: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  study: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  visit: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  entrepreneur: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};
const OUTCOME_LABELS: Record<string, string> = {
  permanent_residence: "Permanent Residence",
  temporary_work: "Work Visa",
  study: "Study",
  visit: "Visitor",
  entrepreneur: "Startup / Entrepreneur",
};

// Destinations available in the app (filter to plain country names only)
const SEARCHABLE_DESTINATIONS = WORLD_DESTINATIONS.filter(
  (d) => !d.includes("(") && d.length > 0,
);

export default function VisaHubPage() {
  useSeo({
    title: "Visa Corridor Guide",
    description:
      "Explore real requirements, processing times, costs, and approval rates for every major visa corridor. Find a verified agent to guide your application.",
    canonical: "https://visaclear.app/visa",
  });

  const navigate = useNavigate();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originSearch, setOriginSearch] = useState("");
  const [destSearch, setDestSearch] = useState("");
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const filteredOrigins = useMemo(() => {
    if (!originSearch) return SEARCHABLE_DESTINATIONS.slice(0, 8);
    const q = originSearch.toLowerCase();
    return SEARCHABLE_DESTINATIONS.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [originSearch]);

  const filteredDests = useMemo(() => {
    if (!destSearch) return SEARCHABLE_DESTINATIONS.slice(0, 8);
    const q = destSearch.toLowerCase();
    return SEARCHABLE_DESTINATIONS.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [destSearch]);

  function handleSearch() {
    if (!origin || !destination) return;
    const oSlug = countryToSlug(origin);
    const dSlug = countryToSlug(destination);
    const corridor = getCorridorDefinition(oSlug, dSlug);
    if (corridor && corridor.visaTypes.length > 0) {
      navigate(`/visa/${oSlug}/${dSlug}/${corridor.visaTypes[0].slug}`);
    } else {
      // Corridor not yet in our data — navigate to corridor root for graceful 404
      navigate(`/visa/${oSlug}/${dSlug}`);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-[#F8F5EF] to-background dark:from-[#141A31] dark:to-background"
        aria-label="Visa corridor search"
      >
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-6 uppercase tracking-wide">
            <Globe2 className="h-3.5 w-3.5" />
            Visa Intelligence
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight [text-wrap:balance]">
            Know exactly what your visa requires —<br className="hidden sm:block" />
            before you spend a penny
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto [text-wrap:balance]">
            Real requirements, real processing times, real costs. Every major corridor,
            verified against official government sources.
          </p>

          {/* Search widget */}
          <div className="mt-10 mx-auto max-w-2xl">
            <div className="rounded-2xl border border-border/60 bg-card shadow-lg p-2 flex flex-col sm:flex-row gap-2">
              {/* Origin */}
              <div className="relative flex-1">
                <label className="sr-only">Where are you from?</label>
                <input
                  type="text"
                  placeholder="Where are you from?"
                  value={originSearch || origin}
                  onChange={(e) => {
                    setOriginSearch(e.target.value);
                    setOrigin("");
                    setShowOriginDropdown(true);
                  }}
                  onFocus={() => setShowOriginDropdown(true)}
                  onBlur={() => setTimeout(() => setShowOriginDropdown(false), 150)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {showOriginDropdown && filteredOrigins.length > 0 && (
                  <ul className="absolute z-30 left-0 right-0 top-full mt-1 rounded-xl border border-border bg-popover shadow-lg max-h-52 overflow-y-auto text-left">
                    {filteredOrigins.map((c) => (
                      <li key={c}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent text-left"
                          onMouseDown={() => {
                            setOrigin(c);
                            setOriginSearch(c);
                            setShowOriginDropdown(false);
                          }}
                        >
                          {c}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="hidden sm:flex items-center text-muted-foreground px-1">
                <ChevronRight className="h-4 w-4" />
              </div>

              {/* Destination */}
              <div className="relative flex-1">
                <label className="sr-only">Where do you want to go?</label>
                <input
                  type="text"
                  placeholder="Where do you want to go?"
                  value={destSearch || destination}
                  onChange={(e) => {
                    setDestSearch(e.target.value);
                    setDestination("");
                    setShowDestDropdown(true);
                  }}
                  onFocus={() => setShowDestDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDestDropdown(false), 150)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {showDestDropdown && filteredDests.length > 0 && (
                  <ul className="absolute z-30 left-0 right-0 top-full mt-1 rounded-xl border border-border bg-popover shadow-lg max-h-52 overflow-y-auto text-left">
                    {filteredDests.map((c) => (
                      <li key={c}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent text-left"
                          onMouseDown={() => {
                            setDestination(c);
                            setDestSearch(c);
                            setShowDestDropdown(false);
                          }}
                        >
                          {c}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                onClick={handleSearch}
                disabled={!origin || !destination}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>

          {/* Trending searches */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Trending:</span>
            {TRENDING_SEARCHES.slice(0, 5).map((t) => (
              <Link
                key={t.label}
                to={`/visa/${t.originSlug}/${t.destinationSlug}/${t.visaTypeSlug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <span>{t.originFlag}</span>
                <span>→</span>
                <span>{t.destinationFlag}</span>
                <span className="hidden xs:inline">{t.label.split("→")[1]?.trim()}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular corridors ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14" aria-label="Popular visa corridors">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">Popular Corridors</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Most searched routes</h2>
          </div>
          <Link
            to="/visa/compare"
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
          >
            Compare corridors <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_CORRIDORS.map((corridor) => {
            const corridorDef = getCorridorDefinition(corridor.originSlug, corridor.destinationSlug);
            const firstVisa = corridorDef?.visaTypes[0];
            return (
              <Link
                key={`${corridor.originSlug}/${corridor.destinationSlug}`}
                to={
                  firstVisa
                    ? `/visa/${corridor.originSlug}/${corridor.destinationSlug}/${firstVisa.slug}`
                    : `/visa/${corridor.originSlug}/${corridor.destinationSlug}`
                }
                className="group rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all"
              >
                {/* Route header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 text-2xl">
                    <span>{corridor.originFlag}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{corridor.destinationFlag}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{corridor.origin}</p>
                    <p className="text-sm font-semibold text-foreground">{corridor.destination}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-lg bg-muted/60 px-2.5 py-1 text-center">
                    <p className="text-xs text-muted-foreground">Approval rate</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{corridor.approvalRate}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2.5 py-1 text-center">
                    <p className="text-xs text-muted-foreground">Visa types</p>
                    <p className="text-sm font-bold text-foreground">{corridor.visaTypeCount}</p>
                  </div>
                </div>

                {/* Visa types list */}
                {corridorDef && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {corridorDef.visaTypes.map((vt) => (
                      <span
                        key={vt.slug}
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTCOME_COLORS[vt.outcome] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {vt.shortName}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">Highlight: {corridor.highlightVisaType}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Outcome filter pills ──────────────────────────────────────────────── */}
      <section className="border-t border-border/40 bg-muted/30 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-lg font-bold text-foreground mb-5">Browse by outcome</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(OUTCOME_LABELS).map(([key, label]) => (
              <span
                key={key}
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium cursor-default ${OUTCOME_COLORS[key]}`}
              >
                {label}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            More corridors are added regularly. Can't find yours?{" "}
            <Link to="/contact" className="text-primary hover:underline font-medium">
              Request a corridor
            </Link>{" "}
            and we'll prioritise it.
          </p>
        </div>
      </section>

      {/* ── Compare CTA ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Choosing between destinations?</h2>
            <p className="text-muted-foreground text-sm max-w-lg">
              Side-by-side comparison of processing times, fees, salary thresholds, and approval rates — across multiple corridors at once.
            </p>
          </div>
          <Link
            to="/visa/compare"
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Compare corridors <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
