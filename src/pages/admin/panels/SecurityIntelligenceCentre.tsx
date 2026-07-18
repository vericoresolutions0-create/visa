import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CheckCircle2, XCircle, ChevronDown, UserCheck, Lock, LockOpen, Info, Search, UserX } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

export function SecurityIntelligenceCentre() {
  const entries = useQuery(api.securityAudit.adminGetSecurityLog, { limit: 500 }) ?? [];
  const stats = useQuery(api.securityAudit.adminGetSecurityStats, {});
  const threatActions = useQuery(api.securityAudit.adminGetThreatActions, {}) ?? [];
  const takeAction = useMutation(api.securityAudit.adminTakeAction);

  const [filter, setFilter] = useState<"all" | "critical" | "warn" | "info" | "mitigated">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);

  const loading = entries === undefined || stats === undefined || threatActions === undefined;

  const actionsByEvent: Record<string, typeof threatActions> = {};
  for (const a of threatActions) {
    if (a.eventId) {
      if (!actionsByEvent[a.eventId]) actionsByEvent[a.eventId] = [];
      actionsByEvent[a.eventId].push(a);
    }
  }

  const isMitigated = (id: string) =>
    (actionsByEvent[id] ?? []).some((a) => a.action === "reviewed" || a.action === "dismissed");

  const filteredEntries = (entries as NonNullable<typeof entries>).filter((e) => {
    if (filter === "critical" && e.severity !== "critical") return false;
    if (filter === "warn" && e.severity !== "warn") return false;
    if (filter === "info" && e.severity !== "info") return false;
    if (filter === "mitigated" && !isMitigated(e._id)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.action.toLowerCase().includes(q) ||
        String(e.actorUserId).toLowerCase().includes(q) ||
        (e.resourceType?.toLowerCase().includes(q) ?? false) ||
        (e.metadata?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  async function act(
    eventId: (typeof entries)[number]["_id"] | undefined,
    actorUserId: (typeof entries)[number]["actorUserId"],
    action: "reviewed" | "dismissed" | "note_added" | "user_suspended" | "user_unsuspended" | "leads_revoked" | "leads_restored",
    notes?: string,
  ) {
    const key = `${String(eventId ?? "")}:${action}`;
    setActioning(key);
    try {
      await takeAction({ eventId, actorUserId, action, notes });
      const labels: Record<string, string> = {
        reviewed: "Marked reviewed",
        dismissed: "Event dismissed",
        note_added: "Note saved",
        user_suspended: "Actor suspended",
        user_unsuspended: "Actor reinstated",
        leads_revoked: "Lead access revoked",
        leads_restored: "Lead access restored",
      };
      toast.success(labels[action] ?? "Done");
      if (action === "note_added" && eventId) {
        setNoteTexts((prev) => ({ ...prev, [String(eventId)]: "" }));
      }
    } catch {
      toast.error("Action failed — please try again");
    } finally {
      setActioning(null);
    }
  }

  const sevBadge: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    warn: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  };
  const sevStripe: Record<string, string> = {
    critical: "border-l-red-500",
    warn: "border-l-amber-400",
    info: "border-l-blue-400",
  };
  const eventLabels: Record<string, string> = {
    lead_unlock: "Lead unlock",
    credits_granted: "Credits granted",
    agent_profile_create: "Agent profile created",
    fraud_signal: "Fraud signal",
    auth_failure: "Auth failure",
    forbidden_access: "Forbidden access attempt",
    suspicious_rate: "Suspicious activity rate",
  };

  const statTiles = [
    { label: "Total events", value: stats?.total ?? 0, cls: "text-[#0f2040]", bg: "bg-gray-50 border-gray-200" },
    { label: "Critical", value: stats?.critical ?? 0, cls: "text-red-700", bg: "bg-red-50 border-red-200" },
    { label: "Warnings", value: stats?.warn ?? 0, cls: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
    { label: "Info", value: stats?.info ?? 0, cls: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
    { label: "Mitigated", value: stats?.mitigated ?? 0, cls: "text-green-700", bg: "bg-green-50 border-green-200" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-[#0f2040] uppercase tracking-widest">Security Intelligence Centre</h3>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-[10px] font-bold text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Real-time threat monitoring, full audit trail, and one-click mitigation actions.</p>
        </div>
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, actors…"
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f2040]/20 w-52"
          />
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          : statTiles.map((s) => (
              <div key={s.label} className={cn("rounded-xl border p-3.5 flex flex-col gap-1", s.bg)}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{s.label}</span>
                <span className={cn("text-2xl font-bold tabular-nums", s.cls)}>{s.value}</span>
              </div>
            ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0 border-b border-gray-100">
        {(["all", "critical", "warn", "info", "mitigated"] as const).map((f) => {
          const counts: Record<string, number> = {
            all: entries.length,
            critical: stats?.critical ?? 0,
            warn: stats?.warn ?? 0,
            info: stats?.info ?? 0,
            mitigated: stats?.mitigated ?? 0,
          };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 text-xs font-semibold capitalize border-b-2 transition-colors",
                filter === f ? "border-[#0f2040] text-[#0f2040]" : "border-transparent text-gray-400 hover:text-gray-600",
              )}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          );
        })}
      </div>

      {/* Event feed */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : filteredEntries.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center text-sm text-gray-400">
          {search.trim() ? "No events match your search." : "No events in this category."}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => {
            const mitigated = isMitigated(entry._id);
            const expanded = expandedId === entry._id;
            const actionsForEvent = actionsByEvent[entry._id] ?? [];
            const note = noteTexts[entry._id] ?? "";
            let meta: Record<string, unknown> = {};
            try { meta = entry.metadata ? JSON.parse(entry.metadata) : {}; } catch { /* noop */ }

            return (
              <div
                key={entry._id}
                className={cn(
                  "border rounded-xl border-l-4 bg-white overflow-hidden transition-shadow",
                  sevStripe[entry.severity] ?? "border-l-gray-300",
                  mitigated ? "opacity-60" : "shadow-sm",
                )}
              >
                <button
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50/60 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : entry._id)}
                >
                  <span className={cn("mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", sevBadge[entry.severity] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
                    {entry.severity.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0f2040] truncate">{eventLabels[entry.action] ?? entry.action}</p>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                      actor:{String(entry.actorUserId).slice(-10)}
                      {entry.resourceType && <span className="ml-2 text-gray-300">· {entry.resourceType}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {mitigated && (
                      <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                        Mitigated
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 whitespace-nowrap hidden sm:block">
                      {new Date(entry.createdAt).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform shrink-0", expanded && "rotate-180")} />
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3 bg-gray-50/40">
                    {Object.keys(meta).length > 0 && (
                      <div className="rounded-lg bg-white border border-gray-100 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Metadata</p>
                        <div className="space-y-1">
                          {Object.entries(meta).map(([k, v]) => (
                            <div key={k} className="flex items-start gap-2 text-[11px]">
                              <span className="font-semibold text-gray-500 min-w-[80px] shrink-0">{k}</span>
                              <span className="text-gray-700 font-mono break-all">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {entry.resourceId && (
                      <p className="text-[11px] text-gray-500">
                        <span className="font-semibold">Resource:</span> {entry.resourceType} · <span className="font-mono">{entry.resourceId.slice(-12)}</span>
                      </p>
                    )}
                    {actionsForEvent.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Admin actions taken</p>
                        {actionsForEvent.map((a, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px] text-gray-600">
                            <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                            <span className="font-semibold capitalize">{a.action.replace(/_/g, " ")}</span>
                            {a.notes && <span className="text-gray-400">— {a.notes}</span>}
                            <span className="ml-auto text-gray-400 whitespace-nowrap">
                              {new Date(a.createdAt).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <textarea
                        value={note}
                        onChange={(e) => setNoteTexts((prev) => ({ ...prev, [entry._id]: e.target.value }))}
                        placeholder="Add a note about this event…"
                        rows={2}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f2040]/20 bg-white"
                      />
                      <button
                        disabled={!note.trim() || actioning !== null}
                        onClick={() => act(entry._id, entry.actorUserId, "note_added", note.trim())}
                        className="px-3 py-2 text-xs font-semibold bg-[#0f2040] text-white rounded-lg disabled:opacity-40 hover:bg-[#1a3060] transition-colors cursor-pointer"
                      >
                        Save note
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={actioning !== null}
                        onClick={() => act(entry._id, entry.actorUserId, "reviewed")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Mark reviewed
                      </button>
                      <button
                        disabled={actioning !== null}
                        onClick={() => act(entry._id, entry.actorUserId, "dismissed")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" />
                        Dismiss
                      </button>
                      <button
                        disabled={actioning !== null}
                        onClick={() => {
                          if (window.confirm(`Suspend actor …${String(entry.actorUserId).slice(-10)}? This sets their account as suspended in the database.`)) {
                            void act(entry._id, entry.actorUserId, "user_suspended");
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <UserX className="w-3 h-3" />
                        Suspend actor
                      </button>
                      <button
                        disabled={actioning !== null}
                        onClick={() => act(entry._id, entry.actorUserId, "user_unsuspended")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <UserCheck className="w-3 h-3" />
                        Reinstate actor
                      </button>
                      <button
                        disabled={actioning !== null}
                        onClick={() => {
                          if (window.confirm(`Revoke lead marketplace access for actor …${String(entry.actorUserId).slice(-10)}? They will be blocked from unlocking any new leads until restored.`)) {
                            void act(entry._id, entry.actorUserId, "leads_revoked");
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <Lock className="w-3 h-3" />
                        Revoke leads
                      </button>
                      <button
                        disabled={actioning !== null}
                        onClick={() => act(entry._id, entry.actorUserId, "leads_restored")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50/50 border border-purple-100 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <LockOpen className="w-3 h-3" />
                        Restore leads
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
