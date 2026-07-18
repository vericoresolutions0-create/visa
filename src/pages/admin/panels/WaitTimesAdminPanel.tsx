import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

export function WaitTimesAdminPanel() {
  const { t } = useTranslation("admin");
  const overview = useQuery(api.waitTimeTracker.getAdminOverview, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("wait.heading", { count: overview?.totalReports ?? 0 })}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("wait.description")}
      </p>
      {overview === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : overview.routes.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("wait.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {overview.routes.map((r) => (
            <div key={r.route} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2.5">
              <span className="text-sm text-foreground">{r.route}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t(r.count === 1 ? "wait.report_one" : "wait.report_other", { count: r.count })}</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  r.hasEnoughData ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                )}>
                  {r.hasEnoughData ? t("wait.public") : t("wait.gathering")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
