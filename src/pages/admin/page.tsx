import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth } from "@/hooks/use-auth.ts";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { NotificationBell } from "@/components/NotificationBell.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { CountrySelect } from "@/components/CountrySelect.tsx";
import {
  Globe, ArrowLeft, Shield, Users, FileText, BarChart3,
  CheckCircle2, XCircle, Trash2, ChevronDown, ChevronUp,
  AlertCircle, UserCheck, Settings, Send, Clock, Star,
  Building2, Copy, Plus, Eye, UserPlus, ListChecks, MessageCircle,
  RefreshCw, Award, LogOut, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";

type Tab = "overview" | "users" | "agents" | "setup" | "country-watch" | "data-freshness" | "telegram-bot" | "whatsapp-bot" | "wall-of-fame" | "community" | "wait-times" | "partners" | "leads" | "messages" | "employers" | "audit-log" | "blog";

const NAV_ITEMS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "overview",       icon: BarChart3,     label: "Overview" },
  { id: "users",          icon: Users,         label: "Users" },
  { id: "agents",         icon: UserCheck,     label: "Agents" },
  { id: "setup",          icon: Settings,      label: "Setup" },
  { id: "country-watch",  icon: Globe,         label: "Country Watch" },
  { id: "data-freshness", icon: RefreshCw,     label: "Data Freshness" },
  { id: "telegram-bot",   icon: MessageCircle, label: "Telegram Bot" },
  { id: "whatsapp-bot",   icon: MessageCircle, label: "WhatsApp Bot" },
  { id: "wall-of-fame",   icon: Award,         label: "Wall of Fame" },
  { id: "community",      icon: Users,         label: "Community" },
  { id: "wait-times",     icon: Clock,         label: "Wait Times" },
  { id: "partners",       icon: Building2,     label: "Partners" },
  { id: "leads",          icon: UserPlus,      label: "Leads" },
  { id: "messages",       icon: MessageCircle, label: "Messages" },
  { id: "employers",      icon: Building2,     label: "Employers" },
  { id: "audit-log",      icon: ListChecks,    label: "Audit Log" },
  { id: "blog",           icon: FileText,      label: "Blog" },
];

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-[#0f2040]/8 flex items-center justify-center text-[#0f2040]">
          {icon}
        </div>
      </div>
      <div className="font-serif text-4xl font-semibold text-[#0f2040]">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-2">{sub}</div>}
    </div>
  );
}

function AdminInner() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const stats = useQuery(api.admin.getStats, {});
  const users = useQuery(api.admin.getUsers, { limit: 100 });
  const agents = useQuery(api.admin.getAgents, {});
  const updatePlan = useMutation(api.admin.updateUserPlan);
  const updateRole = useMutation(api.admin.updateUserRole);
  const deleteUser = useMutation(api.admin.deleteUser);
  const verifyAgent = useMutation(api.admin.verifyAgent);
  const systemHealth = useQuery(api.admin.getSystemHealth, {});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const handlePlanChange = async (userId: Doc<"users">["_id"], plan: "free" | "pro" | "expert") => {
    try {
      await updatePlan({ userId, plan });
      toast.success(t("toast.plan_updated"));
    } catch {
      toast.error(t("toast.plan_update_failed"));
    }
  };

  const handleRoleChange = async (userId: Doc<"users">["_id"], role: "admin" | "user") => {
    try {
      await updateRole({ userId, role });
      toast.success(t("toast.role_updated"));
    } catch {
      toast.error(t("toast.role_update_failed"));
    }
  };

  const handleDeleteUser = async (userId: Doc<"users">["_id"]) => {
    if (!window.confirm(t("confirm.delete_user"))) return;
    try {
      await deleteUser({ userId });
      toast.success(t("toast.user_deleted"));
    } catch {
      toast.error(t("toast.user_delete_failed"));
    }
  };

  const handleVerifyAgent = async (agentId: Doc<"agent_profiles">["_id"], verified: boolean) => {
    try {
      await verifyAgent({ agentId, verified });
      toast.success(verified ? t("toast.agent_verified") : t("toast.agent_unverified"));
    } catch {
      toast.error(t("toast.agent_update_failed"));
    }
  };

  const isLoading = stats === undefined;
  const currentNav = NAV_ITEMS.find((n) => n.id === tab) ?? NAV_ITEMS[0];

  const Sidebar = (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-white/10">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <div className="font-serif text-base font-semibold text-white leading-tight">VisaClear</div>
            <div className="text-[9px] text-white/65 tracking-widest uppercase">Admin Panel</div>
          </div>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer text-left",
                active
                  ? "bg-white/10 text-white border-r-2 border-[#b8a06a]"
                  : "text-white/50 hover:text-white hover:bg-white/5 border-r-2 border-transparent"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-[#b8a06a]" : "")} />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="px-4 py-4 border-t border-white/10 flex flex-col gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs text-white/60 hover:text-white/90 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to site
        </button>
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          className="flex items-center gap-2 text-xs text-white/60 hover:text-red-400 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-[#0f2040] flex-col shrink-0 sticky top-0 h-screen">
        {Sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-[#0f2040] flex flex-col h-full shadow-2xl">
            {Sidebar}
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-40">
          <button
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-xl font-semibold text-[#0f2040]">{currentNav.label}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#0f2040]/60 bg-[#0f2040]/5 px-3 py-1.5 rounded-full">
              <Shield className="w-3 h-3" /> Admin
            </span>
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors cursor-pointer px-2 py-1.5"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 md:p-8">

          {/* Overview */}
          {tab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  <StatCard icon={<Users className="w-4 h-4" />} label={t("overview.total_users")} value={stats.totalUsers} />
                  <StatCard icon={<Shield className="w-4 h-4" />} label={t("overview.pro_expert")} value={stats.proUsers} sub={t("overview.free_count", { count: stats.freeUsers })} />
                  <StatCard icon={<FileText className="w-4 h-4" />} label={t("overview.checklists_saved")} value={stats.totalChecklists} />
                  <StatCard icon={<BarChart3 className="w-4 h-4" />} label={t("overview.rejections_analysed")} value={stats.totalRejectionAnalyses} />
                  <StatCard icon={<UserCheck className="w-4 h-4" />} label={t("overview.agent_profiles")} value={stats.totalAgents} />
                  <StatCard
                    icon={<Settings className="w-4 h-4" />}
                    label={t("overview.free_users")}
                    value={`${stats.totalUsers > 0 ? Math.round((stats.freeUsers / stats.totalUsers) * 100) : 0}%`}
                    sub={t("overview.on_free_plan")}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Users */}
          {tab === "users" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {users === undefined ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">{t("users.empty")}</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">User</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Plan</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Role</th>
                        <th className="px-5 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.map((user) => (
                        <>
                          <tr
                            key={user._id}
                            className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                            onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#0f2040] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                  {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-[#0f2040] truncate">{user.name ?? t("users.no_name")}</div>
                                  <div className="text-xs text-gray-400 truncate">{user.email ?? t("users.no_email")}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              <span className={cn(
                                "text-xs font-semibold px-2.5 py-1 rounded-full",
                                user.plan === "expert" ? "bg-[#b8a06a]/15 text-[#7a6435]" :
                                user.plan === "pro" ? "bg-blue-50 text-blue-700" :
                                "bg-gray-100 text-gray-500"
                              )}>
                                {user.plan ?? "free"}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden lg:table-cell">
                              <span className={cn(
                                "text-xs font-semibold px-2.5 py-1 rounded-full",
                                user.role === "admin" ? "bg-[#0f2040]/10 text-[#0f2040]" : "bg-gray-100 text-gray-500"
                              )}>
                                {user.role ?? "user"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {expandedUser === user._id
                                ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" />
                                : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />}
                            </td>
                          </tr>
                          {expandedUser === user._id && (
                            <tr key={`${user._id}-expanded`}>
                              <td colSpan={4} className="px-5 py-4 bg-gray-50/80">
                                <div className="flex flex-wrap items-center gap-4">
                                  <div>
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">{t("users.plan_label")}</label>
                                    <select
                                      value={user.plan ?? "free"}
                                      onChange={(e) => { void handlePlanChange(user._id, e.target.value as "free" | "pro" | "expert"); }}
                                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2040]/20 cursor-pointer"
                                    >
                                      <option value="free">{t("users.plan_free")}</option>
                                      <option value="pro">{t("users.plan_pro")}</option>
                                      <option value="expert">{t("users.plan_expert")}</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">{t("users.role_label")}</label>
                                    <select
                                      value={user.role ?? "user"}
                                      onChange={(e) => { void handleRoleChange(user._id, e.target.value as "admin" | "user"); }}
                                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2040]/20 cursor-pointer"
                                    >
                                      <option value="user">{t("users.role_user")}</option>
                                      <option value="admin">{t("users.role_admin")}</option>
                                    </select>
                                  </div>
                                  <button
                                    onClick={() => { void handleDeleteUser(user._id); }}
                                    className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> {t("users.delete")}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/40">
                    <p className="text-xs text-gray-400">{users.length} user{users.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Agents */}
          {tab === "agents" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Agent profiles */}
              <div>
                {agents === undefined ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground text-sm">{t("agents.empty")}</div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                          <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Agent</th>
                          <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Specialisations</th>
                          <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                          <th className="px-5 py-3.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {agents.map((agent) => (
                          <tr key={agent._id} className="hover:bg-gray-50/40 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-medium text-[#0f2040]">{agent.fullName}</div>
                              <div className="text-xs text-gray-400">{agent.email} · {agent.country}</div>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              <div className="text-xs text-gray-500">{agent.specialisations.slice(0, 3).join(", ")}</div>
                            </td>
                            <td className="px-5 py-4">
                              {agent.verified ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> {t("agents.verified")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                                  <AlertCircle className="w-3 h-3" /> {t("agents.pending")}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              {!agent.verified ? (
                                <button
                                  onClick={() => { void handleVerifyAgent(agent._id, true); }}
                                  className="text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                                >
                                  {t("agents.verify")}
                                </button>
                              ) : (
                                <button
                                  onClick={() => { void handleVerifyAgent(agent._id, false); }}
                                  className="text-xs font-semibold text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                                >
                                  {t("agents.unverify")}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payout requests */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <PayoutRequestsAdminPanel />
              </div>
            </motion.div>
          )}

          {/* Setup / health check */}
          {tab === "setup" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <SetupPanel health={systemHealth} />
            </motion.div>
          )}

          {/* All other panels — unchanged content, just wrapped */}
          {tab === "country-watch" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><CountryWatchAdminPanel /></div>}
          {tab === "data-freshness" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><DataFreshnessPanel /></div>}
          {tab === "telegram-bot" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><TelegramBotPanel /></div>}
          {tab === "whatsapp-bot" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><WhatsAppBotPanel /></div>}
          {tab === "wall-of-fame" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><WallOfFameAdminPanel /></div>}
          {tab === "community" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><CommunityAdminPanel /></div>}
          {tab === "wait-times" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><WaitTimesAdminPanel /></div>}
          {tab === "partners" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><PartnersAdminPanel /></div>}
          {tab === "leads" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><LeadsAdminPanel /></div>}
          {tab === "messages" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><ContactMessagesPanel /></div>}
          {tab === "employers" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><EmployersAdminPanel /></div>}
          {tab === "audit-log" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><AuditLogPanel /></div>}
          {tab === "blog" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><BlogAdminPanel /></div>}

        </main>
      </div>
    </div>
  );
}

// ─── Setup / health-check panel ───────────────────────────────────────────────

type HealthData = {
  SITE_URL: string | null;
  RESEND_FROM_EMAIL: string | null;
  RESEND_API_KEY: boolean;
  OPENAI_API_KEY: boolean;
  STRIPE_SECRET_KEY: boolean;
  STRIPE_WEBHOOK_SECRET: boolean;
  PAYSTACK_SECRET_KEY: boolean;
  AUTH_GOOGLE_ID: boolean;
  AUTH_GOOGLE_SECRET: boolean;
  TELEGRAM_BOT_TOKEN: boolean;
  TWILIO_ACCOUNT_SID: boolean;
  TWILIO_AUTH_TOKEN: boolean;
  TWILIO_WHATSAPP_NUMBER: boolean;
} | null | undefined;

type EnvRow = {
  name: string;
  label: string;
  isSet: boolean;
  currentValue?: string | null;
  critical: boolean;
  description: string;
  howToGet: string;
  example?: string;
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
      ok ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", ok ? "bg-green-500" : "bg-red-500")} />
      {ok ? "Set" : "Missing"}
    </span>
  );
}

function SetupPanel({ health }: { health: HealthData }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (health === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  const siteUrlOk = Boolean(health?.SITE_URL && !health.SITE_URL.includes("localhost"));

  const rows: EnvRow[] = [
    {
      name: "SITE_URL",
      label: "Site URL",
      isSet: siteUrlOk,
      currentValue: health?.SITE_URL,
      critical: true,
      description: "The public URL of your app. Every email link (password reset, email change, document alerts) uses this. Currently set to localhost — which means every emailed link is broken in production.",
      howToGet: "This is your Vercel deployment URL.",
      example: "https://visaclear.app",
    },
    {
      name: "RESEND_API_KEY",
      label: "Resend API Key",
      isSet: Boolean(health?.RESEND_API_KEY),
      critical: true,
      description: "Required to send any transactional emails — welcome, password reset, email change confirmation, document upload alerts, invitation emails. Without this, all emails are silently dropped.",
      howToGet: "Log into resend.com → API Keys → Create API key. Free tier allows 3,000 emails/month.",
    },
    {
      name: "RESEND_FROM_EMAIL",
      label: "Resend From Email",
      isSet: Boolean(health?.RESEND_FROM_EMAIL),
      currentValue: health?.RESEND_FROM_EMAIL,
      critical: true,
      description: "The 'From' address for all outgoing emails. Must be a verified domain or address in your Resend account.",
      howToGet: "In Resend, go to Domains → verify your domain, or use a verified single sender address.",
      example: "VisaClear <hello@visaclear.app>",
    },
    {
      name: "OPENAI_API_KEY",
      label: "OpenAI API Key",
      isSet: Boolean(health?.OPENAI_API_KEY),
      critical: true,
      description: "Powers the AI features: rejection analyser, success probability, passport photo checker, and the AI assistant. Without this, these features throw an error on every request.",
      howToGet: "Log into platform.openai.com → API Keys → Create new secret key.",
    },
    {
      name: "STRIPE_SECRET_KEY",
      label: "Stripe Secret Key",
      isSet: Boolean(health?.STRIPE_SECRET_KEY),
      critical: true,
      description: "Required to process Stripe payments. Subscription upgrades and one-time payments will fail without this.",
      howToGet: "Log into dashboard.stripe.com → Developers → API Keys → Secret key. Use the live key for production.",
    },
    {
      name: "STRIPE_WEBHOOK_SECRET",
      label: "Stripe Webhook Secret",
      isSet: Boolean(health?.STRIPE_WEBHOOK_SECRET),
      critical: true,
      description: "Verifies that webhook events from Stripe are genuine. Without this, payment confirmations are ignored and user plans are never upgraded after payment.",
      howToGet: "In Stripe: Developers → Webhooks → Add endpoint (your Convex HTTP endpoint) → Signing secret.",
    },
    {
      name: "PAYSTACK_SECRET_KEY",
      label: "Paystack Secret Key",
      isSet: Boolean(health?.PAYSTACK_SECRET_KEY),
      critical: false,
      description: "Enables Paystack as a payment option (for Nigerian/African users). Optional if you are only using Stripe.",
      howToGet: "Log into dashboard.paystack.com → Settings → API Keys → Secret Key.",
    },
    {
      name: "AUTH_GOOGLE_ID",
      label: "Google OAuth Client ID",
      isSet: Boolean(health?.AUTH_GOOGLE_ID),
      critical: false,
      description: "Required together with AUTH_GOOGLE_SECRET to enable 'Sign in with Google'. Both must be set — setting only one leaves Google login broken.",
      howToGet: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Client ID field.",
      example: "1234567890-abc123.apps.googleusercontent.com",
    },
    {
      name: "AUTH_GOOGLE_SECRET",
      label: "Google OAuth Client Secret",
      isSet: Boolean(health?.AUTH_GOOGLE_SECRET),
      critical: false,
      description: "Required together with AUTH_GOOGLE_ID to enable 'Sign in with Google'. Both must be set — the ID alone does nothing.",
      howToGet: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Client Secret field (same screen as the ID).",
    },
    {
      name: "TELEGRAM_BOT_TOKEN",
      label: "Telegram Bot Token",
      isSet: Boolean(health?.TELEGRAM_BOT_TOKEN),
      critical: false,
      description: "Powers the Telegram bot integration for notifications and user interactions.",
      howToGet: "Message @BotFather on Telegram → /newbot → copy the token it gives you.",
    },
    {
      name: "TWILIO_ACCOUNT_SID",
      label: "Twilio Account SID",
      isSet: Boolean(health?.TWILIO_ACCOUNT_SID),
      critical: false,
      description: "Required for WhatsApp messaging via Twilio. Leave unset if you are not using WhatsApp.",
      howToGet: "Log into console.twilio.com → Account Info → Account SID.",
    },
    {
      name: "TWILIO_AUTH_TOKEN",
      label: "Twilio Auth Token",
      isSet: Boolean(health?.TWILIO_AUTH_TOKEN),
      critical: false,
      description: "Twilio API authentication. Required alongside TWILIO_ACCOUNT_SID.",
      howToGet: "Same place as Account SID — it is displayed below it on the Twilio console homepage.",
    },
    {
      name: "TWILIO_WHATSAPP_NUMBER",
      label: "Twilio WhatsApp Number",
      isSet: Boolean(health?.TWILIO_WHATSAPP_NUMBER),
      critical: false,
      description: "Your Twilio WhatsApp sender number in E.164 format.",
      howToGet: "Twilio Console → Messaging → Senders → WhatsApp Senders.",
      example: "+14155238886",
    },
  ];

  const critical = rows.filter((r) => r.critical);
  const optional = rows.filter((r) => !r.critical);
  const criticalMissing = critical.filter((r) => !r.isSet).length;
  const totalMissing = rows.filter((r) => !r.isSet).length;

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className={cn(
        "rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        criticalMissing > 0
          ? "bg-red-50 border-red-200"
          : totalMissing > 0
          ? "bg-amber-50 border-amber-200"
          : "bg-green-50 border-green-200"
      )}>
        <div>
          <p className={cn(
            "font-semibold text-base",
            criticalMissing > 0 ? "text-red-800" : totalMissing > 0 ? "text-amber-800" : "text-green-800"
          )}>
            {criticalMissing > 0
              ? `${criticalMissing} critical variable${criticalMissing !== 1 ? "s" : ""} missing — core features are broken`
              : totalMissing > 0
              ? `${totalMissing} optional variable${totalMissing !== 1 ? "s" : ""} unset`
              : "All environment variables are configured"}
          </p>
          <p className={cn(
            "text-sm mt-0.5",
            criticalMissing > 0 ? "text-red-700" : totalMissing > 0 ? "text-amber-700" : "text-green-700"
          )}>
            Set variables in the Convex dashboard → Settings → Environment Variables, or via CLI:
            <code className="ml-1 bg-white/60 px-1.5 py-0.5 rounded text-xs font-mono">npx convex env set VAR_NAME value</code>
          </p>
        </div>
        <div className="shrink-0 text-center">
          <p className={cn("text-3xl font-bold tabular-nums", criticalMissing > 0 ? "text-red-700" : "text-green-700")}>
            {rows.filter((r) => r.isSet).length}/{rows.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">configured</p>
        </div>
      </div>

      {/* Critical vars */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">Critical — app is broken without these</h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {critical.map((row) => (
            <div key={row.name}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === row.name ? null : row.name)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="text-sm font-mono font-semibold text-[#0f2040]">{row.name}</code>
                    <span className="text-xs text-gray-400">{row.label}</span>
                    {row.currentValue && !row.isSet && (
                      <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                        currently: {row.currentValue}
                      </span>
                    )}
                    {row.currentValue && row.isSet && (
                      <span className="text-[10px] font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                        {row.currentValue}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusDot ok={row.isSet} />
                  {expanded === row.name ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </div>
              </button>
              {expanded === row.name && (
                <div className="px-5 pb-5 bg-gray-50/60 border-t border-gray-50">
                  <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-2">{row.description}</p>
                  <div className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl p-3 space-y-1.5">
                    <p><span className="font-semibold text-[#0f2040]">How to get it:</span> {row.howToGet}</p>
                    {row.example && (
                      <p><span className="font-semibold text-[#0f2040]">Example format:</span> <code className="font-mono text-xs">{row.example}</code></p>
                    )}
                    <p className="text-gray-400 font-mono text-[11px] mt-2 pt-2 border-t border-gray-100">
                      npx convex env set {row.name} &lt;value&gt;
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Optional vars */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">Optional — integrations</h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {optional.map((row) => (
            <div key={row.name}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === row.name ? null : row.name)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="text-sm font-mono font-semibold text-[#0f2040]">{row.name}</code>
                    <span className="text-xs text-gray-400">{row.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusDot ok={row.isSet} />
                  {expanded === row.name ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </div>
              </button>
              {expanded === row.name && (
                <div className="px-5 pb-5 bg-gray-50/60 border-t border-gray-50">
                  <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-2">{row.description}</p>
                  <div className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl p-3 space-y-1.5">
                    <p><span className="font-semibold text-[#0f2040]">How to get it:</span> {row.howToGet}</p>
                    {row.example && (
                      <p><span className="font-semibold text-[#0f2040]">Example format:</span> <code className="font-mono text-xs">{row.example}</code></p>
                    )}
                    <p className="text-gray-400 font-mono text-[11px] mt-2 pt-2 border-t border-gray-100">
                      npx convex env set {row.name} &lt;value&gt;
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WallOfFameAdminPanel() {
  const { t } = useTranslation("admin");
  const pending = useQuery(api.wallOfFame.listPendingStories, {});
  const moderate = useMutation(api.wallOfFame.moderateStory);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleModerate = async (storyId: string, decision: "approved" | "rejected") => {
    setProcessingId(storyId);
    try {
      await moderate({ storyId: storyId as Id<"wall_of_fame_stories">, decision });
      toast.success(decision === "approved" ? t("wof.toast_approved") : t("wof.toast_rejected"));
    } catch {
      toast.error(t("wof.toast_error"));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("wof.pending_stories", { count: pending?.length ?? 0 })}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("wof.description")}
      </p>
      {pending === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : pending.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("wof.empty")}
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
              <p className="text-xs text-muted-foreground mb-1"><span className="font-semibold">{t("wof.went_wrong")}</span> {story.whatWentWrong}</p>
              <p className="text-xs text-muted-foreground mb-3"><span className="font-semibold">{t("wof.fixed_it")}</span> {story.whatFixedIt}</p>
              <div className="flex gap-2">
                <button
                  disabled={processingId === story._id}
                  onClick={() => { void handleModerate(story._id, "approved"); }}
                  className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t("wof.approve")}
                </button>
                <button
                  disabled={processingId === story._id}
                  onClick={() => { void handleModerate(story._id, "rejected"); }}
                  className="flex items-center gap-1 text-xs font-semibold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> {t("wof.reject")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityAdminPanel() {
  const posts = useQuery(api.community.listPostsForModeration, {});
  const moderate = useMutation(api.community.moderatePost);
  const toggleFeatured = useMutation(api.community.toggleFeatured);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleModerate = async (postId: string, decision: "approved" | "rejected", featured?: boolean) => {
    setProcessingId(postId);
    try {
      await moderate({
        postId: postId as Id<"community_posts">,
        decision,
        featured: featured ?? false,
      });
      toast.success(decision === "approved" ? "Post approved." : "Post rejected.");
    } catch {
      toast.error("Failed to moderate post.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleFeatured = async (postId: string) => {
    setProcessingId(postId);
    try {
      await toggleFeatured({ postId: postId as Id<"community_posts"> });
      toast.success("Featured status updated.");
    } catch {
      toast.error("Failed to update featured status.");
    } finally {
      setProcessingId(null);
    }
  };

  const pending = posts?.filter((p) => p.status === "pending") ?? [];
  const hidden = posts?.filter((p) => p.status === "hidden") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-1">
          Community Posts — Pending Review ({pending.length})
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Approve to make a post live. Mark as Featured to surface it on the Blog Community tab.
        </p>
        {posts === undefined ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : pending.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No posts pending review.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((post) => (
              <div key={post._id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wide">{post.category} · {post.country}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleString("en-GB")}</span>
                </div>
                <p className="text-sm font-semibold text-primary mb-1">{post.title}</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{post.body}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "approved", false); }}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "approved", true); }}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Approve + Feature
                  </button>
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "rejected"); }}
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

      {hidden.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-1">
            Auto-Hidden by Flags ({hidden.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            These posts were hidden automatically after receiving 3 or more flags from users.
          </p>
          <div className="space-y-3">
            {hidden.map((post) => (
              <div key={post._id} className="bg-card border border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                    {post.category} · {post.country} · {post.flagCount} flags
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleString("en-GB")}</span>
                </div>
                <p className="text-sm font-semibold text-primary mb-1">{post.title}</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{post.body}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "approved"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "rejected"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PartnersAdminPanel() {
  const { t } = useTranslation("admin");
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
      toast.success(t("partners.toast_created", { slug: result.slug }));
      setName("");
      setSlug("");
      setShowForm(false);
    } catch (err) {
      const message = err instanceof ConvexError ? (err.data as { message: string }).message : t("partners.toast_create_error");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (partnerSlug: string) => {
    const link = `${window.location.origin}/?ref=${partnerSlug}`;
    void navigator.clipboard.writeText(link);
    setCopiedSlug(partnerSlug);
    toast.success(t("partners.toast_link_copied"));
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
            {t("partners.heading", { count: partners?.length ?? 0 })}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("partners.description")}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> {showForm ? t("partners.cancel") : t("partners.add")}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("partners.name_placeholder")}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("partners.slug_placeholder")}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
            />
          </div>
          <select
            value={partnerType}
            onChange={(e) => setPartnerType(e.target.value as typeof partnerType)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
          >
            <option value="university">{t("partners.type_university")}</option>
            <option value="agency">{t("partners.type_agency")}</option>
            <option value="other">{t("partners.type_other")}</option>
          </select>
          <Button size="sm" className="w-full cursor-pointer" disabled={!name.trim() || submitting} onClick={() => { void handleCreate(); }}>
            {submitting ? t("partners.creating") : t("partners.create")}
          </Button>
        </div>
      )}

      {partners === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : partners.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("partners.empty")}
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
                  {p.active ? t("partners.active") : t("partners.inactive")}
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
                  <Copy className="w-3 h-3" /> {copiedSlug === p.slug ? t("partners.copied") : t("partners.copy")}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Eye className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">{t("partners.visits")}</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.visits}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <UserPlus className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">{t("partners.signups")}</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.signups}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <ListChecks className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">{t("partners.checklists")}</span>
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
  const { t } = useTranslation("admin");
  const overview = useQuery(api.waitTimeTracker.getAdminOverview, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("wait.heading", { count: overview?.totalReports ?? 0 })}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("wait.description")}
      </p>
      {overview === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : overview.routes.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("wait.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {overview.routes.map((r) => (
            <div key={r.route} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2.5">
              <span className="text-sm text-foreground">{r.route}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t(r.count === 1 ? "wait.report_one" : "wait.report_other", { count: r.count })}</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  r.hasEnoughData ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                )}>
                  {r.hasEnoughData ? t("wait.public") : t("wait.gathering")}
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
  const { t } = useTranslation("admin");
  const isConfigured = useQuery(api.telegramBot.isTelegramConfigured, {});
  const stats = useQuery(api.telegramBot.getBotStats, {});
  const registerWebhook = useAction(api.telegramBot.registerWebhook);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await registerWebhook({});
      if (result.ok) {
        toast.success(t("tg.toast_connected"));
      } else {
        toast.error(result.description ?? t("tg.toast_connect_failed"));
      }
    } catch {
      toast.error(t("tg.toast_connect_error"));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-primary">{t("tg.title")}</h3>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isConfigured ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            {isConfigured === undefined ? t("tg.checking") : isConfigured ? t("tg.token_set") : t("tg.not_configured")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {t("tg.description")}
        </p>
        <Button
          size="sm"
          className="cursor-pointer"
          disabled={!isConfigured || connecting}
          onClick={() => { void handleConnect(); }}
        >
          <Send className="w-3.5 h-3.5" />
          {connecting ? t("tg.connecting") : t("tg.connect")}
        </Button>
        {!isConfigured && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Set TELEGRAM_BOT_TOKEN via <code>npx convex env set</code> first.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("tg.recent_activity")}</h3>
        {stats === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : stats.recent.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("tg.no_questions")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Send className="w-4 h-4" />} label={t("tg.logged")} value={stats.totalLogged} />
              <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label={t("tg.match_rate")} value={`${stats.matchRate}%`} sub={t("tg.matched_count", { count: stats.matchedCount })} />
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
                      {entry.matchedDestination ? t("tg.matched_detail", { destination: entry.matchedDestination, visaType: entry.matchedVisaType }) : t("tg.no_match")}
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
  const { t } = useTranslation("admin");
  const isConfigured = useQuery(api.whatsappBot.isWhatsAppConfigured, {});
  const stats = useQuery(api.whatsappBot.getBotStats, {});

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-primary">{t("wa.title")}</h3>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isConfigured ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            {isConfigured === undefined ? t("tg.checking") : isConfigured ? t("wa.credentials_set") : t("tg.not_configured")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {t("wa.description")}
        </p>
        {!isConfigured ? (
          <div className="text-[11px] text-muted-foreground space-y-1.5">
            <p>
              Set <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, and <code>TWILIO_WHATSAPP_NUMBER</code> via <code>npx convex env set</code> first.
            </p>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground space-y-1.5">
            <p>
              {t("wa.webhook_hint")}
            </p>
            <code className="block bg-muted rounded-md px-2 py-1.5 text-[11px] break-all">
              {`${import.meta.env.VITE_CONVEX_URL?.replace(".cloud", ".site") ?? "https://your-deployment.convex.site"}/whatsapp/webhook`}
            </code>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("tg.recent_activity")}</h3>
        {stats === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : stats.recent.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("tg.no_questions")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<MessageCircle className="w-4 h-4" />} label={t("tg.logged")} value={stats.totalLogged} />
              <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label={t("tg.match_rate")} value={`${stats.matchRate}%`} sub={t("tg.matched_count", { count: stats.matchedCount })} />
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
                      {entry.matchedDestination ? t("tg.matched_detail", { destination: entry.matchedDestination, visaType: entry.matchedVisaType }) : t("tg.no_match")}
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
  const { t } = useTranslation("admin");
  const report = useQuery(api.dataFreshness.getFreshnessReport, {});
  const markVerified = useMutation(api.dataFreshness.markVerified);
  const [verifying, setVerifying] = useState<string | null>(null);

  const handleMarkVerified = async (destination: string) => {
    setVerifying(destination);
    try {
      await markVerified({ destination });
      toast.success(`${destination} marked as reviewed.`);
    } catch {
      toast.error("Could not update. Please try again.");
    } finally {
      setVerifying(null);
    }
  };

  const staleCount = report?.filter((r) => r.isStale).length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
            {t("freshness.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("freshness.description")}
          </p>
        </div>
        {report && staleCount > 0 && (
          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            {staleCount} stale
          </span>
        )}
      </div>
      {report === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="space-y-2">
          {report.map((row) => (
            <div
              key={row.destination}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
            >
              <div className="shrink-0">
                {row.isStale ? (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{row.destination}</div>
                <div className="text-xs text-muted-foreground">
                  {t(row.visaTypeCount === 1 ? "freshness.visa_type_one" : "freshness.visa_type_other", { count: row.visaTypeCount })}
                </div>
              </div>
              <div className="text-right shrink-0 mr-3">
                <div className={cn("text-xs font-semibold", row.isStale ? "text-amber-700" : "text-muted-foreground")}>
                  {t("freshness.days_ago", { days: row.daysSinceVerified })}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {row.lastVerified}
                  {row.hasDbRecord && <span className="ml-1 text-green-600">✓ live</span>}
                </div>
              </div>
              <button
                onClick={() => { void handleMarkVerified(row.destination); }}
                disabled={verifying === row.destination}
                className={cn(
                  "shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer",
                  row.isStale
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary",
                  verifying === row.destination && "opacity-50 cursor-not-allowed",
                )}
              >
                {verifying === row.destination ? "Saving…" : "Mark Reviewed"}
              </button>
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
  const { t } = useTranslation("admin");
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
      toast.success(t("license.toast_issued"));
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error(t("license.toast_issue_failed"));
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
          <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700">{t("license.redeemed")}</span>
        )}
        <button
          onClick={() => { navigator.clipboard.writeText(displayCode); toast.success(t("license.toast_copied")); }}
          className="text-xs font-semibold text-accent hover:underline cursor-pointer"
        >
          {t("license.copy")}
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
        <option value="agent_listing">{t("license.agent_listing")}</option>
        <option value="agent_featured">{t("license.agent_featured")}</option>
        <option value="agency_white_label">{t("license.agency_white_label")}</option>
      </select>
      <button
        disabled={issuing}
        onClick={() => { void handleIssue(); }}
        className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60"
      >
        {issuing ? t("license.issuing") : t("license.issue")}
      </button>
    </div>
  );
}

function IssuedCodesList() {
  const { t } = useTranslation("admin");
  const codes = useQuery(api.licenseCodes.listLicenseCodes, {});
  if (codes === undefined) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (codes.length === 0) {
    return <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">{t("license.empty")}</div>;
  }
  const now = Date.now();
  return (
    <div className="bg-card border border-border rounded-xl divide-y divide-border">
      {codes.map((c) => {
        const statusKey = c.redeemedAt ? "redeemed" : new Date(c.expiresAt).getTime() < now ? "expired" : "pending";
        return (
          <div key={c._id} className="flex items-center justify-between px-4 py-2.5 text-xs gap-3">
            <div className="min-w-0">
              <span className="font-mono font-semibold text-foreground">{c.code}</span>
              <span className="text-muted-foreground ml-2">{c.email} · {c.plan}</span>
            </div>
            <span className={cn(
              "shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
              statusKey === "redeemed" ? "bg-green-50 text-green-700 border-green-200" : statusKey === "expired" ? "bg-muted text-muted-foreground border-border" : "bg-amber-50 text-amber-700 border-amber-200",
            )}>
              {t(`license.status_${statusKey}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ContactMessagesPanel() {
  const messages = useQuery(api.contact.list, {});
  const markRead = useMutation(api.contact.markRead);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleMarkRead = async (id: Id<"contact_messages">) => {
    setProcessingId(id);
    try {
      await markRead({ id });
    } catch {
      toast.error("Failed to mark as read.");
    } finally {
      setProcessingId(null);
    }
  };

  const unread = messages?.filter((m) => !m.read) ?? [];
  const read = messages?.filter((m) => m.read) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-0.5">
          Contact Messages — Unread ({unread.length})
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Messages submitted via the Contact Us form. Reply directly to the sender's email address.
        </p>
        {messages === undefined ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : unread.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No unread messages.
          </div>
        ) : (
          <div className="space-y-3">
            {unread.map((msg) => (
              <div key={msg._id} className="bg-card border border-accent/30 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-primary">{msg.name}</span>
                      <a
                        href={`mailto:${msg.email}`}
                        className="text-xs text-accent hover:underline truncate max-w-[200px]"
                      >
                        {msg.email}
                      </a>
                    </div>
                    {msg.subject && (
                      <p className="text-xs font-medium text-foreground mt-0.5">{msg.subject}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(msg.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mb-3">
                  {msg.message}
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject ?? "Your message to VisaClear")}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Send className="w-3 h-3" /> Reply
                  </a>
                  <button
                    disabled={processingId === msg._id}
                    onClick={() => { void handleMarkRead(msg._id); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Mark read
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {read.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">
            Read ({read.length})
          </h3>
          <div className="space-y-2">
            {read.map((msg) => (
              <div key={msg._id} className="bg-muted/40 border border-border rounded-xl p-4 opacity-70">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-primary">{msg.name}</span>
                    <a href={`mailto:${msg.email}`} className="text-xs text-accent hover:underline">
                      {msg.email}
                    </a>
                    {msg.subject && (
                      <span className="text-xs text-muted-foreground">— {msg.subject}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(msg.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {msg.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadsAdminPanel() {
  const { t } = useTranslation("admin");
  const applications = useQuery(api.whitelabel.list, {});
  const subscribers = useQuery(api.newsletter.list, {});
  const markRead = useMutation(api.whitelabel.markRead);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
          {t("leads.applications_heading", { count: applications?.filter((a) => !a.read).length ?? 0 })}
        </h3>
        {applications === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : applications.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("leads.applications_empty")}
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
                  {app.email}{app.phone ? ` · ${app.phone}` : ""}{app.country ? ` · ${app.country}` : ""} · {t("leads.plan_label")} <span className="font-semibold text-foreground">{app.plan}</span>
                </div>
                {app.message && <p className="text-xs text-muted-foreground mb-2">{app.message}</p>}
                {!app.read && (
                  <button
                    onClick={() => { void markRead({ id: app._id }); }}
                    className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                  >
                    {t("leads.mark_read")}
                  </button>
                )}
                <IssueCodeControl applicationId={app._id} email={app.email} requestedPlan={app.plan} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("leads.license_codes_heading")}</h3>
        <IssuedCodesList />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
          {t("leads.subscribers_heading", { count: subscribers?.length ?? 0 })}
        </h3>
        {subscribers === undefined ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : subscribers.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("leads.subscribers_empty")}
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

function PayoutRequestsAdminPanel() {
  const requests = useQuery(api.admin.listPayoutRequests, {});
  const process = useMutation(api.admin.processPayoutRequest);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const handleProcess = async (id: Id<"payout_requests">, decision: "paid" | "declined") => {
    setProcessingId(id);
    try {
      await process({ requestId: id, decision, adminNotes: adminNotes[id] ?? undefined });
      toast.success(decision === "paid" ? "Marked as paid." : "Request declined.");
    } catch {
      toast.error("Failed to process request.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
            Payout Requests — Pending ({requests?.length ?? 0})
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Commission withdrawal requests from agents. Confirm bank transfer before marking paid.
          </p>
        </div>
      </div>
      {requests === undefined ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : requests.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          No pending payout requests.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req._id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#0f2040]">{req.agentName}</span>
                    {req.agentEmail && (
                      <a href={`mailto:${req.agentEmail}`} className="text-xs text-accent hover:underline">{req.agentEmail}</a>
                    )}
                  </div>
                  <div className="text-2xl font-semibold text-[#0f2040] mt-1">
                    ${(req.amountCents / 100).toFixed(2)}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(req.requestedAt).toLocaleString("en-GB")}
                </span>
              </div>
              {req.notes && (
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed bg-white/60 rounded-lg px-3 py-2">
                  {req.notes}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Admin notes (optional)"
                  value={adminNotes[req._id] ?? ""}
                  onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req._id]: e.target.value }))}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={processingId === req._id}
                    onClick={() => { void handleProcess(req._id, "paid"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                  </button>
                  <button
                    disabled={processingId === req._id}
                    onClick={() => { void handleProcess(req._id, "declined"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmployersAdminPanel() {
  const { t } = useTranslation("admin");
  const orgs = useQuery(api.adminOrgs.listOrganizations, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("employers.heading", { count: orgs?.length ?? 0 })}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("employers.description")}
      </p>
      {orgs === undefined ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : orgs.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("employers.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map((org) => (
            <div key={org._id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-primary">{org.name}</span>
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {org.type === "household" ? t("employers.household") :
                   org.type === "university" ? "University" :
                   org.type === "law_firm" ? "Law Firm" :
                   t("employers.employer")}
                </span>
                <div className="text-[10px] text-muted-foreground">{new Date(org.createdAt).toLocaleDateString("en-GB")} · {t(org.memberCount === 1 ? "employers.admin_one" : "employers.admin_other", { count: org.memberCount })}</div>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{t("employers.pending", { count: org.pendingCount })}</span>
                <span>{t("employers.accepted", { count: org.acceptedCount })}</span>
                <span>{t("employers.declined", { count: org.declinedCount })}</span>
                <span>{t("employers.revoked", { count: org.revokedCount })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLogPanel() {
  const { t } = useTranslation("admin");
  const entries = useQuery(api.admin.getAuditLog, {});

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
        {t("audit.title")}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("audit.description")}
      </p>
      {entries === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : entries.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("audit.empty")}
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
                  {t("audit.by", { email: entry.adminEmail ?? t("audit.unknown_admin") })} · {new Date(entry.createdAt).toLocaleString("en-GB")}
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
  const { t } = useTranslation("admin");
  const updates = useQuery(api.countryWatch.listUpdates, {});
  const publishUpdate = useMutation(api.countryWatch.publishUpdate);
  const [countryName, setCountryName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!countryName || !title.trim() || !body.trim()) {
      toast.error(t("watch.toast_required"));
      return;
    }
    setPublishing(true);
    try {
      await publishUpdate({ countryName, title: title.trim(), body: body.trim() });
      toast.success(t("watch.toast_published", { country: countryName }));
      setTitle("");
      setBody("");
    } catch {
      toast.error(t("watch.toast_publish_failed"));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-4">{t("watch.publish_heading")}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t("watch.publish_description")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("watch.country_label")}</label>
            <CountrySelect
              value={countryName}
              onChange={setCountryName}
              placeholder={t("watch.select_country")}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("watch.title_label")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("watch.title_placeholder")}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("watch.details_label")}</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("watch.details_placeholder")}
              className="min-h-[120px]"
            />
          </div>
          <Button disabled={publishing} className="cursor-pointer font-semibold" onClick={() => void handlePublish()}>
            {publishing ? t("watch.publishing") : t("watch.publish")}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">{t("watch.published_heading")}</h3>
        {updates === undefined ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("watch.published_empty")}</p>
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

function BlogAdminPanel() {
  const articles = useQuery(api.blog.adminList);
  const upsert = useMutation(api.blog.adminUpsert);
  const togglePublished = useMutation(api.blog.adminTogglePublished);
  const deleteArticle = useMutation(api.blog.adminDelete);
  const seedArticles = useMutation(api.blog.adminSeedArticles);

  const [editing, setEditing] = useState<string | null>(null); // _id or "new"
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "", title: "", excerpt: "", body: "", category: "", readTime: "", featured: false, published: true, publishedAt: "",
  });

  const openNew = () => {
    setForm({ slug: "", title: "", excerpt: "", body: "", category: "", readTime: "5 min read", featured: false, published: true, publishedAt: new Date().toISOString().slice(0, 10) });
    setEditing("new");
  };

  const openEdit = (a: NonNullable<typeof articles>[number]) => {
    setForm({
      slug: a.slug, title: a.title, excerpt: a.excerpt, body: a.body,
      category: a.category, readTime: a.readTime, featured: a.featured,
      published: a.published, publishedAt: a.publishedAt ? a.publishedAt.slice(0, 10) : "",
    });
    setEditing(a._id);
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !form.title.trim() || !form.body.trim()) {
      toast.error("Slug, title, and body are required.");
      return;
    }
    setSaving(true);
    try {
      await upsert({
        _id: editing !== "new" ? editing as Parameters<typeof upsert>[0]["_id"] : undefined,
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        body: form.body,
        category: form.category.trim() || "Guides",
        readTime: form.readTime.trim() || "5 min read",
        featured: form.featured,
        published: form.published,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
      });
      toast.success(editing === "new" ? "Article created." : "Article saved.");
      setEditing(null);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: Parameters<typeof togglePublished>[0]["_id"]) => {
    try {
      await togglePublished({ _id: id });
    } catch {
      toast.error("Failed to update.");
    }
  };

  const handleDelete = async (id: Parameters<typeof deleteArticle>[0]["_id"]) => {
    try {
      await deleteArticle({ _id: id });
      toast.success("Article deleted.");
      setConfirmDelete(null);
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const count = await seedArticles({});
      toast.success(`${count} articles loaded successfully.`);
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Seed failed.");
    } finally {
      setSeeding(false);
    }
  };

  const f = (key: keyof typeof form, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const inputCls = "w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">Blog Articles</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Create, edit, publish, and delete blog articles. Changes go live instantly.</p>
        </div>
        <Button size="sm" className="cursor-pointer font-semibold" onClick={openNew}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New Article
        </Button>
      </div>

      {/* Seed prompt — only shown when table is empty */}
      {articles !== undefined && articles.length === 0 && editing === null && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground mb-3">No articles yet. Load the 10 original VisaClear articles to get started.</p>
          <Button size="sm" disabled={seeding} className="cursor-pointer font-semibold" onClick={() => void handleSeed()}>
            {seeding ? "Loading…" : "Load Default Articles"}
          </Button>
        </div>
      )}

      {/* Edit / create form */}
      {editing !== null && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-sm text-primary">{editing === "new" ? "New Article" : "Edit Article"}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Slug (URL)</label>
              <input type="text" value={form.slug} onChange={(e) => f("slug", e.target.value)} placeholder="my-article-title" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Category</label>
              <input type="text" value={form.category} onChange={(e) => f("category", e.target.value)} placeholder="Visa Tips" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Title</label>
            <input type="text" value={form.title} onChange={(e) => f("title", e.target.value)} placeholder="Article title" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Excerpt (1–2 sentences shown in the list)</label>
            <Textarea value={form.excerpt} onChange={(e) => f("excerpt", e.target.value)} placeholder="Short description shown on the blog listing page." className="min-h-[70px]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Body (markdown — use ## for headings, **bold**, - lists, 1. ordered lists)</label>
            <Textarea value={form.body} onChange={(e) => f("body", e.target.value)} placeholder="Full article content..." className="min-h-[280px] font-mono text-xs" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Read Time</label>
              <input type="text" value={form.readTime} onChange={(e) => f("readTime", e.target.value)} placeholder="5 min read" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Published Date</label>
              <input type="date" value={form.publishedAt} onChange={(e) => f("publishedAt", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input type="checkbox" checked={form.featured} onChange={(e) => f("featured", e.target.checked)} className="cursor-pointer" />
                Featured (shown at top)
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input type="checkbox" checked={form.published} onChange={(e) => f("published", e.target.checked)} className="cursor-pointer" />
                Published (visible to users)
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button disabled={saving} className="cursor-pointer font-semibold" onClick={() => void handleSave()}>
              {saving ? "Saving…" : "Save Article"}
            </Button>
            <Button variant="outline" className="cursor-pointer" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Article list */}
      {articles === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a._id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", a.published ? "text-green-700 bg-green-50 border-green-200" : "text-muted-foreground bg-muted border-border")}>
                    {a.published ? "Published" : "Draft"}
                  </span>
                  {a.featured && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">Featured</span>}
                  <span className="text-[10px] text-muted-foreground">{a.category}</span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">/blog/{a.slug}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => void handleToggle(a._id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors"
                  title={a.published ? "Unpublish" : "Publish"}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => openEdit(a)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors"
                  title="Edit"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                {confirmDelete === a._id ? (
                  <>
                    <button onClick={() => void handleDelete(a._id)} className="text-xs font-semibold text-destructive cursor-pointer px-2 py-1 rounded hover:bg-destructive/10">Confirm</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-muted-foreground cursor-pointer px-1">Cancel</button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(a._id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 cursor-pointer transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function AdminPage() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const adminExists = useQuery(api.admin.checkAdminExists, {});
  const claimFirstAdmin = useMutation(api.admin.claimFirstAdmin);
  const [claiming, setClaiming] = useState(false);

  const handleClaimAdmin = async () => {
    setClaiming(true);
    try {
      await claimFirstAdmin({});
      toast.success("Admin access granted. Welcome.");
      // Role query is reactive — AdminInner renders automatically once
      // currentUser.role flips to "admin". No manual navigation needed.
    } catch (err) {
      const msg = err instanceof ConvexError
        ? (err.data as { message: string }).message
        : "Could not claim admin access.";
      toast.error(msg);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AuthLoading>
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-3 w-80">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex-1 flex flex-col md:flex-row min-h-screen">
          {/* Left — branding panel */}
          <div className="hidden md:flex md:w-80 lg:w-96 bg-[#0f2040] flex-col justify-between p-10 shrink-0">
            <div>
              <button onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity mb-16">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-serif text-lg font-semibold text-white leading-tight">VisaClear</div>
                  <div className="text-[9px] text-white/65 tracking-widest uppercase">by Vericore</div>
                </div>
              </button>
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#b8a06a]/20 flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-[#b8a06a]" />
                </div>
                <h1 className="font-serif text-3xl font-semibold text-white mb-3">Admin Portal</h1>
                <p className="text-white/50 text-sm leading-relaxed">
                  Restricted access. Sign in with your admin account to manage users, content, and platform settings.
                </p>
              </div>
              <div className="space-y-3 mt-8">
                {["User & agent management", "Blog & content publishing", "Platform analytics & audit log"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#b8a06a]" />
                    <span className="text-white/65 text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-white/50 text-xs">&copy; {new Date().getFullYear()} Vericore Ltd.</p>
          </div>

          {/* Right — login form */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
            {/* Mobile logo */}
            <button onClick={() => navigate("/")} className="md:hidden flex items-center gap-2 mb-8 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-[#0f2040] flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-serif text-lg font-semibold text-[#0f2040]">VisaClear</span>
            </button>

            <div className="w-full max-w-sm">
              <div className="mb-7">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#b8a06a] bg-[#b8a06a]/10 px-3 py-1 rounded-full mb-3 tracking-widest uppercase">
                  <Shield className="w-3 h-3" /> Admin Access
                </div>
                <h2 className="font-serif text-2xl font-semibold text-[#0f2040]">Sign in to continue</h2>
                <p className="text-gray-400 text-sm mt-1">Only authorised admin accounts can access this panel.</p>
              </div>
              <AuthAccessPanel returnPath="/admin" hideDemoOption={true} />
              <p className="text-center text-xs text-gray-400 mt-5">
                Not an admin?{" "}
                <button onClick={() => navigate("/")} className="text-[#0f2040] font-semibold hover:underline cursor-pointer">
                  Back to the site
                </button>
              </p>
            </div>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        {currentUser === undefined ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#0f2040]/20 border-t-[#0f2040] rounded-full animate-spin" />
          </div>
        ) : currentUser?.role !== "admin" ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <h2 className="font-serif text-2xl font-semibold text-[#0f2040] mb-2">{t("page.access_denied")}</h2>
              <p className="text-gray-500 text-sm mb-4">{t("page.access_denied_body")}</p>
              {adminExists === false ? (
                <>
                  <p className="text-gray-400 text-xs mb-6">
                    No admin has been set up yet. You can claim the first admin seat below.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => { void handleClaimAdmin(); }}
                      disabled={claiming}
                      className="cursor-pointer bg-[#0f2040] hover:bg-[#0f2040]/90"
                    >
                      {claiming ? "Claiming..." : "Claim first admin seat"}
                    </Button>
                    <Button variant="ghost" onClick={() => navigate("/")} className="cursor-pointer text-gray-500">
                      {t("page.go_home")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-gray-400 text-xs mb-2">
                    Contact the platform admin to have your account granted access.
                  </p>
                  <Button variant="ghost" onClick={() => navigate("/")} className="cursor-pointer text-gray-500">
                    {t("page.go_home")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex">
            <AdminInner />
          </div>
        )}
      </Authenticated>
    </div>
  );
}
