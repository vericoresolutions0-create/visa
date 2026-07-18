import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

export function DataFreshnessPanel() {
  const { t } = useTranslation("admin");
  const report = useQuery(api.dataFreshness.getFreshnessReport, {});
  const markVerified = useMutation(api.dataFreshness.markVerified);
  const [verifying, setVerifying] = useState<string | null>(null);

  const handleMarkVerified = async (destination: string) => {
    setVerifying(destination);
    try {
      await markVerified({ destination });
      toast.success(`${destination} marked as reviewed.`);
    } catch {
      toast.error("Could not update. Please try again.");
    } finally {
      setVerifying(null);
    }
  };

  const staleCount = report?.filter((r) => r.isStale).length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
            {t("freshness.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("freshness.description")}
          </p>
        </div>
        {report && staleCount > 0 && (
          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            {staleCount} stale
          </span>
        )}
      </div>
      {report === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="space-y-2">
          {report.map((row) => (
            <div
              key={row.destination}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
            >
              <div className="shrink-0">
                {row.isStale ? (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{row.destination}</div>
                <div className="text-xs text-muted-foreground">
                  {t(row.visaTypeCount === 1 ? "freshness.visa_type_one" : "freshness.visa_type_other", { count: row.visaTypeCount })}
                </div>
              </div>
              <div className="text-right shrink-0 mr-3">
                <div className={cn("text-xs font-semibold", row.isStale ? "text-amber-700" : "text-muted-foreground")}>
                  {t("freshness.days_ago", { days: row.daysSinceVerified })}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {row.lastVerified}
                  {row.hasDbRecord && <span className="ml-1 text-green-600">✓ live</span>}
                </div>
              </div>
              <button
                onClick={() => { void handleMarkVerified(row.destination); }}
                disabled={verifying === row.destination}
                className={cn(
                  "shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer",
                  row.isStale
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary",
                  verifying === row.destination && "opacity-50 cursor-not-allowed",
                )}
              >
                {verifying === row.destination ? "Saving…" : "Mark Reviewed"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
