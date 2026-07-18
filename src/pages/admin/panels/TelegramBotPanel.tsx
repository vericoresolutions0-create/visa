import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CheckCircle2, AlertCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { StatCard } from "../shared.tsx";

export function TelegramBotPanel() {
  const { t } = useTranslation("admin");
  const isConfigured = useQuery(api.telegramBot.isTelegramConfigured, {});
  const stats = useQuery(api.telegramBot.getBotStats, {});
  const registerWebhook = useAction(api.telegramBot.registerWebhook);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await registerWebhook({});
      if (result.ok) {
        toast.success(t("tg.toast_connected"));
      } else {
        toast.error(result.description ?? t("tg.toast_connect_failed"));
      }
    } catch {
      toast.error(t("tg.toast_connect_error"));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-primary">{t("tg.title")}</h3>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isConfigured ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            {isConfigured === undefined ? t("tg.checking") : isConfigured ? t("tg.token_set") : t("tg.not_configured")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {t("tg.description")}
        </p>
        <Button
          size="sm"
          className="cursor-pointer"
          disabled={!isConfigured || connecting}
          onClick={() => { void handleConnect(); }}
        >
          <Send className="w-3.5 h-3.5" />
          {connecting ? t("tg.connecting") : t("tg.connect")}
        </Button>
        {!isConfigured && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Set TELEGRAM_BOT_TOKEN via <code>npx convex env set</code> first.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("tg.recent_activity")}</h3>
        {stats === undefined ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : stats.recent.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t("tg.no_questions")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Send className="w-4 h-4" />} label={t("tg.logged")} value={stats.totalLogged} />
              <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label={t("tg.match_rate")} value={`${stats.matchRate}%`} sub={t("tg.matched_count", { count: stats.matchedCount })} />
            </div>
            <div className="space-y-2">
              {stats.recent.map((entry) => (
                <div key={entry._id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                  {entry.matched ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{entry.questionText}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.matchedDestination ? t("tg.matched_detail", { destination: entry.matchedDestination, visaType: entry.matchedVisaType }) : t("tg.no_match")}
                      {" · "}{new Date(entry.createdAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
