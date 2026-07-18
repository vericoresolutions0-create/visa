import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";


// Added 2026-07-18 alongside convex/emails/sendEmail.ts's retry-and-record
// hardening — previously a failed password-reset/invite/reminder email was
// only ever a console.error, invisible to everyone. This is the queue that
// makes it visible: unresolved failures first (the ones needing a look),
// a handful of recently-resolved ones for context underneath.
export function EmailDeliveryPanel() {
  const data = useQuery(api.emails.emailFailures.listRecent, {});
  const markReviewed = useMutation(api.emails.emailFailures.markReviewed);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const handleReview = async (failureId: string) => {
    setReviewingId(failureId);
    try {
      await markReviewed({ failureId: failureId as Parameters<typeof markReviewed>[0]["failureId"] });
      toast.success("Marked as reviewed");
    } catch {
      toast.error("Failed to update");
    } finally {
      setReviewingId(null);
    }
  };

  if (data === undefined) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }

  const { unresolved, recentResolved } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-serif font-semibold text-[#0f2040]">Email Delivery</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Real Resend delivery failures — every email is retried 3 times before landing here, so anything shown is a real problem, not a blip.
          </p>
        </div>
        <span className={cn(
          "text-xs font-bold px-3 py-1 rounded-full border",
          unresolved.length > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-100"
        )}>
          {unresolved.length} unresolved
        </span>
      </div>

      {unresolved.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">No unresolved failures</p>
          <p className="text-xs text-gray-400 mt-1">Every email sent recently either delivered or was retried successfully.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unresolved.map((failure) => (
            <div key={failure._id} className="border border-red-100 bg-red-50/40 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-semibold text-sm text-[#0f2040] truncate">{failure.to}</span>
                    <span className="text-xs font-semibold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
                      {failure.attempts} attempts, all failed
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-700 mb-1">{failure.subject}</p>
                  <p className="text-xs text-gray-500 font-mono truncate">{failure.errorMessage}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {new Date(failure.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button
                  onClick={() => { void handleReview(failure._id); }}
                  disabled={reviewingId === failure._id}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0f2040] text-white hover:bg-[#0f2040]/90 transition-colors cursor-pointer disabled:opacity-60"
                >
                  Mark Reviewed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {recentResolved.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Recently resolved</p>
          <div className="space-y-2">
            {recentResolved.map((failure) => (
              <div key={failure._id} className="border border-gray-100 rounded-xl p-3 opacity-70">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-xs text-gray-600 truncate">{failure.to}</span>
                  <span className="text-xs text-gray-400 truncate">— {failure.subject}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
