import { useNavigate, useSearchParams } from "react-router-dom";
import { Globe, Shield, Users, FileText, Clock, Lock } from "lucide-react";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { useSeo } from "@/hooks/use-seo.ts";

const FEATURES = [
  { icon: Users, text: "Invite employees and track their visa progress in real time" },
  { icon: FileText, text: "Audit trail and compliance reporting built in" },
  { icon: Clock, text: "Deadline alerts — never miss a renewal or expiry" },
  { icon: Shield, text: "Household and dependent management included" },
];

export default function BusinessLoginPage() {
  useSeo({
    title: "Business Portal — VisaClear",
    description: "Sign in to the VisaClear Business Portal. Manage your team's visa journeys, compliance, and deadlines from one dashboard.",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/business/dashboard";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel — business brand ── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-shrink-0 flex-col justify-between p-10 xl:p-14 relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #0a2818 0%, #0d3d2e 60%, #0a3328 100%)" }}
      >
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <button onClick={() => navigate("/business")} className="flex items-center gap-3 cursor-pointer group relative">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <Globe className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <span className="font-serif text-xl font-bold text-white">VisaClear</span>
            <span className="text-[10px] text-white/30 ml-2 tracking-widest uppercase">Business Portal</span>
          </div>
        </button>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <svg className="w-3.5 h-3.5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            <span className="text-xs font-bold tracking-widest uppercase text-emerald-300">For Employers &amp; Organisations</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4" style={{ textWrap: "balance" }}>
            Visa support for<br />
            <span className="text-emerald-300">your entire team.</span>
          </h2>
          <p className="text-white/50 text-base leading-relaxed mb-10 max-w-xs">
            Manage international hire journeys, invite employees, and stay on top of every deadline — from one dashboard.
          </p>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.12)" }}>
                  <Icon className="w-4 h-4 text-emerald-300" />
                </div>
                <p className="text-sm font-medium text-white/75">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-5 pt-6 relative" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/28">
            <Shield className="w-3 h-3" />
            GDPR-Aligned
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/28">
            <Lock className="w-3 h-3" />
            Organisation data isolated
          </div>
        </div>
      </div>

      {/* ── Right panel — auth form ── */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0" style={{ background: "#f4f7f4" }}>
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <button onClick={() => navigate("/business")} className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(150deg, #0a2818 0%, #0d3d2e 100%)" }}>
                <Globe className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <span className="font-serif text-base font-bold text-primary">VisaClear</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">Business</span>
              </div>
            </button>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Secure
            </span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 lg:py-0">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#059669" }}>
                Business Portal
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3" style={{ color: "#0a2818" }}>
                Sign in to your<br />organisation.
              </h1>
              <p className="text-base leading-relaxed" style={{ color: "#5a7060" }}>
                Access your employer dashboard to manage your team's visa journeys and compliance status.
              </p>
            </div>

            <AuthAccessPanel returnPath={returnTo} hideDemoOption={true} />

            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Setting up for the first time?{" "}
                <button
                  onClick={() => navigate("/business/onboarding")}
                  className="font-bold hover:underline cursor-pointer"
                  style={{ color: "#0a2818" }}
                >
                  Create your organisation
                </button>
              </p>
              <p className="text-xs" style={{ color: "#9ab09e" }}>
                Protected by Convex Auth · Organisation data isolated
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
