import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { MailWarning } from "lucide-react";
import { convexErrMsg } from "@/lib/utils.ts";

// Drop this in wherever a gated action (Community posting, contacting an
// agent, starting a trial) lives — self-contained, renders nothing for demo
// accounts, signed-out visitors, or already-verified users.
export function EmailVerificationBanner() {
  const { t } = useTranslation("verify-email");
  const { isDemoAuthenticated } = useDemoAuth();
  const user = useQuery(api.users.getCurrentUser, isDemoAuthenticated ? "skip" : {});
  const requestEmailVerification = useMutation(api.emailVerification.requestEmailVerification);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (isDemoAuthenticated || !user || user.emailVerificationTime) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await requestEmailVerification({});
      setSent(true);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not resend the verification email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
      <MailWarning className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t("banner.title")}</p>
        <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">{t("banner.body")}</p>
      </div>
      <button
        disabled={sending || sent}
        onClick={() => void handleResend()}
        className="shrink-0 text-xs font-semibold text-amber-900 dark:text-amber-200 underline decoration-amber-500/50 hover:decoration-amber-700 cursor-pointer disabled:opacity-60 disabled:cursor-default"
      >
        {sent ? t("banner.resent") : sending ? t("banner.resending") : t("banner.resend")}
      </button>
    </div>
  );
}
