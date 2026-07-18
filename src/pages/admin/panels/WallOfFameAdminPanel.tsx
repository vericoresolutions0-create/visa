import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.js";

export function WallOfFameAdminPanel() {
  const { t } = useTranslation("admin");
  const pending = useQuery(api.wallOfFame.listPendingStories, {});
  const moderate = useMutation(api.wallOfFame.moderateStory);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleModerate = async (storyId: string, decision: "approved" | "rejected") => {
    setProcessingId(storyId);
    try {
      await moderate({ storyId: storyId as Id<"wall_of_fame_stories">, decision });
      toast.success(decision === "approved" ? t("wof.toast_approved") : t("wof.toast_rejected"));
    } catch {
      toast.error(t("wof.toast_error"));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("wof.pending_stories", { count: pending?.length ?? 0 })}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("wof.description")}
      </p>
      {pending === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : pending.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("wof.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((story) => (
            <div key={story._id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-primary">
                  {story.destination} · {story.visaType} · refused {story.refusalCount}×
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(story.createdAt).toLocaleString("en-GB")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1"><span className="font-semibold">{t("wof.went_wrong")}</span> {story.whatWentWrong}</p>
              <p className="text-xs text-muted-foreground mb-3"><span className="font-semibold">{t("wof.fixed_it")}</span> {story.whatFixedIt}</p>
              <div className="flex gap-2">
                <button
                  disabled={processingId === story._id}
                  onClick={() => { void handleModerate(story._id, "approved"); }}
                  className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t("wof.approve")}
                </button>
                <button
                  disabled={processingId === story._id}
                  onClick={() => { void handleModerate(story._id, "rejected"); }}
                  className="flex items-center gap-1 text-xs font-semibold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> {t("wof.reject")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
