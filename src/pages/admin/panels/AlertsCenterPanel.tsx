import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { convexErrMsg } from "@/lib/utils.ts";

type ExceptionRow = {
  _id: Id<"backend_exceptions">;
  functionName: string;
  errorMessage: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string;
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function ExceptionCard({ row }: { row: ExceptionRow }) {
  const resolveException = useMutation(api.exceptionLog.resolveException);
  const [resolving, setResolving] = useState(false);
  const isResolved = !!row.resolvedAt;

  const handleResolve = async () => {
    setResolving(true);
    try {
      await resolveException({ exceptionId: row._id });
      toast.success("Marked resolved.");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not resolve. Try again.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm ${isResolved ? "border-gray-100 opacity-70" : "border-red-200 border-l-4 border-l-red-400"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
        <span className="font-mono text-xs font-bold text-[#0f2040]">{row.functionName}</span>
        <span className={`text-[9.5px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 border ${isResolved ? "bg-gray-50 text-gray-500 border-gray-200" : "bg-red-50 text-red-600 border-red-200"}`}>
          {isResolved ? "Resolved" : `${row.occurrenceCount} occurrence${row.occurrenceCount === 1 ? "" : "s"}`}
        </span>
      </div>
      <p className="font-mono text-[11px] text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 mb-2 break-words">{row.errorMessage}</p>
      <div className="flex items-center justify-between text-[10.5px] text-gray-400">
        <span>
          {row.occurrenceCount > 1 ? `First seen ${timeAgo(row.firstSeenAt)} · Last seen ${timeAgo(row.lastSeenAt)}` : timeAgo(row.lastSeenAt)}
        </span>
        {!isResolved && (
          <button
            onClick={() => { void handleResolve(); }}
            disabled={resolving}
            className="text-[10.5px] font-semibold text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            {resolving ? "Resolving…" : "Resolve"}
          </button>
        )}
      </div>
    </div>
  );
}

export function AlertsCenterPanel() {
  const data = useQuery(api.exceptionLog.listExceptions, {});

  if (data === undefined) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  const { unresolved, recentResolved } = data;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-widest">Alerts Center</h3>
            <p className="text-xs text-gray-400 mt-0.5">Real backend failures, caught the moment they happen — currently watching Stripe and Paystack webhook processing.</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${unresolved.length > 0 ? "bg-red-50 text-red-600 border-red-200" : "bg-green-50 text-green-700 border-green-100"}`}>
            {unresolved.length} unresolved
          </span>
        </div>

        {unresolved.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            Nothing unresolved. Genuinely quiet, or nothing's happened yet — either way, nothing needs you right now.
          </div>
        ) : (
          <div className="space-y-2">
            {unresolved.map((row) => <ExceptionCard key={row._id} row={row} />)}
          </div>
        )}
      </div>

      {recentResolved.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Recently resolved</h4>
          <div className="space-y-2">
            {recentResolved.map((row) => <ExceptionCard key={row._id} row={row} />)}
          </div>
        </div>
      )}
    </div>
  );
}
