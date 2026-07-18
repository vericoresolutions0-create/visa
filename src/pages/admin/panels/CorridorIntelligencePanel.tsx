import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export function CorridorIntelligencePanel() {
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
