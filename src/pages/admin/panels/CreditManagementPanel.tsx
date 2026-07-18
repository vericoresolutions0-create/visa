import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Coins } from "lucide-react";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.js";

export function CreditManagementPanel() {
  const agents = useQuery(api.marketplace.adminGetAgentCredits);
  const grantCredits = useMutation(api.marketplace.adminGrantCredits);
  const [grantTarget, setGrantTarget] = useState<Id<"users"> | null>(null);
  const [grantAmount, setGrantAmount] = useState("10");
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);

  const handleGrant = async () => {
    if (!grantTarget || !grantAmount) return;
    const credits = parseInt(grantAmount, 10);
    if (isNaN(credits) || credits <= 0) { toast.error("Enter a valid credit amount."); return; }
    setGranting(true);
    try {
      const result = await grantCredits({ agentUserId: grantTarget, credits, notes: grantNote || undefined });
      toast.success(`Granted ${credits} credits. New balance: ${result.newBalance}`);
      setGrantTarget(null);
      setGrantAmount("10");
      setGrantNote("");
    } catch (err) {
      const msg = convexErrMsg(err) ?? "Failed.";
      toast.error(msg);
    } finally {
      setGranting(false);
    }
  };

  const tierLabels: Record<string, string> = {
    agent_listing: "Listing",
    agent_featured: "Featured",
    agency_white_label: "White Label",
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-widest">Credit Management</h3>
        <p className="text-xs text-gray-400 mt-0.5">View agent credit balances and grant credits manually</p>
      </div>

      {agents === undefined ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">No verified agents yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Tier</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Region</th>
                <th className="px-4 py-3 text-center">Balance</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agents.map((agent) => (
                <tr key={agent.profileId} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#0f2040] text-xs">{agent.fullName}</p>
                    <p className="text-[11px] text-gray-400">{agent.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                    {agent.tier ? tierLabels[agent.tier] ?? agent.tier : "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {agent.region ? (
                      <span className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                        agent.region === "europe"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200",
                      )}>
                        {agent.region === "europe" ? "Europe / EU" : "Global"}
                      </span>
                    ) : <span className="text-[11px] text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
                      agent.creditBalance > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-400",
                    )}>
                      <Coins className="w-3 h-3" />
                      {agent.creditBalance}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setGrantTarget(grantTarget === agent.userId ? null : agent.userId)}
                      className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                    >
                      {grantTarget === agent.userId ? "Cancel" : "Grant credits"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline grant form */}
      {grantTarget && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-[#0f2040]">
            Grant credits to: {agents?.find((a) => a.userId === grantTarget)?.fullName ?? "Agent"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Credits to grant</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Note (optional)</label>
              <input
                value={grantNote}
                onChange={(e) => setGrantNote(e.target.value)}
                placeholder="e.g. Beta onboarding"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>
          <button
            onClick={() => void handleGrant()}
            disabled={granting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0f2040] text-white hover:bg-[#0f2040]/90 transition-colors cursor-pointer disabled:opacity-60"
          >
            {granting ? (
              <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Granting…</>
            ) : (
              <><Coins className="w-3.5 h-3.5" /> Grant {grantAmount} credits</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
