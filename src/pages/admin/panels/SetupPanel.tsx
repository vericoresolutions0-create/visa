import type { ReactNode } from "react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ChevronDown, ChevronUp, Settings, Info } from "lucide-react";
import { cn } from "@/lib/utils.ts";

// ─── Setup / health-check panel ───────────────────────────────────────────────

type HealthData = {
  SITE_URL: string | null;
  RESEND_FROM_EMAIL: string | null;
  RESEND_API_KEY: boolean;
  OPENAI_API_KEY: boolean;
  STRIPE_SECRET_KEY: boolean;
  STRIPE_WEBHOOK_SECRET: boolean;
  PAYSTACK_SECRET_KEY: boolean;
  AUTH_GOOGLE_ID: boolean;
  AUTH_GOOGLE_SECRET: boolean;
  TELEGRAM_BOT_TOKEN: boolean;
  TWILIO_ACCOUNT_SID: boolean;
  TWILIO_AUTH_TOKEN: boolean;
  TWILIO_WHATSAPP_NUMBER: boolean;
} | null | undefined;

type EnvRow = {
  name: string;
  label: string;
  isSet: boolean;
  currentValue?: string | null;
  critical: boolean;
  description: string;
  howToGet: string;
  example?: string;
};

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
      ok ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", ok ? "bg-green-500" : "bg-red-500")} />
      {ok ? "Set" : "Missing"}
    </span>
  );
}

export function SetupPanel({ health }: { health: HealthData }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (health === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  const siteUrlOk = Boolean(health?.SITE_URL && !health.SITE_URL.includes("localhost"));

  const rows: EnvRow[] = [
    {
      name: "SITE_URL",
      label: "Site URL",
      isSet: siteUrlOk,
      currentValue: health?.SITE_URL,
      critical: true,
      description: "The public URL of your app. Every email link (password reset, email change, document alerts) uses this. Currently set to localhost — which means every emailed link is broken in production.",
      howToGet: "This is your Vercel deployment URL.",
      example: "https://visaclear.app",
    },
    {
      name: "RESEND_API_KEY",
      label: "Resend API Key",
      isSet: Boolean(health?.RESEND_API_KEY),
      critical: true,
      description: "Required to send any transactional emails — welcome, password reset, email change confirmation, document upload alerts, invitation emails. Without this, all emails are silently dropped.",
      howToGet: "Log into resend.com → API Keys → Create API key. Free tier allows 3,000 emails/month.",
    },
    {
      name: "RESEND_FROM_EMAIL",
      label: "Resend From Email",
      isSet: Boolean(health?.RESEND_FROM_EMAIL),
      currentValue: health?.RESEND_FROM_EMAIL,
      critical: true,
      description: "The 'From' address for all outgoing emails. Must be a verified domain or address in your Resend account.",
      howToGet: "In Resend, go to Domains → verify your domain, or use a verified single sender address.",
      example: "VisaClear <hello@visaclear.app>",
    },
    {
      name: "OPENAI_API_KEY",
      label: "OpenAI API Key",
      isSet: Boolean(health?.OPENAI_API_KEY),
      critical: true,
      description: "Powers the AI features: rejection analyser, success probability, passport photo checker, and the AI assistant. Without this, these features throw an error on every request.",
      howToGet: "Log into platform.openai.com → API Keys → Create new secret key.",
    },
    {
      name: "STRIPE_SECRET_KEY",
      label: "Stripe Secret Key",
      isSet: Boolean(health?.STRIPE_SECRET_KEY),
      critical: true,
      description: "Required to process Stripe payments. Subscription upgrades and one-time payments will fail without this.",
      howToGet: "Log into dashboard.stripe.com → Developers → API Keys → Secret key. Use the live key for production.",
    },
    {
      name: "STRIPE_WEBHOOK_SECRET",
      label: "Stripe Webhook Secret",
      isSet: Boolean(health?.STRIPE_WEBHOOK_SECRET),
      critical: true,
      description: "Verifies that webhook events from Stripe are genuine. Without this, payment confirmations are ignored and user plans are never upgraded after payment.",
      howToGet: "In Stripe: Developers → Webhooks → Add endpoint (your Convex HTTP endpoint) → Signing secret.",
    },
    {
      name: "PAYSTACK_SECRET_KEY",
      label: "Paystack Secret Key",
      isSet: Boolean(health?.PAYSTACK_SECRET_KEY),
      critical: false,
      description: "Enables Paystack as a payment option (for Nigerian/African users). Optional if you are only using Stripe.",
      howToGet: "Log into dashboard.paystack.com → Settings → API Keys → Secret Key.",
    },
    {
      name: "AUTH_GOOGLE_ID",
      label: "Google OAuth Client ID",
      isSet: Boolean(health?.AUTH_GOOGLE_ID),
      critical: false,
      description: "Required together with AUTH_GOOGLE_SECRET to enable 'Sign in with Google'. Both must be set — setting only one leaves Google login broken.",
      howToGet: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Client ID field.",
      example: "1234567890-abc123.apps.googleusercontent.com",
    },
    {
      name: "AUTH_GOOGLE_SECRET",
      label: "Google OAuth Client Secret",
      isSet: Boolean(health?.AUTH_GOOGLE_SECRET),
      critical: false,
      description: "Required together with AUTH_GOOGLE_ID to enable 'Sign in with Google'. Both must be set — the ID alone does nothing.",
      howToGet: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Client Secret field (same screen as the ID).",
    },
    {
      name: "TELEGRAM_BOT_TOKEN",
      label: "Telegram Bot Token",
      isSet: Boolean(health?.TELEGRAM_BOT_TOKEN),
      critical: false,
      description: "Powers the Telegram bot integration for notifications and user interactions.",
      howToGet: "Message @BotFather on Telegram → /newbot → copy the token it gives you.",
    },
    {
      name: "TWILIO_ACCOUNT_SID",
      label: "Twilio Account SID",
      isSet: Boolean(health?.TWILIO_ACCOUNT_SID),
      critical: false,
      description: "Required for WhatsApp messaging via Twilio. Leave unset if you are not using WhatsApp.",
      howToGet: "Log into console.twilio.com → Account Info → Account SID.",
    },
    {
      name: "TWILIO_AUTH_TOKEN",
      label: "Twilio Auth Token",
      isSet: Boolean(health?.TWILIO_AUTH_TOKEN),
      critical: false,
      description: "Twilio API authentication. Required alongside TWILIO_ACCOUNT_SID.",
      howToGet: "Same place as Account SID — it is displayed below it on the Twilio console homepage.",
    },
    {
      name: "TWILIO_WHATSAPP_NUMBER",
      label: "Twilio WhatsApp Number",
      isSet: Boolean(health?.TWILIO_WHATSAPP_NUMBER),
      critical: false,
      description: "Your Twilio WhatsApp sender number in E.164 format.",
      howToGet: "Twilio Console → Messaging → Senders → WhatsApp Senders.",
      example: "+14155238886",
    },
  ];

  const critical = rows.filter((r) => r.critical);
  const optional = rows.filter((r) => !r.critical);
  const criticalMissing = critical.filter((r) => !r.isSet).length;
  const totalMissing = rows.filter((r) => !r.isSet).length;

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className={cn(
        "rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        criticalMissing > 0
          ? "bg-red-50 border-red-200"
          : totalMissing > 0
          ? "bg-amber-50 border-amber-200"
          : "bg-green-50 border-green-200"
      )}>
        <div>
          <p className={cn(
            "font-semibold text-base",
            criticalMissing > 0 ? "text-red-800" : totalMissing > 0 ? "text-amber-800" : "text-green-800"
          )}>
            {criticalMissing > 0
              ? `${criticalMissing} critical variable${criticalMissing !== 1 ? "s" : ""} missing — core features are broken`
              : totalMissing > 0
              ? `${totalMissing} optional variable${totalMissing !== 1 ? "s" : ""} unset`
              : "All environment variables are configured"}
          </p>
          <p className={cn(
            "text-sm mt-0.5",
            criticalMissing > 0 ? "text-red-700" : totalMissing > 0 ? "text-amber-700" : "text-green-700"
          )}>
            Set variables in the Convex dashboard → Settings → Environment Variables, or via CLI:
            <code className="ml-1 bg-white/60 px-1.5 py-0.5 rounded text-xs font-mono">npx convex env set VAR_NAME value</code>
          </p>
        </div>
        <div className="shrink-0 text-center">
          <p className={cn("text-3xl font-bold tabular-nums", criticalMissing > 0 ? "text-red-700" : "text-green-700")}>
            {rows.filter((r) => r.isSet).length}/{rows.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">configured</p>
        </div>
      </div>

      {/* Critical vars */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">Critical — app is broken without these</h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {critical.map((row) => (
            <div key={row.name}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === row.name ? null : row.name)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="text-sm font-mono font-semibold text-[#0f2040]">{row.name}</code>
                    <span className="text-xs text-gray-400">{row.label}</span>
                    {row.currentValue && !row.isSet && (
                      <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                        currently: {row.currentValue}
                      </span>
                    )}
                    {row.currentValue && row.isSet && (
                      <span className="text-[10px] font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                        {row.currentValue}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusDot ok={row.isSet} />
                  {expanded === row.name ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </div>
              </button>
              {expanded === row.name && (
                <div className="px-5 pb-5 bg-gray-50/60 border-t border-gray-50">
                  <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-2">{row.description}</p>
                  <div className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl p-3 space-y-1.5">
                    <p><span className="font-semibold text-[#0f2040]">How to get it:</span> {row.howToGet}</p>
                    {row.example && (
                      <p><span className="font-semibold text-[#0f2040]">Example format:</span> <code className="font-mono text-xs">{row.example}</code></p>
                    )}
                    <p className="text-gray-400 font-mono text-[11px] mt-2 pt-2 border-t border-gray-100">
                      npx convex env set {row.name} &lt;value&gt;
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Optional vars */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 mb-3">Optional — integrations</h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {optional.map((row) => (
            <div key={row.name}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === row.name ? null : row.name)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors cursor-pointer text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="text-sm font-mono font-semibold text-[#0f2040]">{row.name}</code>
                    <span className="text-xs text-gray-400">{row.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusDot ok={row.isSet} />
                  {expanded === row.name ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </div>
              </button>
              {expanded === row.name && (
                <div className="px-5 pb-5 bg-gray-50/60 border-t border-gray-50">
                  <p className="text-sm text-gray-600 leading-relaxed mt-3 mb-2">{row.description}</p>
                  <div className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl p-3 space-y-1.5">
                    <p><span className="font-semibold text-[#0f2040]">How to get it:</span> {row.howToGet}</p>
                    {row.example && (
                      <p><span className="font-semibold text-[#0f2040]">Example format:</span> <code className="font-mono text-xs">{row.example}</code></p>
                    )}
                    <p className="text-gray-400 font-mono text-[11px] mt-2 pt-2 border-t border-gray-100">
                      npx convex env set {row.name} &lt;value&gt;
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
