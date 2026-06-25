import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  Globe, ArrowLeft, Shield, Plus, X, Bell,
  LayoutDashboard, Settings, LogOut, LogIn,
} from "lucide-react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { api } from "@/convex/_generated/api.js";
import { canUseCountryWatch, COUNTRY_WATCH_LIMIT } from "@/lib/plan-gates.ts";
import { ALL_COUNTRIES } from "@/lib/countries.ts";

export default function CountryWatchPage() {
  useSeo({ title: "Country Watch — VisaClear Pro", description: "Real policy change alerts for the countries you care about." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated, signOut } = useDemoAuth();
  const { isAuthenticated, signoutRedirect } = useAuth();
  const canAccess = isDemoAuthenticated || isAuthenticated;

  const user = useQuery(api.users.getCurrentUser, isDemoAuthenticated ? "skip" : {});
  const watches = useQuery(api.countryWatch.getMyWatches, isDemoAuthenticated ? "skip" : {});
  const feed = useQuery(api.countryWatch.getMyFeed, isDemoAuthenticated ? "skip" : {});
  const addWatch = useMutation(api.countryWatch.addWatch);
  const removeWatch = useMutation(api.countryWatch.removeWatch);

  const plan = user?.plan ?? "free";
  const canWatch = canUseCountryWatch(plan);
  const limit = COUNTRY_WATCH_LIMIT[plan];
  const [selected, setSelected] = useState("");

  const handleSignOut = async () => {
    if (isAuthenticated) {
      await signoutRedirect();
      return;
    }
    signOut();
    navigate("/");
  };

  const handleAdd = async () => {
    if (!selected) return;
    try {
      await addWatch({ countryName: selected });
      toast.success(`Now watching ${selected}.`);
      setSelected("");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Could not add this country. Please try again.");
      }
    }
  };

  const handleRemove = async (id: Parameters<typeof removeWatch>[0]["id"]) => {
    try {
      await removeWatch({ id });
      toast.success("Removed.");
    } catch {
      toast.error("Could not remove this country.");
    }
  };

  const watchedNames = new Set((watches ?? []).map((w) => w.countryName));
  const availableCountries = ALL_COUNTRIES.filter((c) => !watchedNames.has(c));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">by Vericore</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Bell className="w-3.5 h-3.5 text-accent" /> Country Watch
            </div>
            {canAccess && (
              <>
                <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20" title="My Dashboard">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">My Dashboard</span>
                </button>
                <button onClick={() => navigate("/settings/profile")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20" title="Settings">
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Settings</span>
                </button>
                <button onClick={() => void handleSignOut()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20" title="Sign out">
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {!canAccess ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">Sign In to Continue</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Watch the countries you're applying to and get notified the moment a rule changes.
            </p>
            <div className="max-w-sm mx-auto">
              <AuthAccessPanel returnPath="/dashboard/country-watch" />
            </div>
          </div>
        ) : !canWatch ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-semibold text-primary mb-2">Never miss a rule change</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
              Country Watch is a Pro feature. Watch up to 5 countries (10 on Expert) and we'll email you the moment
              a real policy change is published for them.
            </p>
            <Button className="cursor-pointer font-semibold" onClick={() => navigate("/pricing")}>
              Upgrade to Pro
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm text-primary uppercase tracking-widest">
                  Watching ({watches?.length ?? 0}/{limit})
                </h2>
              </div>
              {(watches ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground mb-4">You're not watching any countries yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(watches ?? []).map((w) => (
                    <span key={w._id} className="flex items-center gap-1.5 text-xs font-medium bg-primary/8 text-primary rounded-full px-3 py-1.5">
                      {w.countryName}
                      <button onClick={() => void handleRemove(w._id)} className="cursor-pointer hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {(watches?.length ?? 0) < (limit ?? 0) && (
                <div className="flex gap-2">
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a country to watch…</option>
                    {availableCountries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <Button size="sm" className="cursor-pointer shrink-0" disabled={!selected} onClick={() => void handleAdd()}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">Recent updates</h3>
              {(feed ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No policy updates for your watched countries yet. We'll email you the moment something changes.</p>
              ) : (
                <div className="space-y-2">
                  {(feed ?? []).map((u) => (
                    <div key={u._id} className="bg-card border border-border rounded-xl p-4">
                      <div className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">{u.countryName}</div>
                      <div className="text-sm font-semibold text-foreground mb-1">{u.title}</div>
                      <div className="text-xs text-muted-foreground whitespace-pre-line">{u.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">&ldquo;It&apos;s all about Privacy.&rdquo;</p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Vericore Ltd. · VisaClear is a guidance tool, not legal advice.
        </p>
      </footer>
    </div>
  );
}
