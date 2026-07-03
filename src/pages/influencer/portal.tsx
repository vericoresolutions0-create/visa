import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import {
  Globe, Users, TrendingUp, Banknote, Clock, CheckCircle2,
  AlertCircle, ArrowLeft, Copy,
} from "lucide-react";
import { toast } from "sonner";

function fmt(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-5 space-y-3",
      accent ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border"
    )}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", accent ? "bg-white/15" : "bg-accent/10")}>
        <Icon className={cn("w-4.5 h-4.5", accent ? "text-white" : "text-accent")} />
      </div>
      <div>
        <div className={cn("font-serif text-2xl font-semibold", accent ? "text-white" : "text-primary")}>{value}</div>
        <div className={cn("text-xs font-semibold uppercase tracking-widest mt-0.5", accent ? "text-white/60" : "text-muted-foreground")}>{label}</div>
        {sub && <div className={cn("text-xs mt-1", accent ? "text-white/70" : "text-muted-foreground")}>{sub}</div>}
      </div>
    </div>
  );
}

export default function InfluencerPortalPage() {
  useSeo({ title: "Influencer Portal — VisaClear", description: "Your VisaClear affiliate stats." });
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const stats = useQuery(api.influencers.getPortalStats, token ? { token } : "skip");

  if (stats === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-serif font-semibold text-primary">VisaClear</span>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-primary mb-2">Link not found</h1>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          This portal link is invalid or has been deactivated. Contact VisaClear if you think this is an error.
        </p>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to VisaClear
        </button>
      </div>
    );
  }

  const isAboveThreshold = stats.pendingCents >= stats.minimumPayoutCents;
  const shareUrl = `https://visaclear.vercel.app/?af=${stats.code}`;

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Your referral link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-serif font-semibold text-primary">VisaClear</span>
            <span className="text-xs text-muted-foreground tracking-widest uppercase hidden sm:inline">by Vericore</span>
          </button>
        </div>
        {!stats.active && (
          <span className="text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 px-2 py-1 rounded-full">
            Deactivated
          </span>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10 space-y-8">
        {/* Hero */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-1">Affiliate Portal</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary mb-1">
            {stats.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.commissionRate}% commission on the first month's subscription from every person who signs up through your link within {stats.attributionWindowDays} days of clicking it.
          </p>
        </div>

        {/* Referral link */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Your referral link</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2 font-mono truncate">
              {shareUrl}
            </code>
            <button
              onClick={() => { void copyShareUrl(); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer shrink-0 px-3 py-2 border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Share this link anywhere. Anyone who signs up for a paid plan within {stats.attributionWindowDays} days earns you a commission.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Signups"
            value={String(stats.signupCount)}
            sub="Total attributed"
            icon={Users}
          />
          <StatCard
            label="Paid subscribers"
            value={String(stats.paidSubscriberCount)}
            sub="Converted to paid"
            icon={TrendingUp}
          />
          <StatCard
            label="Total earned"
            value={fmt(stats.totalCommissionCents)}
            sub="Pending + paid out"
            icon={Banknote}
            accent={stats.totalCommissionCents > 0}
          />
          <StatCard
            label="Paid out"
            value={fmt(stats.paidCents)}
            sub="Already transferred"
            icon={CheckCircle2}
          />
        </div>

        {/* Pending balance */}
        <div className={cn(
          "rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
          isAboveThreshold ? "bg-green-50 border-green-200" : "bg-card border-border"
        )}>
          <div>
            <p className={cn("text-xs font-semibold uppercase tracking-widest mb-1", isAboveThreshold ? "text-green-700" : "text-muted-foreground")}>
              Pending balance
            </p>
            <p className={cn("font-serif text-3xl font-semibold", isAboveThreshold ? "text-green-700" : "text-primary")}>
              {fmt(stats.pendingCents)}
            </p>
            {!isAboveThreshold && stats.pendingCents > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Minimum payout is {fmt(stats.minimumPayoutCents)}. You need {fmt(stats.minimumPayoutCents - stats.pendingCents)} more to request a transfer.
              </p>
            )}
            {isAboveThreshold && (
              <p className="text-sm text-green-700 mt-1 font-medium">
                You're above the {fmt(stats.minimumPayoutCents)} minimum — contact VisaClear to request your payout.
              </p>
            )}
            {stats.pendingCents === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Commissions appear here once a referred user subscribes to a paid plan.
              </p>
            )}
          </div>
          {isAboveThreshold && (
            <a
              href="mailto:hello@vericore.co?subject=VisaClear affiliate payout request"
              className="shrink-0 inline-flex items-center gap-2 bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-green-800 transition-colors cursor-pointer"
            >
              Request payout
            </a>
          )}
        </div>

        {/* Recent commissions */}
        {stats.recentCommissions.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm text-primary">Recent commissions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Individual names are not shown — commissions are counted per subscriber.</p>
            </div>
            <div className="divide-y divide-border">
              {stats.recentCommissions.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      c.status === "paid" ? "bg-green-500" : "bg-amber-400"
                    )} />
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">
                        New {c.plan} subscriber
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {c.status === "paid" && c.paidAt && ` · Paid ${new Date(c.paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{fmt(c.commissionCents)}</p>
                    <p className={cn("text-xs font-semibold", c.status === "paid" ? "text-green-600" : "text-amber-600")}>
                      {c.status === "paid" ? "Paid" : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stats.recentCommissions.length === 0 && (
          <div className="border border-dashed border-border rounded-xl p-10 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No commissions yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Share your referral link. When someone signs up for a paid plan within {stats.attributionWindowDays} days, a commission will appear here.
            </p>
          </div>
        )}

        {/* How it works */}
        <div className="bg-muted/30 rounded-xl p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold text-sm text-primary uppercase tracking-widest">How commissions work</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Your link adds <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">?af={stats.code}</code> to any VisaClear URL. Anyone who clicks it gets tagged to you for {stats.attributionWindowDays} days.</p>
            <p>When a tagged person upgrades to a Pro or Expert subscription, you earn {stats.commissionRate}% of their first month's payment. That's it — no recurring cut, no complexity.</p>
            <p>Commissions go "pending" when they're logged and "paid" once VisaClear transfers the money. Payouts are processed manually above the {fmt(stats.minimumPayoutCents)} minimum.</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pb-4">
          Questions? Email <a href="mailto:hello@vericore.co" className="text-accent hover:underline">hello@vericore.co</a> · VisaClear by Vericore Ltd
        </p>
      </div>
    </div>
  );
}
