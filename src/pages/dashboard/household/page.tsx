import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  Globe, ArrowLeft, Users, LayoutDashboard, Settings, LogOut, LogIn,
  UserPlus, Mail, Trash2, RefreshCw, Baby, Pencil, X, Check,
} from "lucide-react";
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

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-600" },
    accepted: { label: "Connected", cls: "bg-accent/10 text-accent" },
    declined: { label: "Declined", cls: "bg-muted text-muted-foreground" },
    revoked: { label: "Revoked", cls: "bg-muted text-muted-foreground" },
  };
  const entry = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-full", entry.cls)}>{entry.label}</span>;
}

function CreateHouseholdCard() {
  const createHousehold = useMutation(api.household.createHousehold);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please name your household (e.g. \"The Adeyemi Family\").");
      return;
    }
    setSubmitting(true);
    try {
      await createHousehold({ name: name.trim() });
      toast.success("Household created.");
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
        <h2 className="font-serif text-xl font-semibold text-primary mb-1">Set up your household</h2>
        <p className="text-sm text-muted-foreground">
          Give your family a name to start inviting adult relatives and adding dependents you manage directly.
        </p>
      </div>
      <div className="flex gap-2">
        <Input placeholder="The Adeyemi Family" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => void handleCreate()} disabled={submitting} className="cursor-pointer font-semibold shrink-0 disabled:opacity-60">
          {submitting ? "Creating…" : "Create"}
        </Button>
      </div>
    </div>
  );
}

function AdultMembersSection({ householdName }: { householdName: string }) {
  const { isDemoAuthenticated } = useDemoAuth();
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
    if (isDemoAuthenticated) {
      setDemoMembers((prev) => [
        ...prev,
        {
          linkId: `demo_link_${Date.now()}`,
          invitedEmail: email.trim(),
          status: "pending",
          relationship: relationship.trim(),
          createdAt: new Date().toISOString(),
          memberName: null,
          readinessPercent: null,
        },
      ]);
      toast.success(`Invite sent to ${email.trim()}. (demo only)`);
      setEmail("");
      setRelationship("");
      return;
    }
    setInviting(true);
    try {
      await inviteMember({ email: email.trim(), relationship: relationship.trim() });
      toast.success(`Invite sent to ${email.trim()}.`);
      setEmail("");
      setRelationship("");
    } catch (err) {
      toast.error(errMessage(err, "Failed to send invite."));
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (linkId: string) => {
    if (isDemoAuthenticated) {
      toast.success("Invite resent. (demo only)");
      return;
    }
    try {
      await resendInvite({ linkId: linkId as Parameters<typeof resendInvite>[0]["linkId"] });
      toast.success("Invite resent.");
    } catch (err) {
      toast.error(errMessage(err, "Failed to resend."));
    }
  };

  const handleRevoke = async (linkId: string) => {
    if (isDemoAuthenticated) {
      setDemoMembers((prev) => prev.filter((m) => m.linkId !== linkId));
      toast.success("Invite revoked. (demo only)");
      return;
    }
    try {
      await revokeInvite({ linkId: linkId as Parameters<typeof revokeInvite>[0]["linkId"] });
      toast.success("Invite revoked.");
    } catch (err) {
      toast.error(errMessage(err, "Failed to revoke."));
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-primary">Adult family members</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Invite a spouse or adult child to share visa readiness with {householdName}. They control exactly which
        checklist (if any) to link, and can disconnect at any time — you'll never see their financial answers,
        risk score breakdown, or documents.
      </p>

      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
        <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Relationship (e.g. Spouse)" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
        <Button
          onClick={() => void handleInvite()}
          disabled={inviting || !email.trim() || !relationship.trim()}
          className="cursor-pointer font-semibold disabled:opacity-60"
        >
          <UserPlus className="w-4 h-4 mr-1.5" /> Invite
        </Button>
      </div>

      <div className="space-y-2">
        {visibleMembers === undefined ? (
          <p className="text-xs text-muted-foreground/70 italic">Loading…</p>
        ) : visibleMembers.length === 0 ? (
          <p className="text-xs text-muted-foreground/70 italic">No family members invited yet.</p>
        ) : (
          visibleMembers.map((m) => (
            <div key={m.linkId} className="flex items-center gap-3 border border-border rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{m.memberName ?? m.invitedEmail}</div>
                <div className="text-xs text-muted-foreground truncate">{m.relationship ?? "Family member"}</div>
              </div>
              {m.readinessPercent !== null && (
                <span className="text-xs font-semibold text-accent shrink-0">{m.readinessPercent}% ready</span>
              )}
              {statusBadge(m.status)}
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
    </div>
  );
}

function ManagedDependentsSection() {
  const { isDemoAuthenticated } = useDemoAuth();
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

  const handleAdd = async () => {
    if (isDemoAuthenticated) {
      setDemoDependents((prev) => [
        ...prev,
        {
          _id: `demo_dep_${Date.now()}` as Id<"managed_dependents">,
          _creationTime: Date.now(),
          parentUserId: "demo_user" as Id<"users">,
          fullName: fullName.trim(),
          relationship: relationship.trim(),
          dateOfBirth: dateOfBirth || undefined,
          createdAt: new Date().toISOString(),
          checklistCount: 0,
        },
      ]);
      toast.success(`${fullName.trim()} added. (demo only)`);
      setFullName("");
      setRelationship("");
      setDateOfBirth("");
      return;
    }
    setAdding(true);
    try {
      await addDependent({ fullName: fullName.trim(), relationship: relationship.trim(), dateOfBirth: dateOfBirth || undefined });
      toast.success(`${fullName.trim()} added.`);
      setFullName("");
      setRelationship("");
      setDateOfBirth("");
    } catch (err) {
      toast.error(errMessage(err, "Failed to add dependent."));
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (isDemoAuthenticated) {
      setDemoDependents((prev) => prev.map((d) => (d._id === id ? { ...d, fullName: editName.trim(), relationship: editRelationship.trim() } : d)));
      setEditingId(null);
      return;
    }
    try {
      await updateDependent({ id: id as Parameters<typeof updateDependent>[0]["id"], fullName: editName.trim(), relationship: editRelationship.trim() });
      setEditingId(null);
    } catch (err) {
      toast.error(errMessage(err, "Failed to update."));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (isDemoAuthenticated) {
      setDemoDependents((prev) => prev.filter((d) => d._id !== id));
      toast.success(`${name} removed. (demo only)`);
      return;
    }
    try {
      await deleteDependent({ id: id as Parameters<typeof deleteDependent>[0]["id"] });
      toast.success(`${name} removed.`);
    } catch (err) {
      toast.error(errMessage(err, "Failed to remove dependent."));
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <Baby className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-primary">Dependents you manage directly</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        For a child or anyone with no VisaClear account of their own. No invite needed — you create and own their
        record and any checklists you save on their behalf.
      </p>

      <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2">
        <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input placeholder="Relationship (e.g. Son)" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
        <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-36" />
        <Button
          onClick={() => void handleAdd()}
          disabled={adding || !fullName.trim() || !relationship.trim()}
          className="cursor-pointer font-semibold disabled:opacity-60"
        >
          <UserPlus className="w-4 h-4 mr-1.5" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {visibleDependents === undefined ? (
          <p className="text-xs text-muted-foreground/70 italic">Loading…</p>
        ) : visibleDependents.length === 0 ? (
          <p className="text-xs text-muted-foreground/70 italic">No dependents added yet.</p>
        ) : (
          visibleDependents.map((dep) => (
            <div key={dep._id} className="flex items-center gap-3 border border-border rounded-xl p-3">
              {editingId === dep._id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" />
                  <Input value={editRelationship} onChange={(e) => setEditRelationship(e.target.value)} className="h-8 text-sm w-36" />
                  <button onClick={() => void handleSaveEdit(dep._id)} className="text-accent hover:opacity-70 cursor-pointer shrink-0"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:opacity-70 cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{dep.fullName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {dep.relationship}{dep.checklistCount > 0 ? ` · ${dep.checklistCount} checklist${dep.checklistCount > 1 ? "s" : ""}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => { setEditingId(dep._id); setEditName(dep.fullName); setEditRelationship(dep.relationship); }}
                    className="p-1.5 rounded-lg hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void handleDelete(dep._id, dep.fullName)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HouseholdContent() {
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
        <h2 className="font-serif text-2xl font-semibold text-primary mb-2">You're linked to an employer organisation</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
          Your account is already an admin of an employer organisation. Multi-membership isn't supported yet, so a
          separate household can't be created from this account.
        </p>
        <Button variant="outline" className="cursor-pointer font-semibold" onClick={() => navigate("/business/dashboard")}>
          Go to Employer Dashboard
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
              <Users className="w-3.5 h-3.5 text-accent" /> Family & Household
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

      <div className="max-w-3xl mx-auto px-4 py-8">
        {!canAccess ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">Sign In to Continue</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Track visa readiness for your whole family in one place.
            </p>
            <div className="max-w-sm mx-auto">
              <AuthAccessPanel returnPath="/dashboard/household" />
            </div>
          </div>
        ) : (
          <HouseholdContent />
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
