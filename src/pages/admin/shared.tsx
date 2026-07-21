// Shared across multiple admin panels — the Tab union, the sidebar nav
// list, the per-panel error boundary, and the small stat-tile component
// used on the Overview, Telegram, and WhatsApp panels. Extracted 2026-07-18
// when admin/page.tsx (previously 5,300+ lines, ~33 panels in one file)
// was split into src/pages/admin/panels/*.tsx.
import type { ReactNode, ErrorInfo } from "react";
import { Component, useState } from "react";
import { cn } from "@/lib/utils.ts";
import {
  AlertCircle,
  BarChart3,
  ChevronRight,
  Search,
  Users,
  UserCheck,
  ShieldAlert,
  Shield,
  ListChecks,
  Settings,
  Globe,
  RefreshCw,
  MessageCircle,
  Award,
  Clock,
  Building2,
  UserPlus,
  Star,
  FileText,
  Sparkles,
  Brain,
  Mail,
  DollarSign,
} from "lucide-react";

export type Tab = "overview" | "users" | "agents" | "setup" | "country-watch" | "data-freshness" | "telegram-bot" | "whatsapp-bot" | "wall-of-fame" | "community" | "wait-times" | "partners" | "leads" | "messages" | "employers" | "audit-log" | "blog" | "marketplace-leads" | "credit-mgmt" | "security-log" | "corridor-intelligence" | "checklist-flags" | "approvals" | "creators" | "health" | "agent-reports" | "embassy-monitor" | "risk-mitigations" | "ai-usage" | "ai-feedback" | "email-delivery" | "vendor-watch";

export const NAV_ITEMS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: "overview",             icon: BarChart3,     label: "Overview" },
  { id: "users",                icon: Users,         label: "Users" },
  { id: "agents",               icon: UserCheck,     label: "Agents" },
  { id: "security-log",         icon: ShieldAlert,   label: "Security Intelligence" },
  { id: "risk-mitigations",     icon: Shield,        label: "Risk Mitigations" },
  { id: "audit-log",            icon: ListChecks,    label: "Audit Log" },
  { id: "setup",                icon: Settings,      label: "Setup" },
  { id: "country-watch",        icon: Globe,         label: "Country Watch" },
  { id: "data-freshness",       icon: RefreshCw,     label: "Data Freshness" },
  { id: "telegram-bot",         icon: MessageCircle, label: "Telegram Bot" },
  { id: "whatsapp-bot",         icon: MessageCircle, label: "WhatsApp Bot" },
  { id: "wall-of-fame",         icon: Award,         label: "Wall of Fame" },
  { id: "community",            icon: Users,         label: "Community" },
  { id: "wait-times",           icon: Clock,         label: "Wait Times" },
  { id: "partners",             icon: Building2,     label: "Partners" },
  { id: "leads",                icon: UserPlus,      label: "Partner Applications" },
  { id: "messages",             icon: MessageCircle, label: "Messages" },
  { id: "employers",            icon: Building2,     label: "Organisations" },
  { id: "marketplace-leads",    icon: UserPlus,      label: "Marketplace Leads" },
  { id: "credit-mgmt",          icon: Star,          label: "Credit Management" },
  { id: "blog",                 icon: FileText,      label: "Blog" },
  { id: "corridor-intelligence", icon: BarChart3,    label: "Corridor Intel" },
  { id: "checklist-flags",      icon: AlertCircle,   label: "Checklist Flags" },
  { id: "approvals",            icon: Award,         label: "Approvals" },
  { id: "creators",             icon: Sparkles,      label: "Creators" },
  { id: "health",               icon: Shield,        label: "System Health" },
  { id: "agent-reports",        icon: AlertCircle,   label: "Agent Reports" },
  { id: "embassy-monitor",      icon: Globe,         label: "Embassy Monitor" },
  { id: "ai-usage",             icon: Sparkles,      label: "AI Usage" },
  { id: "ai-feedback",          icon: Brain,         label: "AI Feedback" },
  { id: "email-delivery",       icon: Mail,          label: "Email Delivery" },
  { id: "vendor-watch",         icon: DollarSign,    label: "Vendor Watch" },
];

// Groups the 32 flat tabs above into 8 departments, ordered by how likely
// each is to have something waiting for you — Front Desk and Trust & Safety
// (the two most likely to need action today) sit on top, Back Office (just
// Setup, touched rarely) sits at the bottom. Every Tab must appear in
// exactly one department — TypeScript catches a typo'd id at compile time
// via `tabs: Tab[]`, but not an omitted or duplicated one, so this was
// hand-verified against the Tab union above when written.
export type DepartmentId = "front-desk" | "trust-safety" | "people-ops" | "growth-partnerships" | "content-community" | "intelligence-desk" | "communications" | "back-office";

export const DEPARTMENTS: { id: DepartmentId; code: string; label: string; tabs: Tab[] }[] = [
  { id: "front-desk", code: "FD", label: "Front Desk", tabs: ["overview", "health", "vendor-watch"] },
  { id: "trust-safety", code: "TS", label: "Trust & Safety", tabs: ["security-log", "risk-mitigations", "checklist-flags", "approvals", "audit-log"] },
  { id: "people-ops", code: "PO", label: "People Ops", tabs: ["users", "agents", "employers", "agent-reports"] },
  { id: "growth-partnerships", code: "GP", label: "Growth & Partnerships", tabs: ["partners", "leads", "marketplace-leads", "credit-mgmt", "creators"] },
  { id: "content-community", code: "CC", label: "Content & Community", tabs: ["blog", "wall-of-fame", "community", "corridor-intelligence"] },
  { id: "intelligence-desk", code: "ID", label: "Intelligence Desk", tabs: ["country-watch", "data-freshness", "wait-times", "embassy-monitor", "ai-usage", "ai-feedback"] },
  { id: "communications", code: "CM", label: "Communications", tabs: ["messages", "telegram-bot", "whatsapp-bot", "email-delivery"] },
  { id: "back-office", code: "BO", label: "Back Office", tabs: ["setup"] },
];

// Real, wired-in counts only — a department with nothing to report shows no
// badge rather than a fabricated number. Extend this as more panels grow a
// real "pending" concept (this starts with the two that already have one:
// unverified agents and orgs awaiting review).
export type SidebarBadges = { employers?: number; agents?: number };

// Single nav-item list shared by the desktop aside and the mobile overlay —
// they differ only in their outer grid/flex wrapper (kept separate in
// page.tsx for the Safari-mobile height-chain reasons documented there),
// never in what the list itself renders.
export function AdminSidebarNav({
  tab,
  onSelect,
  badges = {},
}: {
  tab: Tab;
  onSelect: (tab: Tab) => void;
  badges?: SidebarBadges;
}) {
  const [openDepts, setOpenDepts] = useState<Set<DepartmentId>>(() => {
    const dept = DEPARTMENTS.find((d) => d.tabs.includes(tab));
    return new Set(dept ? [dept.id] : []);
  });
  const [query, setQuery] = useState("");

  const toggle = (id: DepartmentId) => {
    setOpenDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const badgeFor = (id: Tab): number => badges[id as keyof SidebarBadges] ?? 0;
  const deptBadge = (deptTabs: Tab[]): number => deptTabs.reduce((sum, t) => sum + badgeFor(t), 0);

  const q = query.trim().toLowerCase();
  const isFiltering = q.length > 0;

  return (
    <div>
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-white/25 transition-colors">
          <Search className="w-3.5 h-3.5 text-white/35 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a panel…"
            className="bg-transparent text-xs text-white placeholder:text-white/35 focus:outline-none w-full min-w-0"
          />
        </div>
      </div>
      {DEPARTMENTS.map((dept) => {
        const items = NAV_ITEMS.filter((n) => dept.tabs.includes(n.id));
        const visibleItems = isFiltering ? items.filter((n) => n.label.toLowerCase().includes(q)) : items;
        if (isFiltering && visibleItems.length === 0) return null;
        const open = isFiltering || openDepts.has(dept.id);
        const badge = deptBadge(dept.tabs);
        return (
          <div key={dept.id} className="mb-0.5">
            <button
              onClick={() => toggle(dept.id)}
              className="flex items-center gap-2.5 mx-1 px-3 py-2 text-left cursor-pointer hover:bg-white/5 transition-colors rounded-lg"
              style={{ width: "calc(100% - 8px)" }}
            >
              <ChevronRight className={cn("w-3 h-3 text-white/30 transition-transform shrink-0", open && "rotate-90")} />
              <span className="w-6 h-6 rounded-md bg-white/8 text-white/70 text-[9px] font-bold flex items-center justify-center shrink-0">{dept.code}</span>
              <span className="flex-1 text-[11.5px] font-bold text-white/85 uppercase tracking-wide truncate">{dept.label}</span>
              {badge > 0 && (
                <span className="text-[10px] font-bold bg-[#b8a06a] text-[#0f2040] rounded-full min-w-4 h-4 px-1.5 flex items-center justify-center shrink-0">{badge}</span>
              )}
            </button>
            {open && (
              <div className="pb-1">
                {visibleItems.map((item) => {
                  const active = tab === item.id;
                  const itemBadge = badgeFor(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 pl-11 pr-4 py-2 text-sm font-medium transition-all cursor-pointer text-left",
                        active
                          ? "bg-white/10 text-white border-r-2 border-[#b8a06a]"
                          : "text-white/50 hover:text-white hover:bg-white/5 border-r-2 border-transparent"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-[#b8a06a]" : "")} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {itemBadge > 0 && (
                        <span className="text-[9.5px] font-bold text-red-300 bg-red-500/15 rounded-full px-1.5 py-0.5 shrink-0">{itemBadge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export class PanelErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  componentDidCatch(_e: Error, info: ErrorInfo) { console.error("Admin panel error:", _e, info.componentStack); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm font-semibold text-red-500">This panel failed to load.</p>
          <p className="text-xs text-gray-400 max-w-sm text-center break-words">{this.state.error}</p>
          <button
            className="text-xs text-[#0f2040] font-semibold underline cursor-pointer"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function StatCard({ icon, label, value, sub, onClick }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl p-6 shadow-sm${onClick ? " cursor-pointer hover:border-[#0f2040]/20 hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
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
