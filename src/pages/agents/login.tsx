import { useNavigate, useSearchParams } from "react-router-dom";
import { Globe, Shield, Users, BadgeCheck, TrendingUp, Lock, ArrowLeft } from "lucide-react";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";

const FEATURES = [
  { icon: BadgeCheck, text: "Get verified — applicants trust your profile" },
  { icon: Users, text: "Manage client intakes, documents, and progress" },
  { icon: TrendingUp, text: "Earn 15–20% referral commissions on every signup" },
  { icon: Shield, text: "Licensed agent tools built for compliance" },
];

export default function AgentLoginPage() {
  useSeo({
    title: "Agent Portal — VisaClear",
    description: "Sign in to the VisaClear Agent Portal. Manage your clients, build your profile, and grow your immigration practice.",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/agents/dashboard";
  const goBack = useSmartBack("/agents");

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel — agent brand ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-shrink-0 flex-col justify-between p-10 xl:p-14" style={{ background: "linear-gradient(160deg, #0f2040 0%, #1a1060 100%)" }}>
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white cursor-pointer flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/agents")} className="flex items-center gap-3 cursor-pointer group">
            <div className="w-9 h-9 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-serif text-xl font-bold text-white">VisaClear</span>
              <span className="text-[10px] text-white/40 ml-2 tracking-widest uppercase">Agent Portal</span>
            </div>
          </button>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/20 mb-6">
            <BadgeCheck className="w-3.5 h-3.5 text-purple-300" />
            <span className="text-xs font-bold text-purple-300 tracking-wide uppercase">For Immigration Professionals</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
            Grow your practice.<br />
            <span className="text-purple-300">Build real trust.</span>
          </h2>
          <p className="text-white/55 text-base leading-relaxed mb-10">
            Join verified agents helping applicants navigate visa processes with confidence.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-purple-300" />
                </div>
                <p className="text-sm font-medium text-white/80">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-6 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/35">
            <Shield className="w-3.5 h-3.5" />
            Verified identities only
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/35">
            <Lock className="w-3.5 h-3.5" />
            End-to-end encrypted
          </div>
        </div>
      </div>

      {/* ── Right panel — auth form ── */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0" style={{ background: "#f2f0fb" }}>
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={goBack}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground cursor-pointer flex-shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button onClick={() => navigate("/agents")} className="flex items-center gap-2.5 cursor-pointer">
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(160deg, #0f2040 0%, #1a1060 100%)" }}>
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-serif text-base font-bold text-primary">VisaClear</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">Agent Portal</span>
                </div>
              </button>
            </div>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5" />
              Verified agents
            </span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 lg:py-0">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#7c3aed" }}>
                Agent Portal
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight" style={{ color: "#1a1060" }}>
                Sign in to your<br />agent account.
              </h1>
              <p className="text-base leading-relaxed" style={{ color: "#4a4070" }}>
                Access your client dashboard, manage intakes, and track your referral earnings.
              </p>
            </div>

            <AuthAccessPanel returnPath={returnTo} hideDemoOption={true} />

            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Not registered yet?{" "}
                <button
                  onClick={() => navigate("/agents/register")}
                  className="font-bold text-primary hover:underline cursor-pointer"
                >
                  Create an agent profile
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                Protected by Convex Auth · Verified identities only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
