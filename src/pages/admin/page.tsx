import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { ALL_COUNTRIES } from "@/lib/countries.ts";
import {
  Globe, ArrowLeft, Shield, Users, FileText, BarChart3,
  CheckCircle2, XCircle, Trash2, ChevronDown, ChevronUp,
  AlertCircle, UserCheck, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel.js";

type Tab = "overview" | "users" | "agents" | "country-watch";

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3 text-primary">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className="font-serif text-3xl font-semibold text-primary">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function AdminInner() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const stats = useQuery(api.admin.getStats, {});
  const users = useQuery(api.admin.getUsers, { limit: 100 });
  const agents = useQuery(api.admin.getAgents, {});
  const updatePlan = useMutation(api.admin.updateUserPlan);
  const updateRole = useMutation(api.admin.updateUserRole);
  const deleteUser = useMutation(api.admin.deleteUser);
  const verifyAgent = useMutation(api.admin.verifyAgent);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const handlePlanChange = async (userId: Doc<"users">["_id"], plan: "free" | "pro" | "expert") => {
    try {
      await updatePlan({ userId, plan });
      toast.success("Plan updated");
    } catch {
      toast.error("Failed to update plan");
    }
  };

  const handleRoleChange = async (userId: Doc<"users">["_id"], role: "admin" | "user") => {
    try {
      await updateRole({ userId, role });
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleDeleteUser = async (userId: Doc<"users">["_id"]) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      await deleteUser({ userId });
      toast.success("User deleted");
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleVerifyAgent = async (agentId: Doc<"agent_profiles">["_id"], verified: boolean) => {
    try {
      await verifyAgent({ agentId, verified });
      toast.success(verified ? "Agent verified" : "Agent unverified");
    } catch {
      toast.error("Failed to update agent");
    }
  };

  const isLoading = stats === undefined;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {(["overview", "users", "agents", "country-watch"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer",
              tab === t ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "country-watch" ? "Country Watch" : t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Users className="w-4 h-4" />} label="Total Users" value={stats.totalUsers} />
              <StatCard icon={<Shield className="w-4 h-4" />} label="Pro/Expert" value={stats.proUsers} sub={`${stats.freeUsers} free`} />
              <StatCard icon={<FileText className="w-4 h-4" />} label="Checklists Saved" value={stats.totalChecklists} />
              <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Rejections Analysed" value={stats.totalRejectionAnalyses} />
              <StatCard icon={<UserCheck className="w-4 h-4" />} label="Agent Profiles" value={stats.totalAgents} />
              <StatCard
                icon={<Settings className="w-4 h-4" />}
                label="Free Users"
                value={`${stats.totalUsers > 0 ? Math.round((stats.freeUsers / stats.totalUsers) * 100) : 0}%`}
                sub="on free plan"
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Users */}
      {tab === "users" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {users === undefined ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No users yet.</div>
          ) : (
            users.map((user) => (
              <div key={user._id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">{user.name ?? "No name"}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email ?? "No email"}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      user.plan === "pro" || user.plan === "expert" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                    )}>
                      {user.plan ?? "free"}
                    </span>
                    {user.role === "admin" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">admin</span>
                    )}
                    {expandedUser === user._id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {expandedUser === user._id && (
                  <div className="border-t border-border p-4 bg-muted/20 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Plan</label>
                        <select
                          value={user.plan ?? "free"}
                          onChange={(e) => { void handlePlanChange(user._id, e.target.value as "free" | "pro" | "expert"); }}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Role</label>
                        <select
                          value={user.role ?? "user"}
                          onChange={(e) => { void handleRoleChange(user._id, e.target.value as "admin" | "user"); }}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => { void handleDeleteUser(user._id); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete User
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* Agents */}
      {tab === "agents" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {agents === undefined ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : agents.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No agent profiles yet.</div>
          ) : (
            agents.map((agent) => (
              <div key={agent._id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold text-sm text-foreground">{agent.fullName}</div>
                      {agent.verified ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{agent.email} &nbsp;·&nbsp; {agent.country}</div>
                    <div className="text-xs text-muted-foreground mt-1">{agent.specialisations.slice(0, 3).join(", ")}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!agent.verified ? (
                      <button
                        onClick={() => { void handleVerifyAgent(agent._id, true); }}
                        className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                      </button>
                    ) : (
                      <button
                        onClick={() => { void handleVerifyAgent(agent._id, false); }}
                        className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Unverify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* Country Watch */}
      {tab === "country-watch" && <CountryWatchAdminPanel />}
    </div>
  );
}

function CountryWatchAdminPanel() {
  const updates = useQuery(api.countryWatch.listUpdates, {});
  const publishUpdate = useMutation(api.countryWatch.publishUpdate);
  const [countryName, setCountryName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!countryName || !title.trim() || !body.trim()) {
      toast.error("Country, title, and body are all required.");
      return;
    }
    setPublishing(true);
    try {
      await publishUpdate({ countryName, title: title.trim(), body: body.trim() });
      toast.success(`Published. Notifying everyone watching ${countryName}.`);
      setTitle("");
      setBody("");
    } catch {
      toast.error("Failed to publish update.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-4">Publish a policy update</h3>
        <p className="text-xs text-muted-foreground mb-4">
          This emails every user watching this country in real time. Only publish real, verified policy changes.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Country</label>
            <select
              value={countryName}
              onChange={(e) => setCountryName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a country…</option>
              {ALL_COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. "UK Visitor Visa Update — Financial evidence requirement has changed"'
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Details</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Explain exactly what changed and what affected applicants should do."
              className="min-h-[120px]"
            />
          </div>
          <Button disabled={publishing} className="cursor-pointer font-semibold" onClick={() => void handlePublish()}>
            {publishing ? "Publishing…" : "Publish & notify watchers"}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">Published updates</h3>
        {updates === undefined ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates published yet.</p>
        ) : (
          <div className="space-y-2">
            {updates.map((u) => (
              <div key={u._id} className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">{u.countryName}</div>
                <div className="text-sm font-semibold text-foreground mb-1">{u.title}</div>
                <div className="text-xs text-muted-foreground">{u.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.getCurrentUser, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">by Vericore</span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Shield className="w-3.5 h-3.5 text-accent" /> Admin Panel
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <AuthLoading>
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        </AuthLoading>
        <Unauthenticated>
          <div className="text-center py-20">
            <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-semibold text-primary mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground text-sm mb-6">Sign in with an admin account to continue.</p>
            <SignInButton size="lg" className="cursor-pointer" signInText="Sign In" />
          </div>
        </Unauthenticated>
        <Authenticated>
          {currentUser !== undefined && currentUser?.role !== "admin" ? (
            <div className="text-center py-20">
              <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <h2 className="font-serif text-2xl font-semibold text-primary mb-2">Access Denied</h2>
              <p className="text-muted-foreground text-sm mb-6">You do not have admin privileges to view this page.</p>
              <Button onClick={() => navigate("/")} className="cursor-pointer">Go Home</Button>
            </div>
          ) : (
            <AdminInner />
          )}
        </Authenticated>
      </div>

      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Vericore Ltd. &nbsp;·&nbsp; Admin Panel</p>
      </footer>
    </div>
  );
}
