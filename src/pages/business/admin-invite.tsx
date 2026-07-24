import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { convexErrMsg } from "@/lib/utils.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { Globe, Building2, LogIn, FileWarning, ShieldCheck, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

function AcceptFlow({ token, organizationName }: { token: string; organizationName: string }) {
  const navigate = useNavigate();
  const acceptAdminInvite = useMutation(api.orgAdminInvites.acceptAdminInvite);
  const declineAdminInvite = useMutation(api.orgAdminInvites.declineAdminInvite);
  const [submitting, setSubmitting] = useState(false);

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      await declineAdminInvite({ token });
      toast.success("Invite declined.");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not decline. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      await acceptAdminInvite({ token });
      toast.success(`You're now an admin on ${organizationName}.`);
      navigate("/business/dashboard");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not accept. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-5 text-center">
      <ShieldCheck className="w-10 h-10 text-accent mx-auto" />
      <h2 className="font-serif text-2xl font-semibold text-primary">
        Join {organizationName} as an admin?
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        You'll get full admin access — inviting and tracking the cohort, exporting compliance reports, and managing the organisation alongside its other admins.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button disabled={submitting} onClick={() => void handleAccept()} className="cursor-pointer font-semibold disabled:opacity-60">
          <CheckCircle2 className="w-4 h-4 mr-1.5" /> {submitting ? "Joining…" : "Accept & Join"}
        </Button>
        <Button variant="outline" disabled={submitting} onClick={() => void handleDecline()} className="cursor-pointer font-semibold disabled:opacity-60">
          <XCircle className="w-4 h-4 mr-1.5" /> Decline
        </Button>
      </div>
    </div>
  );
}

function AdminInviteInner({ token }: { token: string }) {
  const navigate = useNavigate();
  const invite = useQuery(api.orgAdminInvites.getAdminInviteByToken, { token });

  if (invite === undefined) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (invite === null) {
    return (
      <div className="text-center py-16">
        <FileWarning className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="font-serif text-2xl font-semibold text-primary mb-2">Invite not found</h2>
        <p className="text-sm text-muted-foreground">This admin invite link is invalid or has already been used.</p>
      </div>
    );
  }

  if (invite.status !== "pending") {
    const labels: Record<string, string> = {
      accepted: "This invite has already been accepted.",
      declined: "This invite was declined.",
      revoked: "This invite was revoked.",
      expired: "This invite has expired. Ask the sender to resend it.",
    };
    return (
      <div className="text-center py-16">
        <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-serif text-2xl font-semibold text-primary mb-2">{invite.organizationName}</h2>
        <p className="text-sm text-muted-foreground">{labels[invite.status] ?? "This invite is no longer active."}</p>
      </div>
    );
  }

  return (
    <>
      <AuthLoading>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </AuthLoading>
      <Unauthenticated>
        <div className="text-center py-10 bg-card border border-border rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
            <LogIn className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-primary mb-3">Sign in to respond</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            This invite was sent to {invite.maskedEmail} for {invite.organizationName}. Sign in with that email to accept or decline.
          </p>
          <Button
            size="lg"
            className="cursor-pointer font-semibold"
            onClick={() => navigate(`/login?returnTo=${encodeURIComponent(`/business/admin-invite/${token}`)}`)}
          >
            Sign In
          </Button>
        </div>
      </Unauthenticated>
      <Authenticated>
        {invite.isCorrectAccount === false ? (
          <div className="text-center py-16">
            <FileWarning className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="font-serif text-2xl font-semibold text-primary mb-2">Wrong account</h2>
            <p className="text-sm text-muted-foreground">
              This invite was sent to {invite.maskedEmail}. Sign in with that email address to respond.
            </p>
          </div>
        ) : (
          <AcceptFlow token={token} organizationName={invite.organizationName} />
        )}
      </Authenticated>
    </>
  );
}

export default function BusinessAdminInvitePage() {
  const { token } = useParams<{ token: string }>();
  useSeo({ title: "Admin Invite", description: "Respond to an invite to co-admin an organisation on VisaClear." });
  const goBack = useSmartBack("/");

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
        {token ? <AdminInviteInner token={token} /> : null}
      </div>
    </div>
  );
}
