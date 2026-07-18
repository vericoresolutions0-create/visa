import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.js";
import { IssuedCodesList } from "./IssuedCodesList.tsx";

type LicensePlan = "agent_listing" | "agent_featured" | "agency_white_label";

function suggestLicensePlan(requestedPlan: string): LicensePlan {
  if (requestedPlan === "starter") return "agent_listing";
  if (requestedPlan === "agency") return "agency_white_label";
  if (requestedPlan === "professional" || requestedPlan === "featured") return "agent_featured";
  return "agent_listing";
}

export function IssueCodeControl({ applicationId, email, requestedPlan }: { applicationId: Id<"whitelabel_applications">; email: string; requestedPlan: string }) {
  const { t } = useTranslation("admin");
  const issueCode = useMutation(api.licenseCodes.issueLicenseCode);
  // Shares the same underlying subscription as IssuedCodesList's identical
  // query — Convex dedupes same function+args across the component tree,
  // so this isn't a second network round-trip.
  const allCodes = useQuery(api.licenseCodes.listLicenseCodes, {});
  const [plan, setPlan] = useState<LicensePlan>(suggestLicensePlan(requestedPlan));
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const handleIssue = async () => {
    setIssuing(true);
    try {
      const result = await issueCode({ email, plan, whitelabelApplicationId: applicationId });
      setIssuedCode(result.code);
      toast.success(t("license.toast_issued"));
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("license.toast_issue_failed"));
    } finally {
      setIssuing(false);
    }
  };

  // Reflects reality even after a page refresh resets local state — without
  // this, an admin would see the "Issue" button again, click it, and just
  // get a confusing "already has an active code" error instead of seeing
  // the code that's already out there.
  const existingCode = allCodes?.find((c) => c.email === email && (!c.redeemedAt ? new Date(c.expiresAt) > new Date() : true));

  const displayCode = issuedCode ?? existingCode?.code;
  if (displayCode) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <code className="text-xs font-mono font-semibold bg-accent/10 text-accent px-2.5 py-1 rounded-lg">{displayCode}</code>
        {existingCode?.redeemedAt && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700">{t("license.redeemed")}</span>
        )}
        <button
          onClick={() => { navigator.clipboard.writeText(displayCode); toast.success(t("license.toast_copied")); }}
          className="text-xs font-semibold text-accent hover:underline cursor-pointer"
        >
          {t("license.copy")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <select
        value={plan}
        onChange={(e) => setPlan(e.target.value as LicensePlan)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
      >
        <option value="agent_listing">{t("license.agent_listing")}</option>
        <option value="agent_featured">{t("license.agent_featured")}</option>
        <option value="agency_white_label">{t("license.agency_white_label")}</option>
      </select>
      <button
        disabled={issuing}
        onClick={() => { void handleIssue(); }}
        className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60"
      >
        {issuing ? t("license.issuing") : t("license.issue")}
      </button>
    </div>
  );
}
