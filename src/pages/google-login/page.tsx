import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSeo } from "@/hooks/use-seo.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "sonner";
import { Globe, ArrowRight, Mail, Shield } from "lucide-react";
import { signInLocalGoogleUser } from "@/lib/local-auth.ts";
import { hasHerculesAuthConfig } from "@/lib/auth-config.ts";

export default function GoogleLoginPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signinRedirect } = useAuth();

  useSeo({
    title: "Continue with Google",
    description: "Sign in with your Google email address to access your VisaClear dashboard.",
  });

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleContinue = async () => {
    setError(null);
    if (!validateEmail(email)) {
      setError("Please enter a valid Gmail address.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (hasHerculesAuthConfig) {
        await signinRedirect({
          extraQueryParams: {
            login_hint: normalizedEmail,
          },
        });
        return;
      }

      signInLocalGoogleUser(normalizedEmail);
      toast.success("Signed in with Google email.");
      const returnPath = sessionStorage.getItem("authReturnPath") ?? "/dashboard";
      navigate(returnPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sign in with Google.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-accent">
              Google login
            </p>
            <h1 className="text-3xl font-semibold text-primary mt-2">
              Continue with Google
            </h1>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Enter the email address you use with Gmail and continue to your VisaClear dashboard.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Google email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@gmail.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error ? <div className="text-sm text-destructive/90">{error}</div> : null}
          <Button
            size="lg"
            className="w-full font-semibold"
            onClick={handleContinue}
            disabled={loading}
          >
            <Mail className="w-4 h-4" />
            Continue with Google
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span>Google sign-in uses your Gmail address for account access.</span>
          </div>
          <Button
            variant="ghost"
            className="w-full"
            onClick={goBack}
          >
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
