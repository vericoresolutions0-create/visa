import { useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth.ts";
import { convexErrMsg } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { DemoSignInButton } from "@/components/ui/signin.tsx";
import { api } from "@/convex/_generated/api.js";
import { getStoredPartnerSlug } from "@/hooks/use-partner-referral.ts";

type AuthAccessPanelProps = {
  returnPath?: string;
  onAuthStart?: () => void;
  /**
   * Hide the one-click demo account option. Use this for professional/paid
   * flows (e.g. agent sign-in) where every account must be a real, verified
   * identity rather than an instant placeholder account.
   */
  hideDemoOption?: boolean;
  /** Override the initial auth mode. Defaults to "signIn". Pass "signUp" on /signup routes. */
  initialMode?: "signIn" | "signUp";
};

export function AuthAccessPanel({
  returnPath = "/dashboard",
  onAuthStart,
  hideDemoOption = false,
  initialMode = "signIn",
}: AuthAccessPanelProps) {
  const { t } = useTranslation("auth");
  const { signIn, isLoading } = useAuth();
  const isGoogleConfigured = useQuery(api.auth.isGoogleConfigured);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">(initialMode);
  // Reject external/protocol-relative URLs — only allow same-origin relative paths.
  const safeReturn = /^\/(?!\/)/.test(returnPath) ? returnPath : "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const requiresConsent = authMode === "signUp";

  const startGoogleAuth = async () => {
    setError(null);
    sessionStorage.setItem("authReturnPath", safeReturn);

    if (!isGoogleConfigured) {
      navigate("/google-login");
      return;
    }

    onAuthStart?.();
    try {
      await signIn("google", { redirectTo: safeReturn });
    } catch {
      setError(t("google.error"));
      toast.error(t("google.error"));
    }
  };

  const startEmailAuth = async () => {
    setError(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("error.invalidEmail"));
      return;
    }
    if (!password.trim()) {
      setError(t("error.noPassword"));
      return;
    }
    if (authMode === "signUp") {
      if (password.length < 8) {
        setError(t("error.passwordLength"));
        return;
      }
      if (/^\d+$/.test(password)) {
        setError(t("error.passwordAllNumbers"));
        return;
      }
    }
    if (requiresConsent && !agreedToTerms) {
      setError(t("error.mustAgree"));
      return;
    }

    sessionStorage.setItem("authReturnPath", safeReturn);
    setSubmitting(true);
    try {
      const partnerReferralSlug = authMode === "signUp" ? getStoredPartnerSlug() : null;
      await signIn("password", {
        email: email.trim(),
        password,
        flow: authMode,
        ...(authMode === "signUp" ? { agreedToTermsAt: new Date().toISOString() } : {}),
        ...(partnerReferralSlug ? { partnerReferralSlug } : {}),
      });
      onAuthStart?.();
      toast.success(authMode === "signUp" ? t("toast.accountCreated") : t("toast.signedIn"));
      // replace: true — same reasoning as startDemoAccess above.
      navigate(safeReturn, { replace: true });
    } catch (err) {
      const message =
        convexErrMsg(err) ??
        (authMode === "signIn" ? t("error.signInFailed") : t("error.signUpFailed"));
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 text-left">
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          {t("consent.prefix")}{" "}
          <Link to="/terms" target="_blank" className="underline hover:text-primary">{t("consent.terms")}</Link>
          {" "}{t("consent.and")}{" "}
          <Link to="/privacy" target="_blank" className="underline hover:text-primary">{t("consent.privacy")}</Link>
          {t("consent.suffix")}
        </p>
        <Button
          type="button"
          size="lg"
          className="w-full cursor-pointer font-semibold bg-[#4285F4] hover:bg-[#357ae8] text-white border-0"
          onClick={() => {
            void startGoogleAuth();
          }}
          disabled={isLoading}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {t("google.continue")}
        </Button>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void startEmailAuth();
          }}
        >
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t("email.label")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {t("password.label")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={authMode === "signUp" ? t("password.placeholder.signUp") : t("password.placeholder.signIn")}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {requiresConsent && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(event) => setAgreedToTerms(event.target.checked)}
                className="mt-0.5 cursor-pointer"
              />
              <span>
                {t("consentCheckbox.prefix")}{" "}
                <Link to="/terms" target="_blank" className="underline hover:text-primary">{t("consent.terms")}</Link>
                {" "}{t("consentCheckbox.and")}{" "}
                <Link to="/privacy" target="_blank" className="underline hover:text-primary">{t("consent.privacy")}</Link>
                {t("consentCheckbox.suffix")}
              </span>
            </label>
          )}
          {error ? (
            <div className="text-sm text-destructive/90">{error}</div>
          ) : null}
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            className="w-full cursor-pointer font-semibold"
            disabled={isLoading || submitting || (requiresConsent && !agreedToTerms)}
          >
            <Mail className="w-4 h-4" />
            {submitting
              ? authMode === "signUp" ? t("submit.creating") : t("submit.signingIn")
              : authMode === "signUp" ? t("submit.createAccount") : t("submit.continueEmail")}
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
          <button
            type="button"
            onClick={() => {
              setAuthMode((m) => (m === "signIn" ? "signUp" : "signIn"));
              setError(null);
              setAgreedToTerms(false);
            }}
            className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {authMode === "signIn" ? (
              <>{t("toggle.toSignUp.prompt")} <strong className="text-primary font-bold">{t("toggle.toSignUp.cta")}</strong></>
            ) : (
              <>{t("toggle.toSignIn.prompt")} <strong className="text-primary font-bold">{t("toggle.toSignIn.cta")}</strong></>
            )}
          </button>
        </form>

        {!hideDemoOption && (
          <DemoSignInButton
            redirectTo={safeReturn}
            onSignedIn={() => {
              sessionStorage.setItem("authReturnPath", safeReturn);
              onAuthStart?.();
            }}
            className="w-full cursor-pointer font-semibold"
            size="lg"
          />
        )}
      </div>
    </div>
  );
}
