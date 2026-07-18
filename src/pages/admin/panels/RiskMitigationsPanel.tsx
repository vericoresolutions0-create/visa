import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { Tab } from "../shared.tsx";

export function RiskMitigationsPanel() {
  const pendingReviews = useQuery(api.agentReviews.listPending, {});
  const pendingReports = useQuery(api.embassyData.listAgentReports, {});
  const embassyAlerts = useQuery(api.embassyData.listActiveAlerts, {});
  const allSnapshots = useQuery(api.embassyData.listAllSnapshots, {});

  const features: {
    risk: string;
    num: string;
    title: string;
    description: string;
    status: "live" | "attention";
    action?: string;
    actionTab?: Tab;
    metric?: string;
  }[] = [
    {
      risk: "Risk 1",
      num: "01",
      title: "Checklist freshness badge",
      description: "Last-verified date and embassy link shown on every checklist card so users can see how current the data is.",
      status: "live",
      metric: "Active on all checklists",
    },
    {
      risk: "Risk 1",
      num: "02",
      title: "Embassy page monitor",
      description: "Weekly cron hashes each embassy page. Change alerts fire here when content differs from the stored baseline.",
      status: (embassyAlerts?.length ?? 0) > 0 ? "attention" : "live",
      metric: allSnapshots !== undefined
        ? `${allSnapshots.length} destinations monitored · ${embassyAlerts?.length ?? 0} active alert${(embassyAlerts?.length ?? 0) !== 1 ? "s" : ""}`
        : "Loading…",
      action: "View alerts",
      actionTab: "embassy-monitor",
    },
    {
      risk: "Risk 2",
      num: "03",
      title: "AI score band labels",
      description: "Raw probability number replaced with plain-English bands (Application looks strong / Some gaps / Significant gaps) + inline disclaimer.",
      status: "live",
      metric: "Active on Dashboard + Rejection Analyser",
    },
    {
      risk: "Risk 3",
      num: "04",
      title: "Agent credentials",
      description: "OISC, RCIC, Bar number and verification URL on agent profiles. Verifiable / Not independently verified badge shown publicly.",
      status: "live",
      metric: "Agents can add via their registration form",
    },
    {
      risk: "Risk 3",
      num: "05",
      title: "Client reviews",
      description: "1–5 star reviews with comments, held pending until you approve them. Agent average rating updates atomically on approval.",
      status: (pendingReviews?.length ?? 0) > 0 ? "attention" : "live",
      metric: pendingReviews !== undefined
        ? `${pendingReviews.length} pending review${pendingReviews.length !== 1 ? "s" : ""} awaiting approval`
        : "Loading…",
      action: "Moderate reviews",
      actionTab: "agents",
    },
    {
      risk: "Risk 3",
      num: "06",
      title: "Agent report button",
      description: "Flag button on every agent profile. Reports come here with reason + details for review. No login required to report.",
      status: (pendingReports?.length ?? 0) > 0 ? "attention" : "live",
      metric: pendingReports !== undefined
        ? `${pendingReports.length} pending report${pendingReports.length !== 1 ? "s" : ""} to review`
        : "Loading…",
      action: "Review reports",
      actionTab: "agent-reports",
    },
  ];

  const attentionCount = features.filter((f) => f.status === "attention").length;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#0f2040] mb-1">Risk Mitigations</h2>
            <p className="text-sm text-gray-500">6 trust and safety features live in production. All deployed 12 Jul 2026.</p>
          </div>
          <div className="flex items-center gap-3">
            {attentionCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                <AlertCircle className="w-3.5 h-3.5" /> {attentionCount} need{attentionCount === 1 ? "s" : ""} attention
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> All clear
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#0f2040]/8 text-[#0f2040]">
              6 / 6 live
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f) => (
          <div
            key={f.num}
            className={cn(
              "bg-white rounded-2xl border shadow-sm p-5",
              f.status === "attention" ? "border-amber-200" : "border-gray-100",
            )}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="font-serif text-2xl font-bold text-[#c9a84c] leading-none min-w-[28px]">{f.num}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">{f.risk}</span>
                  {f.status === "attention" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                      <AlertCircle className="w-2.5 h-2.5" /> Needs attention
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 border border-green-100 text-green-700">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Live
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#0f2040]">{f.title}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">{f.description}</p>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className={cn("text-xs font-semibold", f.status === "attention" ? "text-amber-700" : "text-gray-400")}>
                {f.metric}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
