import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { DollarSign, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";

// Added 2026-07-19: most of what VisaClear depends on (Vercel's plan tier,
// Convex's usage ceiling, the domain registrar's renewal date, Resend/Sentry
// quotas) has no API this app can read — it only exists on that vendor's own
// dashboard. Rather than fabricate a live number for those, this just gives
// the founder a place to record "I checked, here's what I saw" with a
// staleness flag so it's obvious when something hasn't been looked at in a
// while. OpenAI is the one exception with a real usage API, so that one
// section shows genuine live spend instead of a manual checklist.
const VENDOR_CHECKLIST: { key: string; label: string; what: string; url: string | null }[] = [
  {
    key: "vercel_plan",
    label: "Vercel plan",
    what: "Confirm the account is on a paid plan, not Hobby — Hobby is licensed for non-commercial projects only, regardless of traffic.",
    url: "https://vercel.com/account/billing",
  },
  {
    key: "convex_usage",
    label: "Convex usage",
    what: "Check current usage against the free/Starter tier ceiling on the dashboard's usage tab.",
    url: "https://dashboard.convex.dev",
  },
  {
    key: "domain_renewal",
    label: "Domain renewal (visaclear.app)",
    what: "Confirm the registration is on auto-renew with a valid card on file at whichever registrar it was bought through.",
    url: null,
  },
  {
    key: "resend_quota",
    label: "Resend email quota",
    what: "Check this month's email volume against the free-tier sending limit.",
    url: "https://resend.com/emails",
  },
  {
    key: "sentry_quota",
    label: "Sentry error quota",
    what: "Check this month's error-event volume against the free-tier limit.",
    url: "https://sentry.io",
  },
];

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function staleness(lastCheckedAt: string | null): { label: string; tone: "green" | "amber" | "red" } {
  if (!lastCheckedAt) return { label: "Never checked", tone: "red" };
  const days = daysSince(lastCheckedAt);
  if (days === 0) return { label: "Checked today", tone: "green" };
  if (days < 30) return { label: `Checked ${days}d ago`, tone: "green" };
  if (days < 60) return { label: `Checked ${days}d ago — worth another look`, tone: "amber" };
  return { label: `Checked ${days}d ago — overdue`, tone: "red" };
}

function OpenAiSpendCard() {
  const isConfigured = useQuery(api.vendorWatch.isOpenAiAdminConfigured, {});
  const getSpend = useAction(api.vendorWatch.getOpenAiSpendThisMonth);
  const [spend, setSpend] = useState<{ spendUsd: number; currency: string; asOf: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const result = await getSpend({});
      setSpend(result);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not fetch OpenAI spend.");
    } finally {
      setLoading(false);
    }
  };

  if (isConfigured === undefined) {
    return <Skeleton className="h-28 rounded-xl" />;
  }

  if (!isConfigured) {
    return (
      <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#0f2040]">Not connected — the vendor most likely to surprise you</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              This is the one vendor with a real spend API. To see live month-to-date cost here, generate an
              <strong> Admin API key</strong> at platform.openai.com → Settings → Organization → Admin keys
              (this is a different key from the one already powering the AI features), then set it as
              <code className="mx-1 px-1.5 py-0.5 bg-white border border-amber-200 rounded text-[11px]">OPENAI_ADMIN_KEY</code>
              in the Convex deployment's environment variables.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-100 rounded-xl p-5 bg-gradient-to-br from-[#0f2040] to-[#16294f]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-white/50">OpenAI spend this month</p>
          {spend ? (
            <>
              <p className="mt-1 text-3xl font-black text-white tabular-nums">
                ${spend.spendUsd.toFixed(2)} <span className="text-sm font-medium text-white/50">{spend.currency.toUpperCase()}</span>
              </p>
              <p className="text-[11px] text-white/50 mt-1">As of {new Date(spend.asOf).toLocaleString("en-GB")}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-white/60">Real, live cost data — not fetched yet this session.</p>
          )}
        </div>
        <button
          onClick={() => { void handleFetch(); }}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          {spend ? "Refresh" : "Fetch spend"}
        </button>
      </div>
    </div>
  );
}

function VendorCard({ item, lastCheckedAt, note }: {
  item: (typeof VENDOR_CHECKLIST)[number];
  lastCheckedAt: string | null;
  note: string | null;
}) {
  const markChecked = useMutation(api.vendorWatch.markVendorChecked);
  const [noteInput, setNoteInput] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const st = staleness(lastCheckedAt);

  const handleMarkChecked = async () => {
    setSaving(true);
    try {
      await markChecked({ vendorKey: item.key, note: noteInput || undefined });
      toast.success(`${item.label} marked as checked.`);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm text-[#0f2040]">{item.label}</span>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
              st.tone === "green" && "bg-green-50 text-green-700 border-green-200",
              st.tone === "amber" && "bg-amber-50 text-amber-700 border-amber-200",
              st.tone === "red" && "bg-red-50 text-red-600 border-red-200",
            )}>
              {st.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed max-w-md">{item.what}</p>
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#0f2040] transition-colors"
          >
            Open dashboard <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="Optional note — e.g. plan tier, renewal date"
          maxLength={500}
          className="flex-1 h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2040]/15 focus:border-[#0f2040]/30 text-gray-700 placeholder:text-gray-400"
        />
        <button
          onClick={() => { void handleMarkChecked(); }}
          disabled={saving}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0f2040] text-white hover:bg-[#0f2040]/90 transition-colors cursor-pointer disabled:opacity-60"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {saving ? "Saving…" : "Mark checked"}
        </button>
      </div>
    </div>
  );
}

export function VendorWatchPanel() {
  const checks = useQuery(api.vendorWatch.getVendorChecks, {});

  const overdueCount = checks?.filter((c) => staleness(c.lastCheckedAt).tone !== "green").length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-serif font-semibold text-[#0f2040] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#0f2040]/60" /> Vendor Watch
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Real spend where a vendor has an API for it; an honest, staleness-flagged checklist for the rest.
          </p>
        </div>
        {checks !== undefined && (
          <span className={cn(
            "text-xs font-bold px-3 py-1 rounded-full border",
            overdueCount > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-100",
          )}>
            {overdueCount > 0 ? `${overdueCount} due for a check` : "All caught up"}
          </span>
        )}
      </div>

      <OpenAiSpendCard />

      {checks === undefined ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {VENDOR_CHECKLIST.map((item) => {
            const row = checks.find((c) => c.vendorKey === item.key);
            return (
              <VendorCard
                key={item.key}
                item={item}
                lastCheckedAt={row?.lastCheckedAt ?? null}
                note={row?.note ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
