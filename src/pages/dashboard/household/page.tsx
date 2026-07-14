import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoGate } from "@/components/DemoGateModal.tsx";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  Globe, ArrowLeft, Users, LayoutDashboard, Settings, LogOut, LogIn,
  UserPlus, Mail, Trash2, RefreshCw, Baby, Pencil, X, Check,
  ChevronDown, ChevronRight, ListChecks,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";
import { cn } from "@/lib/utils.ts";

type DemoHouseholdMember = {
  linkId: string;
  invitedEmail: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  relationship?: string;
  createdAt: string;
  memberName: string | null;
  readinessPercent: number | null;
};

type DemoDependent = Doc<"managed_dependents"> & { checklistCount: number };

const DEMO_HOUSEHOLD_MEMBERS: DemoHouseholdMember[] = [
  {
    linkId: "demo_link_spouse",
    invitedEmail: "partner@example.com",
    status: "accepted",
    relationship: "Spouse",
    createdAt: new Date().toISOString(),
    memberName: "Demo Partner",
    readinessPercent: 72,
  },
  {
    linkId: "demo_link_sibling",
    invitedEmail: "sibling@example.com",
    status: "pending",
    relationship: "Sibling",
    createdAt: new Date().toISOString(),
    memberName: null,
    readinessPercent: null,
  },
];

const DEMO_DEPENDENTS: DemoDependent[] = [
  {
    _id: "demo_dep_child" as Id<"managed_dependents">,
    _creationTime: Date.now(),
    parentUserId: "demo_user" as Id<"users">,
    fullName: "Demo Child",
    relationship: "Daughter",
    dateOfBirth: "2015-04-12",
    createdAt: new Date().toISOString(),
    checklistCount: 1,
  },
];

function errMessage(err: unknown, fallback: string) {
  return err instanceof ConvexError ? (err.data as { message: string }).message : fallback;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("household");
  const map: Record<string, { labelKey: string; cls: string }> = {
    pending: { labelKey: "status.pending", cls: "bg-amber-500/10 text-amber-600" },
    accepted: { labelKey: "status.accepted", cls: "bg-accent/10 text-accent" },
    declined: { labelKey: "status.declined", cls: "bg-muted text-muted-foreground" },
    revoked: { labelKey: "status.revoked", cls: "bg-muted text-muted-foreground" },
  };
  const entry = map[status] ?? { labelKey: "", cls: "bg-muted text-muted-foreground" };
  return <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-full", entry.cls)}>{entry.labelKey ? t(entry.labelKey) : status}</span>;
}

function CreateHouseholdCard() {
  const { t } = useTranslation("household");
  const createHousehold = useMutation(api.household.createHousehold);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t("create.error_name"));
      return;
    }
    setSubmitting(true);
    try {
      await createHousehold({ name: name.trim() });
      toast.success(t("create.success"));
    } catch (err) {
      toast.error(errMessage(err, "Failed to create household."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center">
        <Users className="w-5 h-5 text-accent" />
      </div>
      <div>
        <h2 className="font-serif text-xl font-semibold text-primary mb-1">{t("create.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("create.body")}
        </p>
      </div>
      <div className="flex gap-2">
        <Input placeholder={t("create.placeholder")} value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => void handleCreate()} disabled={submitting} className="cursor-pointer font-semibold shrink-0 disabled:opacity-60">
          {submitting ? t("create.submitting") : t("create.submit")}
        </Button>
      </div>
    </div>
  );
}

function AdultMembersSection({ householdName }: { householdName: string }) {
  const { t } = useTranslation("household");
  const { isDemoAuthenticated } = useDemoAuth();
  const { gate, GateModal } = useDemoGate();
  const members = useQuery(api.household.listMyHousehold, isDemoAuthenticated ? "skip" : {});
  const inviteMember = useMutation(api.household.inviteHouseholdMember);
  const resendInvite = useMutation(api.household.resendHouseholdInvite);
  const revokeInvite = useMutation(api.household.revokeHouseholdInvite);
  const [demoMembers, setDemoMembers] = useState<DemoHouseholdMember[]>(DEMO_HOUSEHOLD_MEMBERS);
  const visibleMembers = isDemoAuthenticated ? demoMembers : members;
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (gate()) return;
    setInviting(true);
    try {
      await inviteMember({ email: email.trim(), relationship: relationship.trim() });
      toast.success(t("adult.toast_invited", { email: email.trim() }));
      setEmail("");
      setRelationship("");
    } catch (err) {
      toast.error(errMessage(err, t("adult.toast_invite_error")));
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (linkId: string) => {
    if (gate()) return;
    try {
      await resendInvite({ linkId: linkId as Parameters<typeof resendInvite>[0]["linkId"] });
      toast.success(t("adult.toast_resent"));
    } catch (err) {
      toast.error(errMessage(err, t("adult.toast_resend_error")));
    }
  };

  const handleRevoke = async (linkId: string) => {
    if (gate()) return;
    try {
      await revokeInvite({ linkId: linkId as Parameters<typeof revokeInvite>[0]["linkId"] });
      toast.success(t("adult.toast_revoked"));
    } catch (err) {
      toast.error(errMessage(err, t("adult.toast_revoke_error")));
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-primary">{t("adult.title")}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("adult.body", { name: householdName })}
      </p>

      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
        <Input type="email" placeholder={t("adult.email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder={t("adult.rel_placeholder")} value={relationship} onChange={(e) => setRelationship(e.target.value)} />
        <Button
          onClick={() => void handleInvite()}
          disabled={inviting || !email.trim() || !relationship.trim()}
          className="cursor-pointer font-semibold disabled:opacity-60"
        >
          <UserPlus className="w-4 h-4 mr-1.5" /> {t("adult.invite")}
        </Button>
      </div>

      <div className="space-y-2">
        {visibleMembers === undefined ? (
          <p className="text-xs text-muted-foreground/70 italic">{t("adult.loading")}</p>
        ) : visibleMembers.length === 0 ? (
          <p className="text-xs text-muted-foreground/70 italic">{t("adult.empty")}</p>
        ) : (
          visibleMembers.map((m) => (
            <div key={m.linkId} className="flex items-center gap-3 border border-border rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{m.memberName ?? m.invitedEmail}</div>
                <div className="text-xs text-muted-foreground truncate">{m.relationship ?? "Family member"}</div>
              </div>
              {m.readinessPercent !== null && (
                <span className="text-xs font-semibold text-accent shrink-0">{t("adult.ready", { n: m.readinessPercent })}</span>
              )}
              <StatusBadge status={m.status} />
              {m.status === "pending" && (
                <button
                  onClick={() => void handleResend(m.linkId)}
                  className="p-1.5 rounded-lg hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                  title="Resend invite"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              {(m.status === "pending" || m.status === "accepted") && (
                <button
                  onClick={() => void handleRevoke(m.linkId)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
                  title="Revoke"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
      {GateModal}
    </div>
  );
}

function DependentChecklistsExpander({
  dependentId,
  dependentName,
}: {
  dependentId: Id<"managed_dependents">;
  dependentName: string;
}) {
  const navigate = useNavigate();
  const { isDemoAuthenticated } = useDemoAuth();
  const checklists = useQuery(
    api.checklists.getChecklistsForDependent,
    isDemoAuthenticated ? "skip" : { dependentId },
  );

  if (isDemoAuthenticated) {
    return (
      <div className="px-2 py-2">
        <p className="text-xs text-muted-foreground/70">
          Demo mode — checklists linked to {dependentName} would appear here.
        </p>
      </div>
    );
  }

  if (checklists === undefined) {
    return <p className="text-xs text-muted-foreground/60 italic px-2 py-2">Loading…</p>;
  }

  if (checklists.length === 0) {
    return (
      <div className="px-2 py-2">
        <p className="text-xs text-muted-foreground/70">
          No checklists linked to {dependentName} yet.{" "}
          <button
            type="button"
            onClick={() => navigate("/checklist")}
            className="text-accent hover:underline cursor-pointer font-medium"
          >
            Create one
          </button>
          {" "}and select {dependentName} as the dependent.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {checklists.map((cl) => (
        <button
          key={cl._id}
          type="button"
          onClick={() => navigate(`/dashboard/trips/${cl._id}`)}
          className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-primary/5 text-left transition-colors cursor-pointer group"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{cl.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {cl.destination} · {cl.visaType} · {cl.progress}% complete
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <div className="w-14 h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${cl.progress}%` }}
              />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
          </div>
        </button>
      ))}
    </div>
  );
}

function ManagedDependentsSection() {
  const { t } = useTranslation("household");
  const { isDemoAuthenticated } = useDemoAuth();
  const { gate, GateModal: DepGateModal } = useDemoGate();
  const dependents = useQuery(api.managedDependents.listMyDependents, isDemoAuthenticated ? "skip" : {});
  const addDependent = useMutation(api.managedDependents.addDependent);
  const updateDependent = useMutation(api.managedDependents.updateDependent);
  const deleteDependent = useMutation(api.managedDependents.deleteDependent);
  const [demoDependents, setDemoDependents] = useState<DemoDependent[]>(DEMO_DEPENDENTS);
  const visibleDependents = isDemoAuthenticated ? demoDependents : dependents;

  const [fullName, setFullName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const [expandedDepId, setExpandedDepId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (gate()) return;
    setAdding(true);
    try {
      await addDependent({ fullName: fullName.trim(), relationship: relationship.trim(), dateOfBirth: dateOfBirth || undefined });
      toast.success(t("dep.toast_added", { name: fullName.trim() }));
      setFullName("");
      setRelationship("");
      setDateOfBirth("");
    } catch (err) {
      toast.error(errMessage(err, t("dep.toast_add_error")));
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (gate()) { setEditingId(null); return; }
    try {
      await updateDependent({ id: id as Parameters<typeof updateDependent>[0]["id"], fullName: editName.trim(), relationship: editRelationship.trim() });
      setEditingId(null);
    } catch (err) {
      toast.error(errMessage(err, t("dep.toast_update_error")));
    }
  };

  const handleDelete = async (id: string, _name: string) => {
    if (gate()) return;
    try {
      await deleteDependent({ id: id as Parameters<typeof deleteDependent>[0]["id"] });
      toast.success(t("dep.toast_removed", { name: _name }));
    } catch (err) {
      toast.error(errMessage(err, t("dep.toast_remove_error")));
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <Baby className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-primary">{t("dep.title")}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("dep.body")}
      </p>

      <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2">
        <Input placeholder={t("dep.name_placeholder")} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input placeholder={t("dep.rel_placeholder")} value={relationship} onChange={(e) => setRelationship(e.target.value)} />
        <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-36" />
        <Button
          onClick={() => void handleAdd()}
          disabled={adding || !fullName.trim() || !relationship.trim()}
          className="cursor-pointer font-semibold disabled:opacity-60"
        >
          <UserPlus className="w-4 h-4 mr-1.5" /> {t("dep.add")}
        </Button>
      </div>

      <div className="space-y-2">
        {visibleDependents === undefined ? (
          <p className="text-xs text-muted-foreground/70 italic">{t("dep.loading")}</p>
        ) : visibleDependents.length === 0 ? (
          <p className="text-xs text-muted-foreground/70 italic">{t("dep.empty")}</p>
        ) : (
          visibleDependents.map((dep) => {
            const isExpanded = expandedDepId === dep._id;
            const isEditing = editingId === dep._id;
            return (
              <div key={dep._id} className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  {isEditing ? (
                    <>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" />
                      <Input value={editRelationship} onChange={(e) => setEditRelationship(e.target.value)} className="h-8 text-sm w-36" />
                      <button type="button" onClick={() => void handleSaveEdit(dep._id)} className="text-accent hover:opacity-70 cursor-pointer shrink-0"><Check className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-muted-foreground hover:opacity-70 cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{dep.fullName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {dep.relationship}{dep.checklistCount > 0 ? ` · ${t(dep.checklistCount === 1 ? "dep.checklists_one" : "dep.checklists_other", { count: dep.checklistCount })}` : ""}
                        </div>
                      </div>
                      {dep.checklistCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedDepId(isExpanded ? null : dep._id)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shrink-0",
                            isExpanded
                              ? "bg-accent/10 text-accent"
                              : "text-muted-foreground hover:text-accent hover:bg-accent/5",
                          )}
                          title={isExpanded ? "Hide checklists" : "View checklists"}
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{dep.checklistCount}</span>
                          <ChevronDown className={cn("w-3 h-3 transition-transform duration-150", isExpanded ? "rotate-180" : "")} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setEditingId(dep._id); setEditName(dep.fullName); setEditRelationship(dep.relationship); setExpandedDepId(null); }}
                        className="p-1.5 rounded-lg hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(dep._id, dep.fullName)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                {isExpanded && !isEditing && (
                  <div className="border-t border-border bg-muted/30 px-3 py-2">
                    <DependentChecklistsExpander
                      dependentId={dep._id as Id<"managed_dependents">}
                      dependentName={dep.fullName}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {DepGateModal}
    </div>
  );
}

function HouseholdContent() {
  const { t } = useTranslation("household");
  const navigate = useNavigate();
  const { isDemoAuthenticated } = useDemoAuth();
  const myOrg = useQuery(api.organizations.getMyOrganization, isDemoAuthenticated ? "skip" : {});

  if (isDemoAuthenticated) {
    return (
      <div className="space-y-6">
        <AdultMembersSection householdName="The Demo Family" />
        <ManagedDependentsSection />
      </div>
    );
  }

  if (myOrg === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (myOrg && myOrg.type !== "household") {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl">
        <Mail className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-semibold text-primary mb-2">{t("employer_conflict.title")}</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
          {t("employer_conflict.body")}
        </p>
        <Button variant="outline" className="cursor-pointer font-semibold" onClick={() => navigate("/business/dashboard")}>
          {t("employer_conflict.cta")}
        </Button>
      </div>
    );
  }
  if (!myOrg) {
    return <CreateHouseholdCard />;
  }
  return (
    <div className="space-y-6">
      <AdultMembersSection householdName={myOrg.name} />
      <ManagedDependentsSection />
    </div>
  );
}

export default function HouseholdPage() {
  const { t } = useTranslation("household");
  useSeo({ title: "Family & Household — VisaClear", description: "Track visa readiness for your whole family in one place." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated, signOut } = useDemoAuth();
  const { isAuthenticated, signOut: signOutReal } = useAuth();
  const canAccess = isDemoAuthenticated || isAuthenticated;

  const handleSignOut = async () => {
    if (isAuthenticated) {
      await signOutReal();
      navigate("/");
      return;
    }
    signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
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
              <Users className="w-3.5 h-3.5 text-accent" /> {t("header.badge")}
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

      <div className="max-w-3xl mx-auto px-4 py-8">
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
              <AuthAccessPanel returnPath="/dashboard/household" />
            </div>
          </div>
        ) : (
          <HouseholdContent />
        )}
      </div>

    </div>
  );
}
