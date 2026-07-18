import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Settings } from "lucide-react";

export function AuditLogPanel() {
  const { t } = useTranslation("admin");
  const entries = useQuery(api.admin.getAuditLog, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("audit.title")}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("audit.description")}
      </p>
      {entries === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : entries.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("audit.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry._id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <Settings className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {entry.action} {entry.details ? `— ${entry.details}` : ""}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t("audit.by", { email: entry.adminEmail ?? t("audit.unknown_admin") })} · {new Date(entry.createdAt).toLocaleString("en-GB")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
