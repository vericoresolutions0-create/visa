import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { Globe, Building2, LogIn, FileWarning, ShieldCheck, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

function AcceptFlow({ token, organizationName, isHousehold }: { token: string; organizationName: string; isHousehold: boolean }) {
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.getCurrentUser);
  const savedChecklists = useQuery(api.checklists.getSavedChecklists);
  const acceptInvite = useMutation(api.employerInvites.acceptInvite);
  const declineInvite = useMutation(api.employerInvites.declineInvite);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      await declineInvite({ token });
      toast.success("Invite declined.");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to decline invite.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      await acceptInvite({
        token,
        linkedChecklistId: selectedChecklistId ? (selectedChecklistId as Id<"saved_checklists">) : undefined,
      });
      toast.success(`You're now connected to ${organizationName}.`);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to accept invite.");
    } finally {
      setSubmitting(false);
    }
  };

  if (currentUser === undefined || savedChecklists === undefined) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  if (showPicker) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 space-y-5">
        <h2 className="font-serif text-xl font-semibold text-primary">Which checklist is your relocation visa?</h2>
        <p className="text-sm text-muted-foreground">
          {organizationName} will only ever see this one trip's readiness — not any other saved checklist you have.
        </p>
        {savedChecklists.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">You don't have any saved checklists yet. Create one first, then come back to this link to finish accepting.</p>
            <Button onClick={() => navigate("/checklist")} className="cursor-pointer font-semibold">Create a Checklist</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedChecklistId}
              onChange={(e) => setSelectedChecklistId(e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Select a checklist…</option>
              {savedChecklists.map((c) => (
                <option key={c._id} value={c._id}>{c.title} ({c.destination} · {c.visaType})</option>
              ))}
            </select>
            <Button disabled={!selectedChecklistId || submitting} onClick={() => { void handleAccept(); }} className="cursor-pointer font-semibold disabled:opacity-60">
              {submitting ? "Connecting…" : "Confirm and Accept"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8 space-y-5 text-center">
      <ShieldCheck className="w-10 h-10 text-accent mx-auto" />
      <h2 className="font-serif text-2xl font-semibold text-primary">
        {organizationName} wants to {isHousehold ? "follow your visa readiness" : "track your visa readiness"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        If you accept, they'll see your overall readiness % and a simple status for one checklist you choose. Never your financial answers, risk score breakdown, or documents. You can disconnect at any time.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button onClick={() => setShowPicker(true)} className="cursor-pointer font-semibold">
          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Accept Invite
        </Button>
        <Button variant="outline" disabled={submitting} onClick={() => { void handleDecline(); }} className="cursor-pointer font-semibold">
          <XCircle className="w-4 h-4 mr-1.5" /> Decline
        </Button>
      </div>
    </div>
  );
}

function InviteInner({ token }: { token: string }) {
  const invite = useQuery(api.employerInvites.getInviteByToken, { token });
  const currentUser = useQuery(api.users.getCurrentUser);

  if (invite === undefined) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (invite === null) {
    return (
      <div className="text-center py-16">
        <FileWarning className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="font-serif text-2xl font-semibold text-primary mb-2">Invite Not Found</h2>
        <p className="text-sm text-muted-foreground">This invite link is invalid. Please ask whoever sent it to resend it.</p>
      </div>
    );
  }
  const isHousehold = invite.organizationType === "household";

  if (invite.status !== "pending") {
    const labels: Record<string, string> = { accepted: "You already accepted this invite.", declined: "You declined this invite.", revoked: "This invite has been revoked." };
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
          <h2 className="font-serif text-2xl font-semibold text-primary mb-3">Sign In to Respond</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Sign in with <span className="font-semibold text-foreground">{invite.invitedEmail}</span> to accept or decline this invite from {invite.organizationName}.
          </p>
          <SignInButton size="lg" className="cursor-pointer font-semibold" signInText="Sign In to Continue" />
        </div>
      </Unauthenticated>
      <Authenticated>
        {currentUser && currentUser.email?.toLowerCase() !== invite.invitedEmail ? (
          <div className="text-center py-16">
            <FileWarning className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="font-serif text-2xl font-semibold text-primary mb-2">This Invite Isn't for Your Account</h2>
            <p className="text-sm text-muted-foreground">
              This invite was sent to <span className="font-semibold text-foreground">{invite.invitedEmail}</span>. Please sign in with that email to respond.
            </p>
          </div>
        ) : (
          <AcceptFlow token={token} organizationName={invite.organizationName} isHousehold={isHousehold} />
        )}
      </Authenticated>
    </>
  );
}

export default function BusinessInvitePage() {
  const { token } = useParams<{ token: string }>();
  useSeo({ title: "Invite", description: "Respond to an invite to share your visa readiness." });
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
        {token ? <InviteInner token={token} /> : null}
      </div>
    </div>
  );
}
