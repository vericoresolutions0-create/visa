import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
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
  AlertCircle, UserCheck, Settings, Send,
  Building2, Copy, Plus, Eye, UserPlus, ListChecks, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";
import { useSmartBack } from "@/hooks/use-smart-back.ts";

type Tab = "overview" | "users" | "agents" | "country-watch" | "data-freshness" | "telegram-bot" | "whatsapp-bot" | "wall-of-fame" | "wait-times" | "partners" | "leads" | "employers" | "audit-log";

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
        {(["overview", "users", "agents", "country-watch", "data-freshness", "telegram-bot", "whatsapp-bot", "wall-of-fame", "wait-times", "partners", "leads", "employers", "audit-log"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer",
              tab === t ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "country-watch"
              ? "Country Watch"
              : t === "data-freshness"
                ? "Data Freshness"
                : t === "telegram-bot"
                  ? "Telegram Bot"
                  : t === "whatsapp-bot"
                    ? "WhatsApp Bot"
                    : t === "wall-of-fame"
                      ? "Wall of Fame"
                      : t === "wait-times"
                        ? "Wait Times"
                        : t === "partners"
                          ? "Partners"
                          : t === "leads"
                            ? "Leads"
                            : t === "employers"
                              ? "Employers"
                              : t === "audit-log"
                                ? "Audit Log"
                                : t}
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

      {/* Data Freshness */}
      {tab === "data-freshness" && <DataFreshnessPanel />}

      {/* Telegram Bot */}
      {tab === "telegram-bot" && <TelegramBotPanel />}

      {tab === "whatsapp-bot" && <WhatsAppBotPanel />}

      {/* Wall of Fame */}
      {tab === "wall-of-fame" && <WallOfFameAdminPanel />}

      {/* Wait Times */}
      {tab === "wait-times" && <WaitTimesAdminPanel />}

      {/* Partners */}
      {tab === "partners" && <PartnersAdminPanel />}

      {/* Leads */}
      {tab === "leads" && <LeadsAdminPanel />}

      {/* Employers */}
      {tab === "employers" && <EmployersAdminPanel />}

      {/* Audit Log */}
      {tab === "audit-log" && <AuditLogPanel />}
    </div>
  );
}

function WallOfFameAdminPanel() {
  const pending = useQuery(api.wallOfFame.listPendingStories, {});
  const moderate = useMutation(api.wallOfFame.moderateStory);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleModerate = async (storyId: string, decision: "approved" | "rejected") => {
    setProcessingId(storyId);
    try {
      await moderate({ storyId: storyId as Id<"wall_of_fame_stories">, decision });
      toast.success(decision === "approved" ? "Story approved and now public." : "Story rejected.");
    } catch {
      toast.error("Could not update this story. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        Pending Stories ({pending?.length ?? 0})
      </h3>
      <p className="text-xs text-muted-foreground">
        Nothing here is public until approved. Check for accidental personal identifiers and anything that names a
        specific embassy officer before approving.
      </p>
      {pending === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : pending.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          No stories awaiting review.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((story) => (
            <div key={story._id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-primary">
                  {story.destination} · {story.visaType} · refused {story.refusalCount}×
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(story.createdAt).toLocaleString("en-GB")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1"><span className="font-semibold">Went wrong:</span> {story.whatWentWrong}</p>
              <p className="text-xs text-muted-foreground mb-3"><span className="font-semibold">Fixed it:</span> {story.whatFixedIt}</p>
              <div className="flex gap-2">
                <button
                  disabled={processingId === story._id}
                  onClick={() => { void handleModerate(story._id, "approved"); }}
                  className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  disabled={processingId === story._id}
                  onClick={() => { void handleModerate(story._id, "rejected"); }}
                  className="flex items-center gap-1 text-xs font-semibold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PartnersAdminPanel() {
  const partners = useQuery(api.partners.listPartners, {});
  const createPartner = useMutation(api.partners.createPartner);
  const toggleActive = useMutation(api.partners.togglePartnerActive);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [partnerType, setPartnerType] = useState<"university" | "agency" | "other">("university");
  const [submitting, setSubmitting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const result = await createPartner({ name, slug: slug || name, partnerType });
      toast.success(`Partner link ready: ?ref=${result.slug}`);
      setName("");
      setSlug("");
      setShowForm(false);
    } catch (err) {
      const message = err instanceof ConvexError ? (err.data as { message: string }).message : "Could not create partner. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (partnerSlug: string) => {
    const link = `${window.location.origin}/?ref=${partnerSlug}`;
    void navigator.clipboard.writeText(link);
    setCopiedSlug(partnerSlug);
    toast.success("Link copied.");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
            Partners ({partners?.length ?? 0})
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            One generic system for any university, agency, or company — each gets its own tracked link, fully isolated from every other partner.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> {showForm ? "Cancel" : "Add partner"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Partner name (e.g. Vistula University)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Link slug (auto from name if left blank)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
            />
          </div>
          <select
            value={partnerType}
            onChange={(e) => setPartnerType(e.target.value as typeof partnerType)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
          >
            <option value="university">University</option>
            <option value="agency">Agency</option>
            <option value="other">Other / Company</option>
          </select>
          <Button size="sm" className="w-full cursor-pointer" disabled={!name.trim() || submitting} onClick={() => { void handleCreate(); }}>
            {submitting ? "Creating..." : "Create partner link"}
          </Button>
        </div>
      )}

      {partners === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : partners.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          No partners yet. Add your first one to generate a trackable link.
        </div>
      ) : (
        <div className="space-y-2">
          {partners.map((p) => (
            <div key={p._id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{p.partnerType}</p>
                  </div>
                </div>
                <button
                  onClick={() => { void toggleActive({ partnerId: p._id, active: !p.active }); }}
                  className={cn(
                    "shrink-0 text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer transition-colors",
                    p.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-secondary text-secondary-foreground border border-border"
                  )}
                >
                  {p.active ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-border mb-3 text-xs font-mono text-muted-foreground overflow-hidden">
                <span className="truncate flex-1">
                  {typeof window !== "undefined" ? `${window.location.origin}/?ref=${p.slug}` : ""}
                </span>
                <button
                  onClick={() => handleCopyLink(p.slug)}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> {copiedSlug === p.slug ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Eye className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">Visits</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.visits}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <UserPlus className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">Signups</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.signups}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <ListChecks className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">Checklists</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.checklistCompletions}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WaitTimesAdminPanel() {
  const overview = useQuery(api.waitTimeTracker.getAdminOverview, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        Wait Time Reports ({overview?.totalReports ?? 0})
      </h3>
      <p className="text-xs text-muted-foreground">
        No moderation needed here — reports are structured dates, not free text. Routes need at least 5 reports
        before a community median is shown publicly.
      </p>
      {overview === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : overview.routes.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          No reports submitted yet.
        </div>
      ) : (
        <div className="space-y-2">
          {overview.routes.map((r) => (
            <div key={r.route} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2.5">
              <span className="text-sm text-foreground">{r.route}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{r.count} report{r.count === 1 ? "" : "s"}</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  r.hasEnoughData ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                )}>
                  {r.hasEnoughData ? "Public" : "Gathering data"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TelegramBotPanel() {
  const isConfigured = useQuery(api.telegramBot.isTelegramConfigured, {});
  const stats = useQuery(api.telegramBot.getBotStats, {});
  const registerWebhook = useAction(api.telegramBot.registerWebhook);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await registerWebhook({});
      if (result.ok) {
        toast.success("Telegram webhook connected.");
      } else {
        toast.error(result.description ?? "Could not connect the webhook.");
      }
    } catch {
      toast.error("Could not connect the webhook. Make sure TELEGRAM_BOT_TOKEN is set.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-primary">Telegram Bot</h3>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isConfigured ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            {isConfigured === undefined ? "Checking…" : isConfigured ? "Token set" : "Not configured"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Answers real visa document questions in Telegram using the same checklist data as the website — no AI, deterministic, always-correct matches.
        </p>
        <Button
          size="sm"
          className="cursor-pointer"
          disabled={!isConfigured || connecting}
          onClick={() => { void handleConnect(); }}
        >
          <Send className="w-3.5 h-3.5" />
          {connecting ? "Connecting…" : "Connect Webhook"}
        </Button>
        {!isConfigured && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Set TELEGRAM_BOT_TOKEN via <code>npx convex env set</code> first.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">Recent Activity</h3>
        {stats === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : stats.recent.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No questions asked yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Send className="w-4 h-4" />} label="Logged (last 50)" value={stats.totalLogged} />
              <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Match Rate" value={`${stats.matchRate}%`} sub={`${stats.matchedCount} matched`} />
            </div>
            <div className="space-y-2">
              {stats.recent.map((entry) => (
                <div key={entry._id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                  {entry.matched ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{entry.questionText}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.matchedDestination ? `Matched: ${entry.matchedDestination} (${entry.matchedVisaType})` : "No match"}
                      {" · "}{new Date(entry.createdAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WhatsAppBotPanel() {
  const isConfigured = useQuery(api.whatsappBot.isWhatsAppConfigured, {});
  const stats = useQuery(api.whatsappBot.getBotStats, {});

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-primary">WhatsApp Bot</h3>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isConfigured ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            {isConfigured === undefined ? "Checking…" : isConfigured ? "Credentials set" : "Not configured"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Answers real visa document questions over WhatsApp using the same checklist data as the website — no AI, deterministic, always-correct matches. Built on Twilio's WhatsApp API.
        </p>
        {!isConfigured ? (
          <div className="text-[11px] text-muted-foreground space-y-1.5">
            <p>Set <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, and <code>TWILIO_WHATSAPP_NUMBER</code> via <code>npx convex env set</code> first.</p>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground space-y-1.5">
            <p>
              Unlike Telegram, Twilio has no API to register a webhook automatically — paste this deployment's webhook URL into the
              Twilio Console yourself, under WhatsApp Sandbox / Senders settings:
            </p>
            <code className="block bg-muted rounded-md px-2 py-1.5 text-[11px] break-all">
              {`${import.meta.env.VITE_CONVEX_URL?.replace(".cloud", ".site") ?? "https://your-deployment.convex.site"}/whatsapp/webhook`}
            </code>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">Recent Activity</h3>
        {stats === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : stats.recent.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No questions asked yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<MessageCircle className="w-4 h-4" />} label="Logged (last 50)" value={stats.totalLogged} />
              <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Match Rate" value={`${stats.matchRate}%`} sub={`${stats.matchedCount} matched`} />
            </div>
            <div className="space-y-2">
              {stats.recent.map((entry) => (
                <div key={entry._id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                  {entry.matched ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{entry.questionText}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.matchedDestination ? `Matched: ${entry.matchedDestination} (${entry.matchedVisaType})` : "No match"}
                      {" · "}{new Date(entry.createdAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DataFreshnessPanel() {
  const report = useQuery(api.dataFreshness.getFreshnessReport, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        Visa Checklist Data Freshness
      </h3>
      <p className="text-xs text-muted-foreground">
        Every destination's last real-verification date. Anything 90+ days old is flagged —
        admins also get a weekly email digest when something falls behind.
      </p>
      {report === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="space-y-2">
          {report.map((row) => (
            <div
              key={row.destination}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {row.isStale ? (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{row.destination}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.visaTypeCount} visa type{row.visaTypeCount === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={cn(
                    "text-xs font-semibold",
                    row.isStale ? "text-amber-700" : "text-muted-foreground",
                  )}
                >
                  {row.daysSinceVerified} days ago
                </div>
                <div className="text-[10px] text-muted-foreground">{row.lastVerified}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type LicensePlan = "agent_listing" | "agent_featured" | "agency_white_label";

function suggestLicensePlan(requestedPlan: string): LicensePlan {
  if (requestedPlan === "starter") return "agent_listing";
  if (requestedPlan === "agency") return "agency_white_label";
  return "agency_white_label";
}

function IssueCodeControl({ applicationId, email, requestedPlan }: { applicationId: Id<"whitelabel_applications">; email: string; requestedPlan: string }) {
  const issueCode = useMutation(api.licenseCodes.issueLicenseCode);
  // Shares the same underlying subscription as IssuedCodesList's identical
  // query — Convex dedupes same function+args across the component tree,
  // so this isn't a second network round-trip.
  const allCodes = useQuery(api.licenseCodes.listLicenseCodes, {});
  const [plan, setPlan] = useState<LicensePlan>(suggestLicensePlan(requestedPlan));
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const handleIssue = async () => {
    setIssuing(true);
    try {
      const result = await issueCode({ email, plan, whitelabelApplicationId: applicationId });
      setIssuedCode(result.code);
      toast.success("License code issued.");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to issue code.");
    } finally {
      setIssuing(false);
    }
  };

  // Reflects reality even after a page refresh resets local state — without
  // this, an admin would see the "Issue" button again, click it, and just
  // get a confusing "already has an active code" error instead of seeing
  // the code that's already out there.
  const existingCode = allCodes?.find((c) => c.email === email && (!c.redeemedAt ? new Date(c.expiresAt) > new Date() : true));

  const displayCode = issuedCode ?? existingCode?.code;
  if (displayCode) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <code className="text-xs font-mono font-semibold bg-accent/10 text-accent px-2.5 py-1 rounded-lg">{displayCode}</code>
        {existingCode?.redeemedAt && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700">Redeemed</span>
        )}
        <button
          onClick={() => { navigator.clipboard.writeText(displayCode); toast.success("Copied."); }}
          className="text-xs font-semibold text-accent hover:underline cursor-pointer"
        >
          Copy
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <select
        value={plan}
        onChange={(e) => setPlan(e.target.value as LicensePlan)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
      >
        <option value="agent_listing">Agent Listing</option>
        <option value="agent_featured">Agent Featured</option>
        <option value="agency_white_label">Agency White-Label</option>
      </select>
      <button
        disabled={issuing}
        onClick={() => { void handleIssue(); }}
        className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60"
      >
        {issuing ? "Issuing…" : "Issue License Code"}
      </button>
    </div>
  );
}

function IssuedCodesList() {
  const codes = useQuery(api.licenseCodes.listLicenseCodes, {});
  if (codes === undefined) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (codes.length === 0) {
    return <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">No license codes issued yet.</div>;
  }
  const now = Date.now();
  return (
    <div className="bg-card border border-border rounded-xl divide-y divide-border">
      {codes.map((c) => {
        const status = c.redeemedAt ? "Redeemed" : new Date(c.expiresAt).getTime() < now ? "Expired" : "Pending";
        return (
          <div key={c._id} className="flex items-center justify-between px-4 py-2.5 text-xs gap-3">
            <div className="min-w-0">
              <span className="font-mono font-semibold text-foreground">{c.code}</span>
              <span className="text-muted-foreground ml-2">{c.email} · {c.plan}</span>
            </div>
            <span className={cn(
              "shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
              status === "Redeemed" ? "bg-green-50 text-green-700 border-green-200" : status === "Expired" ? "bg-muted text-muted-foreground border-border" : "bg-amber-50 text-amber-700 border-amber-200",
            )}>
              {status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LeadsAdminPanel() {
  const applications = useQuery(api.whitelabel.list, {});
  const subscribers = useQuery(api.newsletter.list, {});
  const markRead = useMutation(api.whitelabel.markRead);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
          White-Label Applications ({applications?.filter((a) => !a.read).length ?? 0} unread)
        </h3>
        {applications === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : applications.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No applications yet.
          </div>
        ) : (
          <div className="space-y-2">
            {applications.map((app) => (
              <div key={app._id} className={cn("bg-card border rounded-xl p-4", app.read ? "border-border" : "border-accent/40")}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-primary">{app.agencyName}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(app.createdAt).toLocaleString("en-GB")}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {app.email}{app.phone ? ` · ${app.phone}` : ""}{app.country ? ` · ${app.country}` : ""} · Plan: <span className="font-semibold text-foreground">{app.plan}</span>
                </div>
                {app.message && <p className="text-xs text-muted-foreground mb-2">{app.message}</p>}
                {!app.read && (
                  <button
                    onClick={() => { void markRead({ id: app._id }); }}
                    className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                  >
                    Mark as read
                  </button>
                )}
                <IssueCodeControl applicationId={app._id} email={app.email} requestedPlan={app.plan} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">License Codes</h3>
        <IssuedCodesList />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
          Newsletter Subscribers ({subscribers?.length ?? 0})
        </h3>
        {subscribers === undefined ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : subscribers.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No subscribers yet.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {subscribers.map((s) => (
              <div key={s._id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-foreground">{s.email}</span>
                <span className="text-muted-foreground">{new Date(s.subscribedAt).toLocaleDateString("en-GB")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmployersAdminPanel() {
  const orgs = useQuery(api.adminOrgs.listOrganizations, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        Organisations ({orgs?.length ?? 0} most recent)
      </h3>
      <p className="text-xs text-muted-foreground">
        Read-only oversight of both employer accounts and households — per-member detail stays inside each organisation's own dashboard.
      </p>
      {orgs === undefined ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : orgs.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          No organisations yet.
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map((org) => (
            <div key={org._id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-primary">{org.name}</span>
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {org.type === "household" ? "Household" : "Employer"}
                </span>
                <div className="text-[10px] text-muted-foreground">{new Date(org.createdAt).toLocaleDateString("en-GB")} · {org.memberCount} {org.memberCount === 1 ? "admin" : "admins"}</div>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{org.pendingCount} pending</span>
                <span>{org.acceptedCount} accepted</span>
                <span>{org.declinedCount} declined</span>
                <span>{org.revokedCount} revoked</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLogPanel() {
  const entries = useQuery(api.admin.getAuditLog, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        Admin Action Audit Log
      </h3>
      <p className="text-xs text-muted-foreground">
        Every plan change, role change, deletion, and agent verification, with who did it and when.
      </p>
      {entries === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : entries.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          No admin actions recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry._id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <Settings className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {entry.action} {entry.details ? `— ${entry.details}` : ""}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  by {entry.adminEmail ?? "unknown admin"} · {new Date(entry.createdAt).toLocaleString("en-GB")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const goBack = useSmartBack("/");
  const currentUser = useQuery(api.users.getCurrentUser, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
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
