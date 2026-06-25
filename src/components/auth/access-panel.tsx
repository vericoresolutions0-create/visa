import { useState } from "react";
import { Globe, Mail, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth.ts";
import { signInDemoUser } from "@/hooks/use-demo-auth.ts";
import { signInLocalUser } from "@/lib/local-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { DemoSignInButton } from "@/components/ui/signin.tsx";
import { hasHerculesAuthConfig } from "@/lib/auth-config.ts";

type AuthAccessPanelProps = {
  returnPath?: string;
  onAuthStart?: () => void;
  /**
   * Hide the one-click demo account option. Use this for professional/paid
   * flows (e.g. agent sign-in) where every account must be a real, verified
   * identity rather than an instant placeholder account.
   */
  hideDemoOption?: boolean;
};

export function AuthAccessPanel({
  returnPath = "/dashboard",
  onAuthStart,
  hideDemoOption = false,
}: AuthAccessPanelProps) {
  const { signinRedirect, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startDemoAccess = () => {
    sessionStorage.setItem("authReturnPath", returnPath);
    signInDemoUser();
    onAuthStart?.();
    toast.success("Demo account is active.");
    navigate(returnPath);
  };

  const handleGoogleFallback = () => {
    navigate("/google-login");
  };

  const startAuth = async (mode: "google" | "email") => {
    sessionStorage.setItem("authReturnPath", returnPath);
    setError(null);

    if (mode === "google" && !hasHerculesAuthConfig) {
      handleGoogleFallback();
      return;
    }

    if (mode === "email") {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
      if (!password.trim()) {
        setError("Please enter your password.");
        return;
      }
    }

    if (!hasHerculesAuthConfig) {
      try {
        if (mode === "google") {
          handleGoogleFallback();
          return;
        }
        signInLocalUser(email.trim(), password);
        sessionStorage.setItem("authReturnPath", returnPath);
        onAuthStart?.();
        toast.success("Account created or signed in successfully.");
        navigate(returnPath);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not sign in. Please try again.";
        setError(message);
        toast.error(message);
        return;
      }
    }

    onAuthStart?.();

    try {
      if (mode === "google") {
        await signinRedirect();
        return;
      }

      await signinRedirect({
        extraQueryParams: email.trim()
          ? {
              login_hint: email.trim(),
            }
          : undefined,
      });
    } catch {
      setError("Could not start sign in. Please try again.");
      toast.error("Could not start sign in. Please try again.");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 text-left">
      <div className="space-y-3">
        <Button
          type="button"
          size="lg"
          className="w-full cursor-pointer font-semibold bg-[#4285F4] hover:bg-[#357ae8] text-white border-0"
          onClick={() => {
            void startAuth("google");
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
          Continue with Google
        </Button>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void startAuth("email");
          }}
        >
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Email address
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
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter a secure password"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error ? (
            <div className="text-sm text-destructive/90">{error}</div>
          ) : null}
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            className="w-full cursor-pointer font-semibold"
            disabled={isLoading}
          >
            <Mail className="w-4 h-4" />
            Continue with email/password
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </form>

        {!hideDemoOption && (
          <DemoSignInButton
            redirectTo={returnPath}
            onSignedIn={() => {
              sessionStorage.setItem("authReturnPath", returnPath);
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
