import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Copy, Sparkles, Search } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";
import { COUNTRY_REGION } from "@/lib/country-region.ts";
import { EMBASSY_MONITOR_URLS } from "@/lib/embassy-monitor-urls.ts";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import type { EmbassyRegion } from "@/lib/embassy-monitor-urls.ts";

type MonitorRowStatus = "changed" | "stale" | "ok" | "unchecked";

// Same 9-day grace window as convex/systemHealth.ts's EMBASSY_MONITOR_STALE_MS
// (cron runs weekly) — kept in sync manually since one is server-side config
// and the other drives this table's per-row badge.
const EMBASSY_STALE_MS = 9 * 24 * 60 * 60 * 1000;

type MonitorRow = {
  destination: string;
  region: EmbassyRegion;
  url: string;
  status: MonitorRowStatus;
  lastCheckedAt: string | null;
  changedAt: string | null;
  snapshotId: Id<"embassy_page_snapshots"> | null;
};

const MONITOR_REGIONS: EmbassyRegion[] = ["Africa", "Americas", "Asia", "Europe", "Middle East", "Oceania"];

export function EmbassyMonitorPanel() {
  const alerts = useQuery(api.embassyData.listActiveAlerts, {});
  const allSnapshots = useQuery(api.embassyData.listAllSnapshots, {});
  const dismiss = useMutation(api.embassyData.dismissAlert);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<EmbassyRegion | "all" | "alerts" | "stale">("all");

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

  // Formats the real stored summary + real diff sentences into ready-to-paste
  // text — nothing here is generated at copy time, it's exactly what's
  // already stored on the row (which itself came from a real page diff).
  const copyForBlog = async (row: Doc<"embassy_page_snapshots">) => {
    const dateStr = row.changedAt
      ? new Date(row.changedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
      : "";
    const lines: string[] = [`${row.destination} — Visa/Immigration Update (${dateStr})`, ""];
    if (row.aiSummary) lines.push(row.aiSummary, "");
    if (row.aiChangeAdded?.length || row.aiChangeRemoved?.length) {
      lines.push("What changed on the official page:");
      for (const s of row.aiChangeAdded ?? []) lines.push(`+ ${s}`);
      for (const s of row.aiChangeRemoved ?? []) lines.push(`− ${s}`);
      lines.push("");
    }
    lines.push(`Source: ${row.url}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Copied — ready to paste into your blog post.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  // The monitor only ever covers the destinations wired into
  // EMBASSY_MONITOR_URLS — merge that fixed list with whatever snapshot
  // data exists for each one. A destination is only ever added here once a
  // real, verified official URL exists for it — never a placeholder.
  const monitoredDestinations = Object.keys(EMBASSY_MONITOR_URLS);

  const rows: MonitorRow[] | undefined = allSnapshots === undefined ? undefined : (() => {
    const byDestination = new Map(allSnapshots.map((r) => [r.destination, r]));
    return monitoredDestinations.map((destination): MonitorRow => {
      const snap = byDestination.get(destination);
      const url = EMBASSY_MONITOR_URLS[destination];
      if (snap) {
        const isStale = Date.now() - new Date(snap.lastCheckedAt).getTime() > EMBASSY_STALE_MS;
        return {
          destination,
          region: COUNTRY_REGION[destination],
          url: snap.url,
          status: snap.changedAt && !snap.alertDismissedAt ? "changed" : isStale ? "stale" : "ok",
          lastCheckedAt: snap.lastCheckedAt,
          changedAt: snap.changedAt ?? null,
          snapshotId: snap._id,
        };
      }
      return {
        destination,
        region: COUNTRY_REGION[destination],
        url,
        status: "unchecked",
        lastCheckedAt: null,
        changedAt: null,
        snapshotId: null,
      };
    });
  })();

  const counts = rows === undefined ? null : {
    total: rows.length,
    alerts: rows.filter((r) => r.status === "changed").length,
    checkedThisWeek: rows.filter((r) => r.lastCheckedAt).length,
    stale: rows.filter((r) => r.status === "stale").length,
  };

  const filteredRows = rows?.filter((r) => {
    if (search && !r.destination.toLowerCase().includes(search.toLowerCase())) return false;
    if (regionFilter === "alerts") return r.status === "changed";
    if (regionFilter === "stale") return r.status === "stale";
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
          stored baseline. A change alert fires when the content differs — review the linked page and update the
          checklist if needed.
        </p>
      </div>

      {/* Coverage stats */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Monitored</p>
            <p className="text-xl font-semibold text-[#0f2040] mt-1">{counts.total}</p>
          </div>
          <div className="border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Active alerts</p>
            <p className="text-xl font-semibold text-[#0f2040] mt-1">{counts.alerts}</p>
          </div>
          <div className={cn("border rounded-xl px-4 py-3", counts.stale > 0 ? "border-red-200 bg-red-50/40" : "border-gray-100")}>
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider", counts.stale > 0 ? "text-red-600" : "text-gray-400")}>Stale (9d+)</p>
            <p className={cn("text-xl font-semibold mt-1", counts.stale > 0 ? "text-red-700" : "text-[#0f2040]")}>{counts.stale}</p>
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
          <div className="space-y-4">
            {alerts.map((row) => (
              <div key={row._id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{DESTINATION_FLAGS[row.destination] ?? "🌍"}</span>
                    <div>
                      <p className="text-sm font-bold text-[#0f2040]">{row.destination}</p>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {row.url.replace(/^https?:\/\//, "")} · detected {row.changedAt ? new Date(row.changedAt).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                  {row.aiSeverity && (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                      row.aiSeverity === "critical" ? "bg-red-50 text-red-700" : "bg-amber-100 text-amber-700",
                    )}>
                      {row.aiSeverity === "critical" ? "Critical change" : "Notable change"}
                    </span>
                  )}
                </div>

                {row.aiSummary ? (
                  <div className="mx-5 mt-4 px-4 py-3 bg-[#faf5e9] border border-[#e3cd97] rounded-xl">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#a4761f] mb-1.5">
                      <Sparkles className="w-3 h-3" /> AI summary of the real diff
                    </p>
                    <p className="text-[13px] font-medium text-[#0f2040] leading-relaxed">{row.aiSummary}</p>
                  </div>
                ) : (
                  <div className="mx-5 mt-4 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <p className="text-[12.5px] font-medium text-gray-500">
                      No AI summary available for this change — review the page directly using the link below.
                    </p>
                  </div>
                )}

                {(row.aiChangeAdded?.length || row.aiChangeRemoved?.length) ? (
                  <div className="mx-5 mt-3 border border-gray-100 rounded-xl overflow-hidden grid grid-cols-1 sm:grid-cols-2">
                    <div className="p-3 bg-red-50/60 border-b sm:border-b-0 sm:border-r border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-red-700 mb-2">Removed from the page</p>
                      {row.aiChangeRemoved?.length ? (
                        <ul className="space-y-1.5">
                          {row.aiChangeRemoved.map((s, i) => (
                            <li key={i} className="text-[11.5px] font-medium text-gray-700 leading-snug">{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11.5px] text-gray-400 font-medium">Nothing removed.</p>
                      )}
                    </div>
                    <div className="p-3 bg-green-50/60">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-green-700 mb-2">Added to the page</p>
                      {row.aiChangeAdded?.length ? (
                        <ul className="space-y-1.5">
                          {row.aiChangeAdded.map((s, i) => (
                            <li key={i} className="text-[11.5px] font-medium text-gray-700 leading-snug">{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11.5px] text-gray-400 font-medium">Nothing added.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3 px-5 py-3.5 flex-wrap">
                  <a href={/^https?:\/\//.test(row.url) ? row.url : "#"} target="_blank" rel="noopener noreferrer" className="text-[11.5px] text-blue-600 hover:underline font-semibold">
                    ↗ View the real page
                  </a>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!row.aiSummary}
                      onClick={() => void copyForBlog(row)}
                      className="cursor-pointer text-xs gap-1.5"
                    >
                      <Copy className="w-3 h-3" /> Copy for Blog
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={dismissing === row.destination}
                      onClick={() => void handleDismiss(row.destination)}
                      className="cursor-pointer text-xs"
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
          {counts && counts.stale > 0 && (
            <button
              onClick={() => setRegionFilter("stale")}
              className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer", regionFilter === "stale" ? "bg-red-600 text-white border-red-600" : "border-red-200 text-red-700 hover:border-red-300")}
            >
              Stale <span className="opacity-70 font-medium">{counts.stale}</span>
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
                        <tr key={row.destination} className="border-b border-gray-50 last:border-b-0">
                          <td className="py-2 pr-4">
                            <span className="font-medium text-[#0f2040]">{row.destination}</span>
                            <a href={row.url} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-blue-600 hover:underline truncate max-w-[280px]">{row.url.replace(/^https?:\/\//, "")}</a>
                          </td>
                          <td className="py-2 pr-4 text-gray-500">{row.lastCheckedAt ? new Date(row.lastCheckedAt).toLocaleDateString() : "—"}</td>
                          <td className="py-2">
                            {row.status === "changed" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Changed</span>}
                            {row.status === "stale" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Stale — hasn't succeeded in 9+ days</span>}
                            {row.status === "ok" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">OK</span>}
                            {row.status === "unchecked" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">Awaiting first check</span>}
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
