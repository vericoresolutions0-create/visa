import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Globe, Shield, Users, CheckCircle2, XCircle, AlertCircle, Settings, MessageCircle, RefreshCw, X, Lock, Sparkles, Brain, ShieldAlert, Mail } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { Tab } from "../shared.tsx";


// ─── System Health Panel ───────────────────────────────────────────────────────

const ENV_VAR_META: { key: string; label: string; category: string; optional?: boolean }[] = [
  { key: "AUTH_GOOGLE_ID",       label: "Google Sign-In ID",       category: "Auth" },
  { key: "AUTH_GOOGLE_SECRET",   label: "Google Sign-In Secret",   category: "Auth" },
  { key: "OPENAI_API_KEY",       label: "OpenAI API Key",          category: "AI" },
  { key: "RESEND_API_KEY",       label: "Resend API Key",          category: "Email" },
  { key: "RESEND_FROM_EMAIL",    label: "Resend From Address",     category: "Email" },
  { key: "SITE_URL",             label: "Site URL",                category: "Config" },
  { key: "STRIPE_SECRET_KEY",    label: "Stripe Secret Key",       category: "Payments" },
  { key: "STRIPE_PUBLISHABLE_KEY", label: "Stripe Publishable Key", category: "Payments" },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe Webhook Secret",  category: "Payments" },
  { key: "PAYSTACK_SECRET_KEY",  label: "Paystack Secret Key",     category: "Payments", optional: true },
];

const CATEGORY_ORDER = ["Auth", "AI", "Email", "Config", "Payments"];

export function SystemHealthPanel() {
  const health = useQuery(api.systemHealth.getSystemHealth, {});
  const tgConfigured  = useQuery(api.telegramBot.isTelegramConfigured, {});
  const waConfigured  = useQuery(api.whatsappBot.isWhatsAppConfigured, {});
  const navigate = useNavigate();

  if (health === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  const score = health.score;
  const scoreColor = score >= 95 ? "text-emerald-600" : score >= 80 ? "text-amber-600" : "text-red-600";
  const scoreLabel = score >= 95 ? "Production-ready" : score >= 80 ? "Needs attention" : "Action required";
  const scoreDeg = Math.round((score / 100) * 360);

  // Group env vars by category
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    vars: ENV_VAR_META.filter((v) => v.category === cat),
  }));

  const pendingAttention =
    health.pendingFlagsCount > 0 ||
    health.pendingApprovalsCount > 0 ||
    health.pendingCreatorPayoutCents > 0 ||
    health.pendingPayoutRequestsCount > 0;

  const checkedAt = new Date(health.checkedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5">

      {/* Score card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex items-center gap-5">
        {/* Conic-gradient score circle */}
        <div
          className="relative shrink-0 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `conic-gradient(${score >= 95 ? "#059669" : score >= 80 ? "#d97706" : "#dc2626"} 0deg ${scoreDeg}deg, #e5e7eb ${scoreDeg}deg 360deg)` }}
        >
          <div className="absolute w-14 h-14 rounded-full bg-white" />
          <span className={cn("relative z-10 text-lg font-black tabular-nums", scoreColor)}>{score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("text-base font-bold", scoreColor)}>{scoreLabel}</div>
          <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-relaxed">
            {score >= 95
              ? "All critical systems configured. VisaClear is fully operational."
              : "Some configuration gaps detected. See env vars below."}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Live · last checked {checkedAt} — updates automatically
          </p>
        </div>
        <div className="hidden sm:grid grid-cols-2 gap-3 shrink-0">
          {[
            { label: "Users",      value: health.platformStats.totalUsers.toLocaleString() },
            { label: "Checklists", value: health.platformStats.totalChecklists.toLocaleString() },
            { label: "Pro",        value: (health.platformStats.proUsers ?? 0).toLocaleString() },
            { label: "Expert",     value: (health.platformStats.expertUsers ?? 0).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="text-center bg-gray-50 rounded-xl px-3 py-2">
              <div className="text-sm font-black tabular-nums text-gray-800">{value}</div>
              <div className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending attention */}
      {pendingAttention && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-[10.5px] font-bold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Needs your attention
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Checklist flags", value: health.pendingFlagsCount, tab: "checklist-flags" as Tab, color: health.pendingFlagsCount > 0 ? "text-amber-700" : "text-gray-400" },
              { label: "Pending approvals", value: health.pendingApprovalsCount, tab: "approvals" as Tab, color: health.pendingApprovalsCount > 0 ? "text-amber-700" : "text-gray-400" },
              { label: "Creator payouts", value: `£${(health.pendingCreatorPayoutCents / 100).toFixed(2)}`, tab: "creators" as Tab, color: health.pendingCreatorPayoutCents > 0 ? "text-amber-700" : "text-gray-400" },
              { label: "Agent payout req.", value: health.pendingPayoutRequestsCount, tab: "agents" as Tab, color: health.pendingPayoutRequestsCount > 0 ? "text-amber-700" : "text-gray-400" },
            ].map(({ label, value, tab: targetTab, color }) => (
              <button
                key={label}
                onClick={() => navigate(`/admin?tab=${targetTab}`)}
                className="rounded-lg border border-amber-200 bg-white p-3 text-center hover:border-amber-400 transition-colors cursor-pointer"
              >
                <div className={cn("text-lg font-black tabular-nums", color)}>{value}</div>
                <div className="text-[10px] font-semibold text-gray-500 mt-0.5">{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Env vars */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Environment Variables
          </span>
          <span className="text-[10.5px] font-semibold text-muted-foreground">
            {Object.values(health.envVars).filter(Boolean).length} / {Object.values(health.envVars).length} set
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {byCategory.map(({ category, vars }) => (
            <div key={category} className="px-5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{category}</p>
              <div className="space-y-1.5">
                {vars.map(({ key, label, optional }) => {
                  const isSet = health.envVars[key];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                        isSet ? "bg-emerald-100" : optional ? "bg-amber-100" : "bg-red-100"
                      )}>
                        {isSet
                          ? <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          : <XCircle className={cn("w-3 h-3", optional ? "text-amber-500" : "text-red-500")} />
                        }
                      </div>
                      <span className="text-xs font-medium text-foreground flex-1">{label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{key}</span>
                      {optional && !isSet && (
                        <span className="text-[9.5px] font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-1.5 py-0.5">Pending</span>
                      )}
                      {!optional && !isSet && (
                        <span className="text-[9.5px] font-bold bg-red-50 text-red-600 border border-red-200 rounded-full px-1.5 py-0.5">Missing</span>
                      )}
                      {isSet && (
                        <span className="text-[9.5px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-1.5 py-0.5">Set ✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification channels */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Notification Channels
          </span>
          <span className="text-[10.5px] text-muted-foreground font-medium">Admin alerts — Telegram &amp; WhatsApp</span>
        </div>
        <div className="divide-y divide-gray-50">
          {([
            {
              label: "Telegram Bot",
              status: tgConfigured,
              tab: "telegram-bot" as Tab,
              hint: "Set TELEGRAM_BOT_TOKEN to enable",
            },
            {
              label: "WhatsApp Bot",
              status: waConfigured,
              tab: "whatsapp-bot" as Tab,
              hint: "Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_NUMBER to enable",
            },
          ] as const).map(({ label, status, tab: targetTab, hint }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3">
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                status ? "bg-emerald-50" : "bg-gray-100"
              )}>
                <MessageCircle className={cn("w-3.5 h-3.5", status ? "text-emerald-600" : "text-gray-400")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {status === undefined ? "Checking…" : status ? "Connected and active" : hint}
                </p>
              </div>
              {status === undefined ? (
                <span className="text-[9.5px] font-bold bg-gray-50 text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">…</span>
              ) : status ? (
                <span className="text-[9.5px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-1.5 py-0.5">Live ✓</span>
              ) : (
                <button
                  onClick={() => navigate(`/admin?tab=${targetTab}`)}
                  className="text-[9.5px] font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Configure →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmed solid */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Confirmed solid
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { icon: Shield,       title: "Security headers",                  desc: "CSP, X-Frame-Options, HSTS, Referrer-Policy on every response" },
            { icon: Globe,        title: "Backend on Convex cloud",           desc: "ardent-pelican-768 — independent of your laptop, always on" },
            { icon: Lock,         title: "RLS & tenant isolation",            desc: "Every mutation goes through getCurrentUserOrThrow() — no cross-user reads" },
            { icon: RefreshCw,    title: "PWA service worker v6",             desc: "Network-first HTML, cache-first assets, push notifications wired" },
            { icon: Sparkles,     title: "6 languages live",                  desc: "EN · FR · ES · PT · AR · HI — UI and all 10 blog articles fully translated" },
            { icon: Globe,        title: "iOS PWA splash screens",            desc: "13 device-specific launch images deployed — white flash on iPhone eliminated" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 px-5 py-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{desc}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Action Now — only rendered when there are real outstanding items */}
      {!health?.envVars?.PAYSTACK_SECRET_KEY && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-200">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Action Now
            </span>
          </div>
          <div className="divide-y divide-red-100/60">
            <div className="flex items-start gap-3 px-5 py-3.5">
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-900">Paystack secret key — Nigerian payments blocked</p>
                <p className="text-[11px] text-red-700/80 font-medium mt-0.5">
                  All other payment integrations are live. Nigerian card payments are gated on this key. Add <code className="bg-red-100 rounded px-0.5">PAYSTACK_SECRET_KEY</code> in the Convex Dashboard → Environment Variables when Paystack provides it.
                </p>
              </div>
              <span className="text-[9.5px] font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap shrink-0">Waiting</span>
            </div>
          </div>
        </div>
      )}

      {/* Trust & Safety — real, live counts, not a static list. Suspended/
          lead-revoked counts aren't "problems" by themselves (they mean the
          enforcement built earlier is doing its job) — shown as neutral
          info, not red alerts. */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Trust &amp; Safety
          </span>
          <span className="text-[10.5px] text-muted-foreground font-medium">Live counts</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-50">
          {[
            { label: "Suspended accounts", value: health.trustAndSafety.suspendedUsersCount, tab: "security-log" as Tab, alert: health.trustAndSafety.suspendedUsersCount > 0 },
            { label: "Lead access revoked", value: health.trustAndSafety.leadAccessRevokedCount, tab: "security-log" as Tab, alert: health.trustAndSafety.leadAccessRevokedCount > 0 },
            { label: "Critical events (7d)", value: health.trustAndSafety.recentCriticalSecurityEvents, tab: "security-log" as Tab, alert: health.trustAndSafety.recentCriticalSecurityEvents > 0 },
            { label: "Active login lockouts", value: health.trustAndSafety.activeLockouts, tab: undefined, alert: false },
          ].map(({ label, value, tab: targetTab, alert }) => (
            <button
              key={label}
              onClick={targetTab ? () => navigate(`/admin?tab=${targetTab}`) : undefined}
              disabled={!targetTab}
              className={cn(
                "text-center py-4 px-2 transition-colors",
                targetTab ? "cursor-pointer hover:bg-gray-50" : "cursor-default",
              )}
            >
              <div className={cn("text-xl font-black tabular-nums", alert ? "text-amber-600" : "text-gray-800")}>{value}</div>
              <div className="text-[10px] font-semibold text-gray-400 mt-0.5">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Email Delivery — added 2026-07-18 alongside sendEmail.ts's
          retry-and-record hardening. Unlike Trust & Safety above, an
          unresolved failure here IS a real problem (a real user's email
          never arrived after 3 retries), so it gets the same red/green
          treatment as Embassy Monitor below, not neutral info styling. */}
      <div className={cn(
        "rounded-xl border shadow-sm overflow-hidden",
        health.emailDelivery.unresolvedFailuresCount > 0 ? "border-red-200 bg-red-50/40" : "border-gray-100 bg-white",
      )}>
        <div className="px-5 py-3.5 flex items-center justify-between flex-wrap gap-2">
          <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", health.emailDelivery.unresolvedFailuresCount > 0 ? "text-red-700" : "text-gray-500")}>
            <Mail className="w-3.5 h-3.5" /> Email Delivery
          </span>
          <button
            onClick={() => navigate("/admin?tab=email-delivery")}
            className={cn(
              "text-[9.5px] font-bold border rounded-full px-2 py-0.5 cursor-pointer transition-colors",
              health.emailDelivery.unresolvedFailuresCount > 0
                ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100",
            )}
          >
            {health.emailDelivery.unresolvedFailuresCount > 0 ? "Needs a look →" : "All delivered ✓"}
          </button>
        </div>
        <p className="px-5 pb-4 text-[11px] text-muted-foreground font-medium">
          {health.emailDelivery.unresolvedFailuresCount > 0
            ? `${health.emailDelivery.unresolvedFailuresCount} email${health.emailDelivery.unresolvedFailuresCount === 1 ? "" : "s"} failed to send after 3 retries — password resets, invites, and reminders all go through this same check.`
            : "Every email sent recently either delivered or was retried successfully — nothing has silently failed."}
        </p>
      </div>

      {/* Embassy Monitor — is the weekly automated check actually still running? */}
      <div className={cn(
        "rounded-xl border shadow-sm overflow-hidden",
        health.embassyMonitor.stale ? "border-red-200 bg-red-50/40" : "border-gray-100 bg-white",
      )}>
        <div className="px-5 py-3.5 flex items-center justify-between flex-wrap gap-2">
          <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-1.5", health.embassyMonitor.stale ? "text-red-700" : "text-gray-500")}>
            <Globe className="w-3.5 h-3.5" /> Embassy Monitor
          </span>
          <button
            onClick={() => navigate("/admin?tab=embassy-monitor")}
            className={cn(
              "text-[9.5px] font-bold border rounded-full px-2 py-0.5 cursor-pointer transition-colors",
              health.embassyMonitor.stale
                ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100",
            )}
          >
            {health.embassyMonitor.stale ? "Needs a look →" : "Running on schedule ✓"}
          </button>
        </div>
        <p className="px-5 pb-4 text-[11px] text-muted-foreground font-medium">
          {health.embassyMonitor.freshCount} / {health.embassyMonitor.targetCount} destinations reported a successful check in the last 9 days.{" "}
          {health.embassyMonitor.lastCheckedAt
            ? `Most recent: ${new Date(health.embassyMonitor.lastCheckedAt).toLocaleString()}.`
            : "No check has ever run yet."}
          {health.embassyMonitor.stale && ` ${health.embassyMonitor.staleCount} destination${health.embassyMonitor.staleCount === 1 ? "" : "s"} ${health.embassyMonitor.staleCount === 1 ? "hasn't" : "haven't"} reported in over 9 days — see the list below or check the Embassy Monitor tab.`}
        </p>
        {health.embassyMonitor.stale && health.embassyMonitor.staleDestinations.length > 0 && (
          <div className="px-5 pb-4 flex flex-wrap gap-1.5">
            {health.embassyMonitor.staleDestinations.map((d) => (
              <span key={d} className="text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200 rounded-full px-2 py-0.5">{d}</span>
            ))}
            {health.embassyMonitor.staleCount > health.embassyMonitor.staleDestinations.length && (
              <span className="text-[10px] font-medium text-red-700">+{health.embassyMonitor.staleCount - health.embassyMonitor.staleDestinations.length} more</span>
            )}
          </div>
        )}
      </div>

      {/* AI Assistant quality — real thumbs-down rate over the last 7 days */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" /> AI Assistant Quality
          </span>
          <button
            onClick={() => navigate("/admin?tab=ai-feedback")}
            className="text-[9.5px] font-bold bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-2 py-0.5 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Review feedback →
          </button>
        </div>
        <p className="px-5 pb-4 text-[11px] text-muted-foreground font-medium">
          {health.aiQuality.recentFeedbackTotal === 0
            ? "No feedback recorded in the last 7 days yet."
            : `${health.aiQuality.recentFeedbackDown} of ${health.aiQuality.recentFeedbackTotal} ratings (${Math.round((health.aiQuality.recentFeedbackDown / health.aiQuality.recentFeedbackTotal) * 100)}%) were "not helpful" in the last 7 days.`}
        </p>
      </div>

    </div>
  );
}
