import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.js";
import type { Doc } from "@/convex/_generated/dataModel.js";

function formatPayoutDestination(payoutSetup: Doc<"users">["payoutSetup"] | null | undefined): string | null {
  if (!payoutSetup) return null;
  if (payoutSetup.method === "bank") {
    return `Bank — ${payoutSetup.bankName ?? "?"}, acct ending ${payoutSetup.accountNumberLast4 ?? "????"} · ${payoutSetup.accountName} · ${payoutSetup.country}`;
  }
  if (payoutSetup.method === "mobile_money") {
    return `Mobile money — ${payoutSetup.mobileMoneyProvider ?? "?"}, ending ${payoutSetup.mobileMoneyLast4 ?? "????"} · ${payoutSetup.accountName} · ${payoutSetup.country}`;
  }
  return `PayPal — ${payoutSetup.paypalEmail ?? "?"}`;
}

export function PayoutRequestsAdminPanel() {
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
              {formatPayoutDestination(req.payoutSetup) ? (
                <p className="text-xs font-semibold text-[#0f2040] mb-2 leading-relaxed bg-white/60 rounded-lg px-3 py-2">
                  {formatPayoutDestination(req.payoutSetup)}
                </p>
              ) : (
                <p className="text-xs font-semibold text-red-700 mb-2 leading-relaxed bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  No payout method on file — contact the agent before marking paid.
                </p>
              )}
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
                    disabled={processingId === req._id || !formatPayoutDestination(req.payoutSetup)}
                    onClick={() => { void handleProcess(req._id, "paid"); }}
                    title={formatPayoutDestination(req.payoutSetup) ? undefined : "No payout method on file for this agent"}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
