import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { convexErrMsg } from "@/lib/utils.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { Globe, Building2, LogIn, FileWarning, ShieldCheck, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

function AcceptFlow({ token, organizationName, isHousehold }: { token: string; organizationName: string; isHousehold: boolean }) {
  const { t } = useTranslation("business");
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
      toast.success(t("invite.declined_toast"));
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("invite.decline_failed"));
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
      toast.success(t("invite.accepted_toast", { org: organizationName }));
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("invite.accept_failed"));
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
        <h2 className="font-serif text-xl font-semibold text-primary">{t("invite.checklist_question")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("invite.checklist_scope_note", { org: organizationName })}
        </p>
        {savedChecklists.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("invite.no_checklists")}</p>
            <Button onClick={() => navigate("/checklist")} className="cursor-pointer font-semibold">{t("invite.create_checklist")}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedChecklistId}
              onChange={(e) => setSelectedChecklistId(e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">{t("invite.select_checklist_placeholder")}</option>
              {savedChecklists.map((c) => (
                <option key={c._id} value={c._id}>{c.title} ({c.destination} · {c.visaType})</option>
              ))}
            </select>
            <Button disabled={!selectedChecklistId || submitting} onClick={() => { void handleAccept(); }} className="cursor-pointer font-semibold disabled:opacity-60">
              {submitting ? t("invite.connecting") : t("invite.confirm_accept")}
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
        {t(isHousehold ? "invite.wants_follow" : "invite.wants_track", { org: organizationName })}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {t("invite.accept_body")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button onClick={() => setShowPicker(true)} className="cursor-pointer font-semibold">
          <CheckCircle2 className="w-4 h-4 mr-1.5" /> {t("invite.accept_invite")}
        </Button>
        <Button variant="outline" disabled={submitting} onClick={() => { void handleDecline(); }} className="cursor-pointer font-semibold">
          <XCircle className="w-4 h-4 mr-1.5" /> {t("invite.decline")}
        </Button>
      </div>
    </div>
  );
}

function InviteInner({ token }: { token: string }) {
  const { t } = useTranslation("business");
  const invite = useQuery(api.employerInvites.getInviteByToken, { token });

  if (invite === undefined) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (invite === null) {
    return (
      <div className="text-center py-16">
        <FileWarning className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="font-serif text-2xl font-semibold text-primary mb-2">{t("invite.not_found_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("invite.not_found_body")}</p>
      </div>
    );
  }
  const isHousehold = invite.organizationType === "household";

  if (invite.status !== "pending") {
    const labels: Record<string, string> = { accepted: t("invite.status_accepted"), declined: t("invite.status_declined"), revoked: t("invite.status_revoked") };
    return (
      <div className="text-center py-16">
        <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-serif text-2xl font-semibold text-primary mb-2">{invite.organizationName}</h2>
        <p className="text-sm text-muted-foreground">{labels[invite.status] ?? t("invite.status_other")}</p>
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
          <h2 className="font-serif text-2xl font-semibold text-primary mb-3">{t("invite.signin_title")}</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            {t("invite.signin_body", { email: invite.maskedEmail, org: invite.organizationName })}
          </p>
          <SignInButton size="lg" className="cursor-pointer font-semibold" signInText={t("invite.signin_cta")} />
        </div>
      </Unauthenticated>
      <Authenticated>
        {invite.isCorrectAccount === false ? (
          <div className="text-center py-16">
            <FileWarning className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="font-serif text-2xl font-semibold text-primary mb-2">{t("invite.wrong_account_title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("invite.wrong_account_body", { email: invite.maskedEmail })}
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
