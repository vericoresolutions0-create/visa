import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { cn } from "@/lib/utils.ts";
import {
  MousePointerClick, Users, CreditCard, TrendingUp, DollarSign,
  Clock, CheckCircle2, AlertCircle, ExternalLink, Copy, Check,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function centsToGBP(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold",
      status === "paid" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
      status === "pending" && "bg-amber-50 text-amber-700 border border-amber-200",
    )}>
      {status === "paid" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", iconBg)}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <div className="text-xl font-black text-slate-900 tracking-tight">{value}</div>
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function CreatorPortalPage() {
  useSeo({ title: "Creator Portal — VisaClear", description: "Your VisaClear creator dashboard." });
  const { token } = useParams<{ token: string }>();
  const stats = useQuery(api.creators.getPortalStats, token ? { token } : "skip");
  const [copied, setCopied] = useState(false);

  const refLink = stats ? `https://visaclear.app/ref/${stats.slug}` : "";

  const handleCopy = async () => {
    if (!refLink) return;
    try {
      await navigator.clipboard.writeText(refLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please copy the link manually.");
    }
  };

  // Read the real server-side minimum (same field the influencer portal
  // already uses) instead of a hardcoded £50 — if the backend minimum ever
  // changes, this stays correct instead of silently going stale.
  const minimumGBP = stats ? stats.minimumPayoutCents / 100 : 50;
  const pendingGBP = stats ? stats.pendingCents / 100 : 0;
  const aboveMinimum = pendingGBP >= minimumGBP;

  if (stats === undefined) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (stats === null) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm w-full shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <h1 className="text-base font-bold text-slate-900 mb-2">Portal not found</h1>
          <p className="text-sm text-slate-500">
            This portal link is invalid or has been deactivated. Contact your VisaClear account manager.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF2F7]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-lg font-black text-slate-900 tracking-tight">Creator Portal</div>
            <div className="text-sm text-slate-500">
              Welcome back, <span className="font-semibold text-slate-700">{stats.name}</span>
              {!stats.active && (
                <span className="ml-2 text-xs text-red-600 font-semibold">(account paused)</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Commission rate</div>
            <div className="text-sm font-black text-blue-700">{stats.commissionRatePercent}% recurring</div>
            <div className="text-[11px] text-slate-400">
              {stats.commissionMonths === 0 ? "unlimited — every payment, forever" : `for ${stats.commissionMonths} months per subscriber`}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Referral link */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Your referral link</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 truncate">
              {refLink}
            </div>
            <button
              onClick={() => { void handleCopy(); }}
              className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <a
              href={refLink}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Test link</span>
            </a>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Share this link anywhere. Every signup through it is permanently attributed to you.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={MousePointerClick} label="Total Clicks" value={stats.totalClicks.toLocaleString()}
            iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatCard icon={Users} label="Signups" value={stats.signupCount.toLocaleString()}
            sub={stats.totalClicks > 0 ? `${((stats.signupCount / stats.totalClicks) * 100).toFixed(1)}% conversion` : undefined}
            iconBg="bg-indigo-50" iconColor="text-indigo-600" />
          <StatCard icon={CreditCard} label="Paying Subscribers" value={stats.paidSubscriberCount.toLocaleString()}
            sub={stats.signupCount > 0 ? `${((stats.paidSubscriberCount / stats.signupCount) * 100).toFixed(1)}% of signups` : undefined}
            iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <StatCard icon={TrendingUp} label="This Month" value={centsToGBP(stats.earningsThisMonthCents)}
            iconBg="bg-amber-50" iconColor="text-amber-600" />
          <StatCard icon={DollarSign} label="Total Earned" value={centsToGBP(stats.totalCommissionCents)}
            sub={`${centsToGBP(stats.paidCents)} paid out`}
            iconBg="bg-purple-50" iconColor="text-purple-600" />
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center mb-3",
              aboveMinimum ? "bg-emerald-50" : "bg-slate-50",
            )}>
              <DollarSign className={cn("w-4 h-4", aboveMinimum ? "text-emerald-600" : "text-slate-400")} />
            </div>
            <div className={cn("text-xl font-black tracking-tight", aboveMinimum ? "text-emerald-700" : "text-slate-900")}>
              {centsToGBP(stats.pendingCents)}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Pending Payout</div>
            {!aboveMinimum && (
              <div className="text-[11px] text-slate-400 mt-0.5">
                £{(minimumGBP - pendingGBP).toFixed(2)} more to reach the £{minimumGBP} minimum
              </div>
            )}
            {aboveMinimum && (
              <a
                href={`mailto:payments@visaclear.app?subject=Payout request — ${stats.slug}&body=Hi, I'd like to request a payout of my pending balance (${centsToGBP(stats.pendingCents)}) for creator code: ${stats.slug}.`}
                className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-semibold"
              >
                Request payout →
              </a>
            )}
          </div>
        </div>

        {/* Recent commissions */}
        {stats.recentCommissions.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">Recent Commissions</span>
              <span className="ml-2 text-[11px] text-slate-400">Subscriber details are anonymised for privacy</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[420px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Month", "Plan", "Commission", "Status", "Paid on"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(stats.recentCommissions as Array<{ plan: string; billingMonth: string; commissionCents: number; status: string; paidAt?: string }>).map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{monthLabel(row.billingMonth)}</td>
                      <td className="px-4 py-2.5 text-slate-600 capitalize">{row.plan}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 tabular-nums">{centsToGBP(row.commissionCents)}</td>
                      <td className="px-4 py-2.5"><StatusChip status={row.status} /></td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {row.paidAt ? new Date(row.paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats.recentCommissions.length === 0 && (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
            <TrendingUp className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600 mb-1">No commissions yet</p>
            <p className="text-xs text-slate-400">
              Commissions appear here the month after a referred user's payment clears.
            </p>
          </div>
        )}

        {/* How it works */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-900">How commissions work</span>
          </div>
          <div className="p-5 space-y-0">
            {[
              {
                step: "1",
                title: "Someone clicks your link",
                body: "Their signup is permanently attributed to you — even if they sign up days later.",
              },
              {
                step: "2",
                title: "They upgrade to Pro or Expert",
                body: `The moment their payment clears, your ${stats.commissionRatePercent}% commission starts.`,
              },
              {
                step: "3",
                title: "You earn every month they stay subscribed",
                body: `Commissions run for up to ${stats.commissionMonths} months per subscriber. After that, the subscription is all yours to keep earning from — VisaClear simply stops sharing that revenue.`,
              },
              {
                step: "4",
                title: "Monthly payouts, £50 minimum",
                body: "We pay via PayPal or bank transfer, after the subscriber's payment clears. Request a payout when your balance hits £50.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-4 py-3 border-b border-slate-50 last:border-0">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  {step}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 pb-4">
          Questions? Email <a href="mailto:creators@visaclear.app" className="text-blue-600 hover:underline">creators@visaclear.app</a>
        </div>
      </div>
    </div>
  );
}
