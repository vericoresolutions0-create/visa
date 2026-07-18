import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.js";

export function AgentReviewModerationPanel() {
  const pending = useQuery(api.agentReviews.listPending, {});
  const moderate = useMutation(api.agentReviews.moderate);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleDecision = async (reviewId: Id<"agent_reviews">, decision: "approved" | "rejected") => {
    setProcessing(reviewId);
    try {
      await moderate({ reviewId, decision });
      toast.success(decision === "approved" ? "Review approved and published." : "Review rejected.");
    } catch {
      toast.error("Could not moderate review.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-serif text-base font-semibold text-[#0f2040] mb-1">Pending Reviews</h3>
      <p className="text-xs text-gray-400 mb-4">Reviews submitted by users waiting for approval before going public on agent profiles.</p>
      {pending === undefined ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-gray-400">No pending reviews.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((review) => (
            <div key={review._id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={cn("w-3.5 h-3.5", n <= review.starRating ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
                    ))}
                  </div>
                  {review.comment && <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Agent: <span className="font-mono">{review.agentProfileId}</span>
                    {" · "}{new Date(review.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={processing === review._id}
                    onClick={() => void handleDecision(review._id, "approved")}
                    className="text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    disabled={processing === review._id}
                    onClick={() => void handleDecision(review._id, "rejected")}
                    className="text-xs font-semibold text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Reject
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
