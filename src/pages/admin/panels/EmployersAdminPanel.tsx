import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";

export function EmployersAdminPanel() {
  const { t } = useTranslation("admin");
  const orgs = useQuery(api.adminOrgs.listOrganizations, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("employers.heading", { count: orgs?.length ?? 0 })}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("employers.description")}
      </p>
      {orgs === undefined ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : orgs.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("employers.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map((org) => (
            <div key={org._id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-primary">{org.name}</span>
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {org.type === "household" ? t("employers.household") :
                   org.type === "university" ? "University" :
                   org.type === "law_firm" ? "Law Firm" :
                   t("employers.employer")}
                </span>
                <div className="text-[10px] text-muted-foreground">{new Date(org.createdAt).toLocaleDateString("en-GB")} · {t(org.memberCount === 1 ? "employers.admin_one" : "employers.admin_other", { count: org.memberCount })}</div>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{t("employers.pending", { count: org.pendingCount })}</span>
                <span>{t("employers.accepted", { count: org.acceptedCount })}</span>
                <span>{t("employers.declined", { count: org.declinedCount })}</span>
                <span>{t("employers.revoked", { count: org.revokedCount })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
