import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.js";

export function AgentReportsPanel() {
  const reports = useQuery(api.embassyData.listAgentReports, {});
  const process = useMutation(api.embassyData.processAgentReport);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleProcess = async (reportId: Id<"agent_reports">, decision: "reviewed" | "dismissed") => {
    setProcessing(reportId);
    try {
      await process({ reportId, decision });
      toast.success(decision === "reviewed" ? "Marked as reviewed." : "Report dismissed.");
    } catch {
      toast.error("Could not process report.");
    } finally {
      setProcessing(null);
    }
  };

  if (reports === undefined) return <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-serif text-xl font-semibold text-[#0f2040] mb-1">Agent Reports</h2>
      <p className="text-sm text-gray-500 mb-5">User-submitted reports about agent profiles. Review each one and take action outside the platform as needed.</p>
      {reports.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No pending reports.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report._id} className="border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-[#0f2040]">{report.reason.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Agent profile: <span className="font-mono">{report.agentProfileId}</span>
                  </p>
                  {report.details && (
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{report.details}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processing === report._id}
                    onClick={() => void handleProcess(report._id, "reviewed")}
                    className="cursor-pointer text-xs"
                  >
                    Mark reviewed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processing === report._id}
                    onClick={() => void handleProcess(report._id, "dismissed")}
                    className="cursor-pointer text-xs text-gray-400"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
