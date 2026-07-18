import type { ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Award } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

export function ApprovalsAdminPanel() {
  const stories = useQuery(api.approvalStories.listPendingStories, {});
  const moderateStory = useMutation(api.approvalStories.moderateStory);

  const ATTEMPTS_LABEL: Record<number, string> = {
    1: "First attempt",
    2: "Second attempt",
    3: "Third attempt or more",
  };

  const handleModerate = async (storyId: string, action: "approved" | "rejected") => {
    try {
      await moderateStory({ storyId: storyId as Parameters<typeof moderateStory>[0]["storyId"], action });
      toast.success(action === "approved" ? "Story approved and published" : "Story rejected");
    } catch {
      toast.error("Failed to update story");
    }
  };

  if (stories === undefined) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif font-semibold text-[#0f2040]">Approval Stories</h2>
          <p className="text-xs text-gray-400 mt-0.5">Submitted by paid members. Review before publishing to the public approvals page.</p>
        </div>
        <span className={cn(
          "text-xs font-bold px-3 py-1 rounded-full border",
          (stories.length > 0) ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-100"
        )}>
          {stories.length} pending
        </span>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-16">
          <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">No stories pending review</p>
          <p className="text-xs text-gray-400 mt-1">Approved stories appear on the public /approvals page and on each corridor page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map((story) => (
            <div key={story._id} className="border border-gray-200 bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-semibold text-sm text-[#0f2040]">{story.origin} → {story.destination}</span>
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{story.visaType}</span>
                    <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                      {ATTEMPTS_LABEL[story.attempts] ?? `${story.attempts} attempts`}
                    </span>
                  </div>
                  {story.shortNote && (
                    <p className="text-sm text-gray-700 leading-relaxed italic">"{story.shortNote}"</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {new Date(story.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleModerate(story._id, "approved")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleModerate(story._id, "rejected")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
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
