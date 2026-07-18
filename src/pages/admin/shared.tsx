// Shared across multiple admin panels — the Tab union, the sidebar nav
// list, the per-panel error boundary, and the small stat-tile component
// used on the Overview, Telegram, and WhatsApp panels. Extracted 2026-07-18
// when admin/page.tsx (previously 5,300+ lines, ~33 panels in one file)
// was split into src/pages/admin/panels/*.tsx.
import type { ReactNode, ErrorInfo } from "react";
import { Component } from "react";
import {
  AlertCircle,
  BarChart3,
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
} from "lucide-react";

export type Tab = "overview" | "users" | "agents" | "setup" | "country-watch" | "data-freshness" | "telegram-bot" | "whatsapp-bot" | "wall-of-fame" | "community" | "wait-times" | "partners" | "leads" | "messages" | "employers" | "audit-log" | "blog" | "marketplace-leads" | "credit-mgmt" | "security-log" | "corridor-intelligence" | "checklist-flags" | "approvals" | "creators" | "health" | "agent-reports" | "embassy-monitor" | "risk-mitigations" | "ai-usage" | "ai-feedback" | "email-delivery";

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
  { id: "leads",                icon: UserPlus,      label: "Leads" },
  { id: "messages",             icon: MessageCircle, label: "Messages" },
  { id: "employers",            icon: Building2,     label: "Employers" },
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
];

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
