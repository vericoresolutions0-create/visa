import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoGate } from "@/components/DemoGateModal.tsx";
import { useMutation, useQuery } from "convex/react";

import { toast } from "sonner";
import {
  Globe, ArrowLeft, Shield, Plus, X, Bell,
  LayoutDashboard, Settings, LogOut, LogIn,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import { convexErrMsg } from "@/lib/utils.ts";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";
import { canUseCountryWatch, COUNTRY_WATCH_LIMIT } from "@/lib/plan-gates.ts";
import { ALL_COUNTRIES } from "@/lib/countries.ts";
import { CountrySelect } from "@/components/CountrySelect.tsx";

const DEMO_WATCHES: Doc<"country_watches">[] = [
  { _id: "demo_watch_uk" as Id<"country_watches">, _creationTime: Date.now(), userId: "demo_user" as Id<"users">, countryName: "United Kingdom", createdAt: new Date().toISOString() },
  { _id: "demo_watch_ca" as Id<"country_watches">, _creationTime: Date.now(), userId: "demo_user" as Id<"users">, countryName: "Canada", createdAt: new Date().toISOString() },
];

const DEMO_FEED: Doc<"country_policy_updates">[] = [
  {
    _id: "demo_update_uk" as Id<"country_policy_updates">,
    _creationTime: Date.now(),
    countryName: "United Kingdom",
    title: "UK raises minimum salary threshold for Skilled Worker visa",
    body: "The UK Home Office has increased the minimum salary requirement for most Skilled Worker visa sponsorships. Applicants with an existing Certificate of Sponsorship issued before the change date are unaffected.",
    publishedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    publishedByUserId: "demo_admin" as Id<"users">,
  },
  {
    _id: "demo_update_ca" as Id<"country_policy_updates">,
    _creationTime: Date.now() - 1,
    countryName: "Canada",
    title: "IRCC updates proof-of-funds amounts for Temporary Resident Visa",
    body: "Immigration, Refugees and Citizenship Canada has revised the recommended proof-of-funds figures used to assess visitor visa applications. Check the official IRCC page before submitting your bank statements.",
    publishedAt: new Date(Date.now() - 13 * 86400000).toISOString(),
    publishedByUserId: "demo_admin" as Id<"users">,
  },
];

export default function CountryWatchPage() {
  const { t } = useTranslation("country-watch");
  useSeo({ title: "Country Watch — VisaClear Pro", description: "Real policy change alerts for the countries you care about." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated, user: demoUser, signOut } = useDemoAuth();
  const { isAuthenticated, signOut: signOutReal } = useAuth();
  const translateCountry = useCountryName();
  const canAccess = isDemoAuthenticated || isAuthenticated;

  const user = useQuery(api.users.getCurrentUser, isDemoAuthenticated ? "skip" : {});
  const realWatches = useQuery(api.countryWatch.getMyWatches, isDemoAuthenticated ? "skip" : {});
  const realFeed = useQuery(api.countryWatch.getMyFeed, isDemoAuthenticated ? "skip" : {});
  const addWatch = useMutation(api.countryWatch.addWatch);
  const removeWatch = useMutation(api.countryWatch.removeWatch);

  const { gate, GateModal } = useDemoGate();

  const [demoWatches, setDemoWatches] = useState<Doc<"country_watches">[]>(DEMO_WATCHES);
  const watches = isDemoAuthenticated ? demoWatches : realWatches;
  const watchedCountrySet = new Set(demoWatches.map((w) => w.countryName));
  const feed = isDemoAuthenticated ? DEMO_FEED.filter((u) => watchedCountrySet.has(u.countryName)) : realFeed;

  const plan = isDemoAuthenticated ? (demoUser?.plan ?? "expert") : (user?.plan ?? "free");
  const canWatch = canUseCountryWatch(plan);
  const limit = COUNTRY_WATCH_LIMIT[plan];
  const [selected, setSelected] = useState("");

  const handleSignOut = async () => {
    if (isAuthenticated) {
      await signOutReal();
      navigate("/");
      return;
    }
    signOut();
    navigate("/");
  };

  const handleAdd = async () => {
    if (!selected) return;
    if (gate()) return;
    try {
      await addWatch({ countryName: selected });
      toast.success(t("toast.added", { country: selected }));
      setSelected("");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("toast.add_error"));
    }
  };

  const handleRemove = async (id: Parameters<typeof removeWatch>[0]["id"]) => {
    if (gate()) return;
    try {
      await removeWatch({ id });
      toast.success(t("toast.removed"));
    } catch {
      toast.error(t("toast.remove_error"));
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
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Bell className="w-3.5 h-3.5 text-accent" /> {t("header.badge")}
            </div>
            {canAccess && (
              <>
                <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20" title={t("nav.dashboard")}>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.dashboard")}</span>
                </button>
                <button onClick={() => navigate("/settings/profile")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20" title={t("nav.settings")}>
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.settings")}</span>
                </button>
                <button onClick={() => void handleSignOut()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20" title={t("nav.sign_out")}>
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.sign_out")}</span>
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
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">{t("signin.title")}</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              {t("signin.body")}
            </p>
            <div className="max-w-sm mx-auto">
              <AuthAccessPanel returnPath="/dashboard/country-watch" />
            </div>
          </div>
        ) : !canWatch ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-semibold text-primary mb-2">{t("upgrade.title")}</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
              {t("upgrade.body")}
            </p>
            <Button className="cursor-pointer font-semibold" onClick={() => navigate("/pricing")}>
              {t("upgrade.cta")}
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm text-primary uppercase tracking-widest">
                  {t("watching.title", { count: watches?.length ?? 0, limit })}
                </h2>
              </div>
              {(watches ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground mb-4">{t("watching.empty")}</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(watches ?? []).map((w) => (
                    <span key={w._id} className="flex items-center gap-1.5 text-xs font-medium bg-primary/8 text-primary rounded-full px-3 py-1.5">
                      {DESTINATION_FLAGS[w.countryName] ?? "🌍"} {translateCountry(w.countryName)}
                      <button onClick={() => void handleRemove(w._id)} className="cursor-pointer hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {(watches?.length ?? 0) < (limit ?? 0) && (
                <div className="flex gap-2">
                  <CountrySelect
                    value={selected}
                    onChange={setSelected}
                    countries={availableCountries}
                    placeholder={t("watching.placeholder")}
                    className="flex-1"
                  />
                  <Button size="sm" className="cursor-pointer shrink-0" disabled={!selected} onClick={() => void handleAdd()}>
                    <Plus className="w-3.5 h-3.5" /> {t("watching.add")}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">{t("updates.title")}</h3>
              {(feed ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("updates.empty")}</p>
              ) : (
                <div className="space-y-2">
                  {(feed ?? []).map((u) => (
                    <div key={u._id} className="bg-card border border-border rounded-xl p-4">
                      <div className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">{DESTINATION_FLAGS[u.countryName] ?? "🌍"} {translateCountry(u.countryName)}</div>
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


      {GateModal}
    </div>
  );
}
