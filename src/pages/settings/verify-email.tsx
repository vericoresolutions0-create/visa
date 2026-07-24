import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "@/convex/_generated/api.js";
import { convexErrMsg } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { Globe, LogIn, ShieldCheck, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

function VerifyFlow({ token }: { token: string }) {
  const { t } = useTranslation("verify-email");
  const confirmEmailVerification = useMutation(api.emailVerification.confirmEmailVerification);
  const [state, setState] = useState<"idle" | "confirming" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleConfirm = async () => {
    setState("confirming");
    try {
      await confirmEmailVerification({ token });
      setState("done");
    } catch (err) {
      setErrorMessage(convexErrMsg(err) ?? t("error.fallback"));
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 space-y-4 text-center">
        <CheckCircle2 className="w-10 h-10 text-accent mx-auto" />
        <h2 className="font-serif text-2xl font-semibold text-primary">{t("confirmed.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("confirmed.body")}</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 space-y-4 text-center">
        <XCircle className="w-10 h-10 text-destructive mx-auto" />
        <h2 className="font-serif text-2xl font-semibold text-primary">{t("error.title")}</h2>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-5 text-center">
      <ShieldCheck className="w-10 h-10 text-accent mx-auto" />
      <h2 className="font-serif text-2xl font-semibold text-primary">{t("idle.title")}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("idle.body")}</p>
      <Button disabled={state === "confirming"} onClick={() => void handleConfirm()} className="cursor-pointer font-semibold disabled:opacity-60">
        {state === "confirming" ? t("idle.confirming") : t("idle.cta")}
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("verify-email");
  useSeo({ title: "Verify Email", description: "Verify your VisaClear account email." });
  const goBack = useSmartBack("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center gap-3">
        <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Globe className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <span className="font-serif font-semibold text-primary">VisaClear</span>
      </header>
      <div className="max-w-md mx-auto px-6 py-16">
        {token ? (
          <>
            <AuthLoading>
              <Skeleton className="h-48 w-full rounded-2xl" />
            </AuthLoading>
            <Unauthenticated>
              <div className="text-center py-10 bg-card border border-border rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                  <LogIn className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-primary mb-3">{t("signin.title")}</h2>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">{t("signin.body")}</p>
                <Button
                  size="lg"
                  className="cursor-pointer font-semibold"
                  onClick={() => navigate(`/login?returnTo=${encodeURIComponent(`/verify-email/${token}`)}`)}
                >
                  {t("signin.cta")}
                </Button>
              </div>
            </Unauthenticated>
            <Authenticated>
              <VerifyFlow token={token} />
            </Authenticated>
          </>
        ) : null}
      </div>
    </div>
  );
}
