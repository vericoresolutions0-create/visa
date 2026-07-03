import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { Button } from "@/components/ui/button.tsx";
import { Globe, Mail, Shield } from "lucide-react";

// Reached only when Google sign-in hasn't been configured yet (no
// AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET set on the Convex deployment) — an
// honest "not ready yet" page rather than a simulated Google login.
export default function GoogleLoginPage() {
  const { t } = useTranslation("google_login");
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");

  useSeo({
    title: "Continue with Google",
    description: "Google sign-in for VisaClear.",
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-accent">
              {t("eyebrow")}
            </p>
            <h1 className="text-3xl font-semibold text-primary mt-2">
              {t("title")}
            </h1>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          {t("description")}
        </p>

        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full font-semibold"
            onClick={() => navigate("/login")}
          >
            <Mail className="w-4 h-4" />
            {t("continue_email")}
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>{t("auto_note")}</span>
          </div>
          <Button variant="ghost" className="w-full" onClick={goBack}>
            {t("go_back")}
          </Button>
        </div>
      </div>
    </div>
  );
}
