import type { ReactNode } from "react";
import { useState, useEffect, Fragment } from "react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuth } from "@/hooks/use-auth.ts";
import { api } from "@/convex/_generated/api.js";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { NotificationBell } from "@/components/NotificationBell.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Globe, ArrowLeft, Shield, Users, FileText, BarChart3, CheckCircle2, Trash2, ChevronDown, ChevronUp, AlertCircle, UserCheck, Settings, LogOut, Menu, Sparkles, Brain, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel.js";
import { NAV_ITEMS, PanelErrorBoundary, StatCard, AdminSidebarNav } from "./shared.tsx";
import type { Tab, SidebarBadges } from "./shared.tsx";
import { RiskMitigationsPanel } from "./panels/RiskMitigationsPanel.tsx";
import { AgentReviewModerationPanel } from "./panels/AgentReviewModerationPanel.tsx";
import { AgentReportsPanel } from "./panels/AgentReportsPanel.tsx";
import { EmbassyMonitorPanel } from "./panels/EmbassyMonitorPanel.tsx";
import { SetupPanel } from "./panels/SetupPanel.tsx";
import { WallOfFameAdminPanel } from "./panels/WallOfFameAdminPanel.tsx";
import { CommunityAdminPanel } from "./panels/CommunityAdminPanel.tsx";
import { PartnersAdminPanel } from "./panels/PartnersAdminPanel.tsx";
import { WaitTimesAdminPanel } from "./panels/WaitTimesAdminPanel.tsx";
import { TelegramBotPanel } from "./panels/TelegramBotPanel.tsx";
import { WhatsAppBotPanel } from "./panels/WhatsAppBotPanel.tsx";
import { DataFreshnessPanel } from "./panels/DataFreshnessPanel.tsx";
import { ContactMessagesPanel } from "./panels/ContactMessagesPanel.tsx";
import { LeadsAdminPanel } from "./panels/LeadsAdminPanel.tsx";
import { TrialManagementPanel } from "./panels/TrialManagementPanel.tsx";
import { PayoutRequestsAdminPanel } from "./panels/PayoutRequestsAdminPanel.tsx";
import { EmployersAdminPanel } from "./panels/EmployersAdminPanel.tsx";
import { AuditLogPanel } from "./panels/AuditLogPanel.tsx";
import { MarketplaceLeadsAdminPanel } from "./panels/MarketplaceLeadsAdminPanel.tsx";
import { CreditManagementPanel } from "./panels/CreditManagementPanel.tsx";
import { SecurityIntelligenceCentre } from "./panels/SecurityIntelligenceCentre.tsx";
import { CountryWatchAdminPanel } from "./panels/CountryWatchAdminPanel.tsx";
import { BlogAdminPanel } from "./panels/BlogAdminPanel.tsx";
import { AIUsagePanel } from "./panels/AIUsagePanel.tsx";
import { AiFeedbackPanel } from "./panels/AiFeedbackPanel.tsx";
import { EmailDeliveryPanel } from "./panels/EmailDeliveryPanel.tsx";
import { VendorWatchPanel } from "./panels/VendorWatchPanel.tsx";
import { CorridorIntelligencePanel } from "./panels/CorridorIntelligencePanel.tsx";
import { ChecklistFlagsPanel } from "./panels/ChecklistFlagsPanel.tsx";
import { ApprovalsAdminPanel } from "./panels/ApprovalsAdminPanel.tsx";
import { CreatorsAdminPanel } from "./panels/CreatorsAdminPanel.tsx";
import { SystemHealthPanel } from "./panels/SystemHealthPanel.tsx";

function AdminInner() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTabState] = useState<Tab>(() => {
    const fromUrl = searchParams.get("tab");
    return NAV_ITEMS.some((n) => n.id === fromUrl) ? (fromUrl as Tab) : "overview";
  });
  // Keep the tab in the URL so a refresh (or a link straight to a tab, like
  // the System Health panel's shortcuts) lands back on the same screen
  // instead of resetting to Overview. `replace` avoids piling up a history
  // entry per tab click.
  const setTab = (next: Tab) => {
    setTabState(next);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab", next);
      return params;
    }, { replace: true });
  };
  // Some panels (e.g. System Health's shortcut buttons) navigate straight to
  // "/admin?tab=..." via useNavigate rather than calling setTab directly.
  // Since that doesn't remount this component, pick up the change here too.
  useEffect(() => {
    const fromUrl = searchParams.get("tab");
    if (fromUrl && fromUrl !== tab && NAV_ITEMS.some((n) => n.id === fromUrl)) {
      setTabState(fromUrl as Tab);
    }
  }, [searchParams]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const stats = useQuery(api.admin.getStats, {});
  const users = useQuery(api.admin.getUsers, { limit: 100 });
  const agents = useQuery(api.admin.getAgents, {});
  const updatePlan = useMutation(api.admin.updateUserPlan);
  const updateRole = useMutation(api.admin.updateUserRole);
  const deleteUser = useMutation(api.admin.deleteUser);
  const verifyAgent = useMutation(api.admin.verifyAgent);
  const systemHealth = useQuery(api.admin.getSystemHealth, {});
  const aiUsage = useQuery(api.admin.getAIUsage, {});
  const caseIntelStats = useQuery(api.caseReadiness.getAdminCaseIntelligenceStats, {});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Real sidebar badge counts only — a department shows a number only where
  // one is actually backed by data. orgs is the same query EmployersAdminPanel
  // uses, so Convex shares the subscription rather than duplicating it.
  const orgs = useQuery(api.adminOrgs.listOrganizations, {});
  const sidebarBadges: SidebarBadges = {
    employers: orgs?.filter((o) => o.approvalStatus === "pending").length ?? 0,
    agents: agents?.filter((a) => !a.verified).length ?? 0,
  };

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

  const sidebarGrid = (
    <div className="absolute inset-0 grid" style={{ gridTemplateRows: "auto 1fr auto" }}>
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
      <div className="overflow-y-auto py-3">
        <AdminSidebarNav tab={tab} onSelect={setTab} badges={sidebarBadges} />
      </div>
      <div className="px-4 pt-4 pb-4 border-t border-white/10 flex flex-col gap-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
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
    </div>
  );

  return (
    <div className="flex">
      {/* Desktop: fixed aside, absolute-fill grid — no height chain, no dvh, no flex */}
      <aside className="hidden md:block fixed inset-y-0 left-0 w-56 bg-[#0f2040] z-30">
        {sidebarGrid}
      </aside>

      {/* Mobile sidebar overlay — standalone flex-col, does NOT reuse sidebarGrid.
          The overlay is fixed inset-0 (explicit viewport height). The w-56 child
          gets that height via flex align-items:stretch, then distributes it with
          flex-col: header=shrink-0, nav=flex-1 (scrollable), footer=shrink-0. */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-[#0f2040] shadow-2xl flex flex-col">
            <div className="px-4 py-5 border-b border-white/10 shrink-0">
              <button onClick={() => { navigate("/"); setSidebarOpen(false); }} className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
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
              <AdminSidebarNav tab={tab} onSelect={(next) => { setTab(next); setSidebarOpen(false); }} badges={sidebarBadges} />
            </div>
            <div className="px-4 pt-4 border-t border-white/10 flex flex-col gap-2 shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
              <button
                onClick={() => { navigate("/"); setSidebarOpen(false); }}
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
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content — offset by sidebar width on desktop */}
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50 md:pl-56">
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
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer px-3 py-1.5 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 md:p-8">
        <PanelErrorBoundary key={tab}>

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
                  <StatCard
                    icon={<Sparkles className="w-4 h-4" />}
                    label="AI Messages Today"
                    value={aiUsage?.todayTotal ?? "—"}
                    sub={`${aiUsage?.todayAgent ?? 0} agent · ${aiUsage?.todayBusiness ?? 0} business`}
                    onClick={() => setTab("ai-usage")}
                  />
                  <StatCard
                    icon={<Sparkles className="w-4 h-4" />}
                    label="AI Messages All-Time"
                    value={aiUsage?.totalAllTime ?? "—"}
                    sub={`${aiUsage?.totalAgent ?? 0} agent · ${aiUsage?.totalBusiness ?? 0} business`}
                    onClick={() => setTab("ai-usage")}
                  />
                </div>
              )}

              {/* Case Intelligence stats */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-[#0f2040]" />
                  <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-wide">Case Intelligence</h3>
                </div>
                {caseIntelStats === undefined ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-muted/40 px-3 py-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Cases Checked</p>
                      <p className="text-2xl font-bold font-serif text-foreground">{caseIntelStats.totalChecks}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-3 py-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Avg Readiness</p>
                      <p className={cn("text-2xl font-bold font-serif", caseIntelStats.avgScore >= 80 ? "text-green-600" : caseIntelStats.avgScore >= 60 ? "text-amber-600" : "text-red-600")}>{caseIntelStats.avgScore}%</p>
                    </div>
                    <div className="rounded-xl px-3 py-3 text-center border border-red-100 bg-red-50/50">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Critical Cases</p>
                      </div>
                      <p className="text-2xl font-bold font-serif text-red-600">{caseIntelStats.criticalCases}</p>
                    </div>
                    <div className="rounded-xl px-3 py-3 text-center border border-purple-100 bg-purple-50/50">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <ShieldAlert className="w-3 h-3 text-purple-600" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-600">Fraud Signals</p>
                      </div>
                      <p className="text-2xl font-bold font-serif text-purple-600">{caseIntelStats.totalFraudSignals}</p>
                      {caseIntelStats.highFraudSignals > 0 && (
                        <p className="text-[10px] font-semibold text-red-600 mt-0.5">{caseIntelStats.highFraudSignals} high confidence</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
                        <Fragment key={user._id}>
                          <tr
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
                        </Fragment>
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

              {/* Trial management */}
              <TrialManagementPanel agents={agents ?? []} />

              {/* Payout requests */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <PayoutRequestsAdminPanel />
              </div>

              {/* Review moderation */}
              <AgentReviewModerationPanel />
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
          {tab === "marketplace-leads" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><MarketplaceLeadsAdminPanel /></div>}
          {tab === "credit-mgmt" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><CreditManagementPanel /></div>}
          {tab === "security-log" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><SecurityIntelligenceCentre /></div>}
          {tab === "audit-log" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><AuditLogPanel /></div>}
          {tab === "blog" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><BlogAdminPanel /></div>}
          {tab === "corridor-intelligence" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><CorridorIntelligencePanel /></div>}
          {tab === "checklist-flags" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><ChecklistFlagsPanel /></div>}
          {tab === "approvals" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><ApprovalsAdminPanel /></div>}
          {tab === "creators" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><CreatorsAdminPanel /></div>}
          {tab === "health" && <SystemHealthPanel />}
          {tab === "agent-reports" && <AgentReportsPanel />}
          {tab === "embassy-monitor" && <EmbassyMonitorPanel />}
          {tab === "risk-mitigations" && <RiskMitigationsPanel />}
          {tab === "ai-usage" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><AIUsagePanel /></div>}
          {tab === "ai-feedback" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><AiFeedbackPanel /></div>}
          {tab === "email-delivery" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><EmailDeliveryPanel /></div>}
          {tab === "vendor-watch" && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><VendorWatchPanel /></div>}

        </PanelErrorBoundary>
        </main>
      </div>
    </div>
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
      const msg = convexErrMsg(err) ?? "Could not claim admin access.";
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
