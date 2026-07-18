import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { IssueCodeControl } from "./IssueCodeControl.tsx";
import { IssuedCodesList } from "./IssuedCodesList.tsx";

export function LeadsAdminPanel() {
  const { t } = useTranslation("admin");
  const applications = useQuery(api.whitelabel.list, {});
  const subscribers = useQuery(api.newsletter.list, {});
  const markRead = useMutation(api.whitelabel.markRead);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
          {t("leads.applications_heading", { count: applications?.filter((a) => !a.read).length ?? 0 })}
        </h3>
        {applications === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : applications.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("leads.applications_empty")}
          </div>
        ) : (
          <div className="space-y-2">
            {applications.map((app) => (
              <div key={app._id} className={cn("bg-card border rounded-xl p-4", app.read ? "border-border" : "border-accent/40")}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-primary">{app.agencyName}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(app.createdAt).toLocaleString("en-GB")}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {app.email}{app.phone ? ` · ${app.phone}` : ""}{app.country ? ` · ${app.country}` : ""} · {t("leads.plan_label")} <span className="font-semibold text-foreground">{app.plan}</span>
                </div>
                {app.message && <p className="text-xs text-muted-foreground mb-2">{app.message}</p>}
                {!app.read && (
                  <button
                    onClick={() => { void markRead({ id: app._id }); }}
                    className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                  >
                    {t("leads.mark_read")}
                  </button>
                )}
                <IssueCodeControl applicationId={app._id} email={app.email} requestedPlan={app.plan} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("leads.license_codes_heading")}</h3>
        <IssuedCodesList />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
          {t("leads.subscribers_heading", { count: subscribers?.length ?? 0 })}
        </h3>
        {subscribers === undefined ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : subscribers.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("leads.subscribers_empty")}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {subscribers.map((s) => (
              <div key={s._id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-foreground">{s.email}</span>
                <span className="text-muted-foreground">{new Date(s.subscribedAt).toLocaleDateString("en-GB")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
