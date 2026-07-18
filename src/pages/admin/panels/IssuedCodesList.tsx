import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

export function IssuedCodesList() {
  const { t } = useTranslation("admin");
  const codes = useQuery(api.licenseCodes.listLicenseCodes, {});
  if (codes === undefined) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (codes.length === 0) {
    return <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">{t("license.empty")}</div>;
  }
  const now = Date.now();
  return (
    <div className="bg-card border border-border rounded-xl divide-y divide-border">
      {codes.map((c) => {
        const statusKey = c.redeemedAt ? "redeemed" : new Date(c.expiresAt).getTime() < now ? "expired" : "pending";
        return (
          <div key={c._id} className="flex items-center justify-between px-4 py-2.5 text-xs gap-3">
            <div className="min-w-0">
              <span className="font-mono font-semibold text-foreground">{c.code}</span>
              <span className="text-muted-foreground ml-2">{c.email} · {c.plan}</span>
            </div>
            <span className={cn(
              "shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
              statusKey === "redeemed" ? "bg-green-50 text-green-700 border-green-200" : statusKey === "expired" ? "bg-muted text-muted-foreground border-border" : "bg-amber-50 text-amber-700 border-amber-200",
            )}>
              {t(`license.status_${statusKey}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
