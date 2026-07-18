import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export function MarketplaceLeadsAdminPanel() {
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
