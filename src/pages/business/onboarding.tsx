import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { Globe, Building2, LogIn, ChevronRight, ArrowLeft } from "lucide-react";

function CreateOrgForm() {
  const navigate = useNavigate();
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const createOrganization = useMutation(api.organizations.createOrganization);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (myOrg) navigate("/business/dashboard", { replace: true });
  }, [myOrg, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your company name.");
      return;
    }
    setSubmitting(true);
    try {
      await createOrganization({ name });
      toast.success("Organisation created.");
      navigate("/business/dashboard");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to create organisation. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (myOrg === undefined) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-8 space-y-5">
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
        <Building2 className="w-6 h-6 text-accent" />
      </div>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-primary mb-1.5">Create Your Organisation</h1>
        <p className="text-sm text-muted-foreground">This becomes your employer dashboard's name — you can invite employees right after.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="orgName">Company Name *</Label>
        <Input id="orgName" placeholder="Acme Logistics Ltd" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <Button type="submit" size="lg" disabled={submitting} className="w-full cursor-pointer font-semibold disabled:opacity-60">
        {submitting ? "Creating…" : "Create Organisation"}
        {!submitting && <ChevronRight className="w-4 h-4 ml-1" />}
      </Button>
    </form>
  );
}

export default function BusinessOnboardingPage() {
  useSeo({ title: "Create Your Employer Account", description: "Set up your organisation on VisaClear to track your relocating employees' visa readiness." });
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
        <span className="text-xs text-muted-foreground tracking-widest uppercase">for Employers</span>
      </header>

      <div className="max-w-md mx-auto px-6 py-16">
        <AuthLoading>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </AuthLoading>
        <Unauthenticated>
          <div className="text-center py-10 bg-card border border-border rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-primary mb-3">Sign In to Continue</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              Sign in or create an account to set up your company's employer dashboard.
            </p>
            <SignInButton size="lg" className="cursor-pointer font-semibold" signInText="Sign In to Continue" />
          </div>
        </Unauthenticated>
        <Authenticated>
          <CreateOrgForm />
        </Authenticated>
      </div>
    </div>
  );
}
