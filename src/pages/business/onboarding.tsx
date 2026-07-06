import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { cn } from "@/lib/utils.ts";
import { Globe, Building2, GraduationCap, LogIn, ChevronRight, ArrowLeft } from "lucide-react";

type OrgType = "employer" | "university";

const ORG_TYPE_OPTIONS: { value: OrgType; icon: typeof Building2; labelKey: string; descKey: string }[] = [
  { value: "employer", icon: Building2, labelKey: "onboarding.type_employer", descKey: "onboarding.type_employer_desc" },
  { value: "university", icon: GraduationCap, labelKey: "onboarding.type_university", descKey: "onboarding.type_university_desc" },
];

function CreateOrgForm() {
  const { t } = useTranslation("business");
  const navigate = useNavigate();
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const createOrganization = useMutation(api.organizations.createOrganization);
  const [orgType, setOrgType] = useState<OrgType>("employer");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (myOrg) navigate("/business/dashboard", { replace: true });
  }, [myOrg, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("onboarding.required_name"));
      return;
    }
    setSubmitting(true);
    try {
      await createOrganization({ name, orgType });
      toast.success(t("onboarding.created"));
      navigate("/business/dashboard");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error(t("onboarding.create_failed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (myOrg === undefined) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  const namePlaceholder = orgType === "university"
    ? t("onboarding.company_name_placeholder_university")
    : t("onboarding.company_name_placeholder_employer");

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
      {/* Org type selector */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{t("onboarding.type_label")}</p>
        <div className="grid grid-cols-2 gap-3">
          {ORG_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOrgType(opt.value)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-colors cursor-pointer",
                orgType === opt.value
                  ? "border-primary bg-primary/4"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                orgType === opt.value ? "bg-primary/12" : "bg-muted",
              )}>
                <opt.icon className={cn("w-4 h-4", orgType === opt.value ? "text-primary" : "text-muted-foreground")} />
              </div>
              <span className={cn("text-sm font-semibold leading-snug", orgType === opt.value ? "text-primary" : "text-foreground")}>
                {t(opt.labelKey)}
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">{t(opt.descKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Icon + heading */}
      <div>
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
          {orgType === "university" ? (
            <GraduationCap className="w-6 h-6 text-accent" />
          ) : (
            <Building2 className="w-6 h-6 text-accent" />
          )}
        </div>
        <h1 className="font-serif text-2xl font-semibold text-primary mb-1.5">{t("onboarding.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("onboarding.subtitle")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="orgName">{t("onboarding.company_name_label")}</Label>
        <Input
          id="orgName"
          placeholder={namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="w-full cursor-pointer font-semibold disabled:opacity-60">
        {submitting ? t("onboarding.creating") : t("onboarding.create_org")}
        {!submitting && <ChevronRight className="w-4 h-4 ml-1" />}
      </Button>
    </form>
  );
}

export default function BusinessOnboardingPage() {
  const { t } = useTranslation("business");
  useSeo({ title: "Create Your Organisation", description: "Set up your company, university, or agency account on VisaClear to track your cohort's visa readiness." });
  const goBack = useSmartBack("/business");

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
        <span className="text-xs text-muted-foreground tracking-widest uppercase">{t("header_tag")}</span>
      </header>

      <div className="max-w-md mx-auto px-4 py-10 sm:px-6 sm:py-16">
        <AuthLoading>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </AuthLoading>
        <Unauthenticated>
          <div className="text-center py-8 sm:py-10 px-4 bg-card border border-border rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-primary mb-3">{t("onboarding.signin_title")}</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              {t("onboarding.signin_body")}
            </p>
            <SignInButton size="lg" className="cursor-pointer font-semibold" signInText={t("onboarding.signin_cta")} />
          </div>
        </Unauthenticated>
        <Authenticated>
          <CreateOrgForm />
        </Authenticated>
      </div>
    </div>
  );
}
