import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export function AiFeedbackPanel() {
  const [filter, setFilter] = useState<"all" | "up" | "down">("down");
  const rows = useQuery(api.aiFeedback.listFeedback, filter === "all" ? {} : { filter });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-serif font-semibold text-[#0f2040]">AI Assistant Feedback</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Real thumbs up/down from users on the checklist AI Assistant's answers — the actual question and answer behind each rating.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["down", "up", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer",
                filter === f ? "bg-[#0f2040] text-white border-[#0f2040]" : "border-gray-200 text-gray-500 hover:border-gray-300",
              )}
            >
              {f === "down" ? "👎 Not helpful" : f === "up" ? "👍 Helpful" : "All"}
            </button>
          ))}
        </div>
      </div>

      {rows === undefined ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <Brain className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">No feedback yet</p>
          <p className="text-xs text-gray-400 mt-1">
            {filter === "down" ? "No negative ratings — nothing to review right now." : "Nothing recorded for this filter yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row._id} className={cn(
              "border rounded-xl p-4",
              row.feedback === "down" ? "border-red-100 bg-red-50/30" : "border-green-100 bg-green-50/30",
            )}>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full border",
                  row.feedback === "down" ? "bg-red-100 text-red-700 border-red-200" : "bg-green-100 text-green-700 border-green-200",
                )}>
                  {row.feedback === "down" ? "👎 Not helpful" : "👍 Helpful"}
                </span>
                <span className="text-xs font-medium bg-white border border-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                  {row.origin} → {row.destination} · {row.visaType}
                </span>
                <span className="text-[11px] text-gray-400 ml-auto">{new Date(row.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Q: <span className="font-normal">{row.question}</span></p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap">A: {row.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
