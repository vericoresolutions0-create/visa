import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn, convexErrMsg } from "@/lib/utils.ts";

function PendingOrgCard({ org }: { org: { _id: Id<"organizations">; name: string; type: string; createdAt: string; creatorEmail: string | null } }) {
  const approveOrganization = useMutation(api.adminOrgs.approveOrganization);
  const rejectOrganization = useMutation(api.adminOrgs.rejectOrganization);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  const handleApprove = async () => {
    setBusy("approve");
    try {
      await approveOrganization({ organizationId: org._id });
      toast.success(`${org.name} approved.`);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not approve. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    setBusy("reject");
    try {
      await rejectOrganization({ organizationId: org._id });
      toast.success(`${org.name} rejected.`);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not reject. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <span className="font-semibold text-sm text-[#0f2040]">{org.name}</span>
          <span className="ml-2 text-[9.5px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
            {org.type === "university" ? "University" : org.type === "law_firm" ? "Law Firm" : "Employer"}
          </span>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {org.creatorEmail ?? "Unknown creator"} · submitted {new Date(org.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { void handleApprove(); }}
            disabled={busy !== null}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
          <button
            onClick={() => { void handleReject(); }}
            disabled={busy !== null}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-red-600 border border-red-300 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === "reject" ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmployersAdminPanel() {
  const { t } = useTranslation("admin");
  const orgs = useQuery(api.adminOrgs.listOrganizations, {});

  if (orgs === undefined) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  const pending = orgs.filter((org) => org.approvalStatus === "pending");
  const rest = orgs.filter((org) => org.approvalStatus !== "pending");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-widest">Awaiting Review</h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
              {pending.length} pending
            </span>
          </div>
          <div className="space-y-2">
            {pending.map((org) => <PendingOrgCard key={org._id} org={org} />)}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
          {t("employers.heading", { count: rest.length })}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("employers.description")}
        </p>
        {rest.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("employers.empty")}
          </div>
        ) : (
          <div className="space-y-2">
            {rest.map((org) => (
              <div key={org._id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-primary">{org.name}</span>
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {org.type === "household" ? t("employers.household") :
                     org.type === "university" ? "University" :
                     org.type === "law_firm" ? "Law Firm" :
                     t("employers.employer")}
                  </span>
                  {org.approvalStatus === "rejected" && (
                    <span className={cn("ml-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border", "bg-red-50 text-red-600 border-red-200")}>
                      Rejected
                    </span>
                  )}
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
    </div>
  );
}
