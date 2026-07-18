import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Users } from "lucide-react";

export function AIUsagePanel() {
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
