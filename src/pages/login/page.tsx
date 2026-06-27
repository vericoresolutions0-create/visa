import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Globe, Shield } from "lucide-react";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";

export default function LoginPage() {
  useSeo({
    title: "Sign up or login",
    description:
      "Create your VisaClear account or access your dashboard with Google, email, or a demo account.",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useSmartBack("/");
  const { isDemoAuthenticated } = useDemoAuth();
  const hasAccess = isDemoAuthenticated;
  const isSignup = location.pathname === "/signup";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">
                  VisaClear
                </span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">
                  by Vericore
                </span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Shield className="w-3.5 h-3.5 text-accent" />
            Account Access
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start">
          <aside className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs tracking-widest uppercase text-accent font-semibold mb-4">
              Access Flow
            </p>
            {[
              "Choose Google, email/password, or demo access.",
              "Complete the account step.",
              "Land directly in your dashboard.",
            ].map((step, index) => (
              <div key={step} className="flex gap-3 pb-4 last:pb-0">
                <div className="w-7 h-7 rounded-full bg-primary/8 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {index + 1}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </aside>

          <section>
            <div className="mb-6">
              <p className="text-xs tracking-widest uppercase text-accent font-semibold mb-2">
                {isSignup ? "Create an account" : "Sign up / Login"}
              </p>
              <h1 className="font-serif text-4xl font-semibold text-primary mb-3">
                {isSignup ? "Create your VisaClear account" : "Create or access your account"}
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                {isSignup
                  ? "Register with email/password, use Google, or continue with the demo account."
                  : "Use the demo account for now, or start the real auth flow when the external provider is ready."}
              </p>
            </div>

            {hasAccess ? (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                  Account access is active
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Continue to your dashboard to manage checklists, reminders,
                  profile settings, and checkout.
                </p>
                <Button
                  size="lg"
                  className="cursor-pointer font-semibold"
                  onClick={() => navigate("/dashboard")}
                >
                  Continue to Dashboard
                </Button>
              </div>
            ) : (
              <AuthAccessPanel returnPath="/dashboard" />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
