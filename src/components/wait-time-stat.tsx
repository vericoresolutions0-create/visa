import { useQuery } from "convex/react";
import { Clock } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { daysToReadable } from "@/lib/wait-time.ts";

// Public query — safe to call from any surface (agent dashboard, client
// portal, consumer checklist) without an auth check.
export function WaitTimeStat({
  destination,
  visaType,
  variant = "inline",
}: {
  destination: string;
  visaType: string;
  variant?: "inline" | "card";
}) {
  const stats = useQuery(api.waitTimeTracker.getWaitTimeStats, { destination, visaType });

  if (variant === "inline") {
    if (!stats?.hasEnoughData) return null;
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <span aria-hidden="true">&middot;</span>
        <Clock className="w-3 h-3" />
        {daysToReadable(stats.medianWaitDays)} (community)
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Clock className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estimated wait</span>
      </div>
      {stats === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : stats.hasEnoughData ? (
        <p className="text-sm text-foreground">
          Real applicants report a median of <span className="font-semibold text-accent">{daysToReadable(stats.medianWaitDays)}</span> for this route
          <span className="text-muted-foreground"> ({stats.sampleSize} reports)</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not enough community reports yet for {destination} · {visaType}.
        </p>
      )}
    </div>
  );
}
