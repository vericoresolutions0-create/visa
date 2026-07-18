import type { ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

export function ChecklistFlagsPanel() {
  const flags = useQuery(api.checklistFlags.listPendingFlags, {});
  const reviewFlag = useMutation(api.checklistFlags.reviewFlag);

  const ISSUE_LABELS: Record<string, string> = {
    requirement_changed: "Requirement changed",
    link_broken: "Link broken",
    missing_information: "Missing info",
    incorrect_information: "Incorrect info",
  };

  const handleReview = async (flagId: string, action: "reviewed" | "dismissed") => {
    try {
      await reviewFlag({ flagId: flagId as Parameters<typeof reviewFlag>[0]["flagId"], action });
      toast.success(action === "reviewed" ? "Marked as reviewed" : "Dismissed");
    } catch {
      toast.error("Failed to update flag");
    }
  };

  if (flags === undefined) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif font-semibold text-[#0f2040]">Checklist Accuracy Flags</h2>
          <p className="text-xs text-gray-400 mt-0.5">Submitted by logged-in users who found requirements that may be wrong or outdated.</p>
        </div>
        <span className={cn(
          "text-xs font-bold px-3 py-1 rounded-full border",
          flags.length > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-100"
        )}>
          {flags.length} pending
        </span>
      </div>

      {flags.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">No pending flags</p>
          <p className="text-xs text-gray-400 mt-1">All checklist accuracy flags have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div key={flag._id} className="border border-amber-100 bg-amber-50/40 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-semibold text-sm text-[#0f2040]">{flag.origin} → {flag.destination}</span>
                    <span className="text-xs font-medium bg-white border border-gray-200 text-gray-600 rounded-full px-2 py-0.5">{flag.visaType}</span>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                      {ISSUE_LABELS[flag.issueType] ?? flag.issueType}
                    </span>
                  </div>
                  {flag.requirementTitle && (
                    <p className="text-xs font-medium text-gray-700 mb-1">Requirement: <span className="font-normal">{flag.requirementTitle}</span></p>
                  )}
                  {flag.notes && (
                    <p className="text-xs text-gray-600 leading-relaxed">"{flag.notes}"</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {new Date(flag.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleReview(flag._id, "reviewed")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0f2040] text-white hover:bg-[#0f2040]/90 transition-colors cursor-pointer"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => handleReview(flag._id, "dismissed")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
