import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Sparkles, CalendarClock } from "lucide-react";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";

// ─── Trial Management Panel ────────────────────────────────────────────────────

const TRIAL_PLAN_OPTIONS = [
  { value: "agent_listing",     label: "Listing — £29/mo" },
  { value: "agent_featured",    label: "Featured — £79/mo" },
  { value: "agency_white_label", label: "White Label — £149/mo" },
] as const;

const TRIAL_DURATION_OPTIONS = [
  { value: 7,  label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
] as const;

const TRIAL_PLAN_LABELS: Record<string, string> = {
  agent_listing: "Listing",
  agent_featured: "Featured",
  agency_white_label: "White Label",
};

type TrialRecord = {
  userId: Id<"users">;
  name: string;
  email: string;
  plan: "agent_listing" | "agent_featured" | "agency_white_label";
  expiresAt: string;
  grantedAt: string | null;
  note: string | null;
  daysLeft: number;
};

export function TrialManagementPanel({ agents }: { agents: Doc<"agent_profiles">[] }) {
  const activeTrials = useQuery(api.agentTrials.adminListTrials, {}) as TrialRecord[] | undefined;
  const grantTrial = useMutation(api.agentTrials.grantTrial);
  const revokeTrial = useMutation(api.agentTrials.revokeTrial);

  const [grantTarget, setGrantTarget] = useState<Id<"users"> | null>(null);
  const [grantPlan, setGrantPlan] = useState<"agent_listing" | "agent_featured" | "agency_white_label">("agent_featured");
  const [grantDays, setGrantDays] = useState(14);
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleGrant = async () => {
    if (!grantTarget) return;
    setGranting(true);
    try {
      await grantTrial({ agentUserId: grantTarget, plan: grantPlan, durationDays: grantDays, note: grantNote || undefined });
      const name = agents.find((a) => a.userId === grantTarget)?.fullName ?? "Agent";
      toast.success(`${grantDays}-day ${TRIAL_PLAN_LABELS[grantPlan]} trial granted to ${name}.`);
      setGrantTarget(null);
      setGrantNote("");
      setGrantDays(30);
    } catch (err) {
      const msg = convexErrMsg(err) ?? "Failed.";
      toast.error(msg);
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (userId: Id<"users">, name: string) => {
    if (!window.confirm(`Revoke the active trial for ${name}? This cannot be undone.`)) return;
    setRevoking(userId);
    try {
      await revokeTrial({ agentUserId: userId });
      toast.success(`Trial revoked for ${name}.`);
    } catch (err) {
      const msg = convexErrMsg(err) ?? "Failed.";
      toast.error(msg);
    } finally {
      setRevoking(null);
    }
  };

  const targetName = agents.find((a) => a.userId === grantTarget)?.fullName ?? "Agent";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          Agent Trial Management
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Grant free trials to agents you are onboarding. Trials unlock the selected plan tier until expiry.</p>
      </div>

      {/* Grant form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Grant New Trial</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</label>
              <select
                value={grantTarget ?? ""}
                onChange={(e) => setGrantTarget(e.target.value as Id<"users"> || null)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#0f2040] focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="">Select an agent…</option>
                {agents.map((a) => (
                  <option key={a._id} value={a.userId}>
                    {a.fullName} — {a.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan Tier</label>
              <select
                value={grantPlan}
                onChange={(e) => setGrantPlan(e.target.value as typeof grantPlan)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#0f2040] focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {TRIAL_PLAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</label>
              <select
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#0f2040] focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {TRIAL_DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Note <span className="font-normal normal-case">(optional)</span></label>
            <input
              type="text"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value.slice(0, 500))}
              placeholder="e.g. Onboarding trial — referred by Luka"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#0f2040] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="flex justify-end">
            <button
              disabled={!grantTarget || granting}
              onClick={() => void handleGrant()}
              className={cn(
                "flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-colors",
                grantTarget && !granting
                  ? "bg-accent text-white hover:bg-accent/90 cursor-pointer"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {granting ? "Granting…" : grantTarget ? `Grant ${grantDays}-Day Trial to ${targetName}` : "Select an agent to grant trial"}
            </button>
          </div>
        </div>
      </div>

      {/* Active trials */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Active Trials ({activeTrials?.length ?? 0})
          </span>
        </div>
        {activeTrials === undefined ? (
          <div className="p-5 space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : activeTrials.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No active trials.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Agent</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">Plan</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">Expires</th>
                <th className="px-5 py-3 text-center">Days Left</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeTrials.map((trial) => (
                <tr key={trial.userId} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#0f2040] text-xs">{trial.name}</div>
                    <div className="text-[11px] text-gray-400">{trial.email}</div>
                    {trial.note && <div className="text-[10px] text-gray-400 mt-0.5 italic">{trial.note}</div>}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-full",
                      trial.plan === "agency_white_label"
                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                        : trial.plan === "agent_featured"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200",
                    )}>
                      {TRIAL_PLAN_LABELS[trial.plan]}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <CalendarClock className="w-3 h-3" />
                      {new Date(trial.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center text-xs font-bold px-2.5 py-1 rounded-full",
                      trial.daysLeft <= 7
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : trial.daysLeft <= 14
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-green-50 text-green-700 border border-green-100",
                    )}>
                      {trial.daysLeft}d
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      disabled={revoking === trial.userId}
                      onClick={() => void handleRevoke(trial.userId as Id<"users">, trial.name)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {revoking === trial.userId ? "Revoking…" : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
