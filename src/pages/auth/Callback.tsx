import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner.tsx";

// Convex Auth resolves sign-in directly wherever it started (no separate
// OIDC redirect broker), so this route is only reachable from stale
// bookmarks/links now — just send people back where they meant to go.
export default function AuthCallback() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  useEffect(() => {
    const returnPath = sessionStorage.getItem("authReturnPath") ?? "/dashboard";
    sessionStorage.removeItem("authReturnPath");
    navigate(returnPath, { replace: true });
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">{t("loading.returning_to_app")}</p>
    </div>
  );
}
