import { useState } from "react";
import { useParams } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { Globe, LogIn, ShieldCheck, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

function ConfirmFlow({ token }: { token: string }) {
  const confirmEmailChange = useMutation(api.emailChange.confirmEmailChange);
  const [state, setState] = useState<"idle" | "confirming" | "done" | "error">("idle");
  const [resultEmail, setResultEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleConfirm = async () => {
    setState("confirming");
    try {
      const result = await confirmEmailChange({ token });
      setResultEmail(result.newEmail);
      setState("done");
    } catch (err) {
      setErrorMessage(
        err instanceof ConvexError ? (err.data as { message: string }).message : "Could not confirm this email change.",
      );
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 space-y-4 text-center">
        <CheckCircle2 className="w-10 h-10 text-accent mx-auto" />
        <h2 className="font-serif text-2xl font-semibold text-primary">Email Confirmed</h2>
        <p className="text-sm text-muted-foreground">
          Your account email is now <span className="font-semibold text-foreground">{resultEmail}</span>.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 space-y-4 text-center">
        <XCircle className="w-10 h-10 text-destructive mx-auto" />
        <h2 className="font-serif text-2xl font-semibold text-primary">Couldn&apos;t Confirm</h2>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-5 text-center">
      <ShieldCheck className="w-10 h-10 text-accent mx-auto" />
      <h2 className="font-serif text-2xl font-semibold text-primary">Confirm Your New Email</h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Click below to confirm this address as your new VisaClear account email.
      </p>
      <Button disabled={state === "confirming"} onClick={() => void handleConfirm()} className="cursor-pointer font-semibold disabled:opacity-60">
        {state === "confirming" ? "Confirming…" : "Confirm This Email"}
      </Button>
    </div>
  );
}

export default function ConfirmEmailPage() {
  const { token } = useParams<{ token: string }>();
  useSeo({ title: "Confirm Email", description: "Confirm a pending email change for your VisaClear account." });
  const goBack = useSmartBack("/settings/profile");

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
      </header>
      <div className="max-w-md mx-auto px-6 py-16">
        {token ? (
          <>
            <AuthLoading>
              <Skeleton className="h-48 w-full rounded-2xl" />
            </AuthLoading>
            <Unauthenticated>
              <div className="text-center py-10 bg-card border border-border rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                  <LogIn className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-primary mb-3">Sign In to Confirm</h2>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                  Sign in to the account that requested this email change to confirm it.
                </p>
                <SignInButton size="lg" className="cursor-pointer font-semibold" signInText="Sign In to Continue" />
              </div>
            </Unauthenticated>
            <Authenticated>
              <ConfirmFlow token={token} />
            </Authenticated>
          </>
        ) : null}
      </div>
    </div>
  );
}
