import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { Doc } from "@/convex/_generated/dataModel.js";
import {
  ArrowLeft, Globe, Bell, BellRing, FileWarning, Calendar, Clock,
  CheckCheck, Filter, Lock, ChevronRight, AlertTriangle, DollarSign,
} from "lucide-react";

type Notification = Doc<"in_app_notifications">;
type FilterType = "all" | "unread" | "reminder_due" | "document_expiry" | "trip_deadline";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function notificationIcon(type: Notification["type"]) {
  if (type === "document_expiry")
    return (
      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
        <FileWarning className="w-4 h-4 text-amber-500" />
      </div>
    );
  if (type === "trip_deadline")
    return (
      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
        <Calendar className="w-4 h-4 text-blue-500" />
      </div>
    );
  if (type === "agent_trial_expiring")
    return (
      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
        <FileWarning className="w-4 h-4 text-amber-500" />
      </div>
    );
  if (type === "agent_payment_failed")
    return (
      <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
        <AlertTriangle className="w-4 h-4 text-red-500" />
      </div>
    );
  if (type === "agent_commission_earned")
    return (
      <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
        <DollarSign className="w-4 h-4 text-green-600" />
      </div>
    );
  if (type === "agent_payout_status")
    return (
      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
        <DollarSign className="w-4 h-4 text-blue-500" />
      </div>
    );
  return (
    <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
      <Clock className="w-4 h-4 text-accent" />
    </div>
  );
}

function typeLabel(type: Notification["type"]): string {
  if (type === "document_expiry") return "Document expiry";
  if (type === "trip_deadline") return "Trip deadline";
  if (type === "agent_trial_expiring") return "Trial ending";
  if (type === "agent_payment_failed") return "Payment failed";
  if (type === "agent_commission_earned") return "Commission earned";
  if (type === "agent_payout_status") return "Payout update";
  return "Reminder";
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "reminder_due", label: "Reminders" },
  { value: "document_expiry", label: "Documents" },
  { value: "trip_deadline", label: "Trips" },
];

// Demo notifications shown when user is in demo mode or has no plan access
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    _id: "n1" as Notification["_id"],
    _creationTime: Date.now() - 3600000 * 2,
    userId: "demo" as Notification["userId"],
    type: "reminder_due",
    title: "Biometric Residence Permit renewal",
    body: "Your reminder is due today. Visit the UKVI portal to begin your renewal application.",
    linkTo: "/dashboard/reminders",
    read: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: "n2" as Notification["_id"],
    _creationTime: Date.now() - 86400000,
    userId: "demo" as Notification["userId"],
    type: "document_expiry",
    title: "Passport expires in 3 months",
    body: "Your passport is due to expire on 15 Oct 2026. Renew now to avoid disruption to your immigration status.",
    linkTo: "/dashboard/vault",
    read: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: "n3" as Notification["_id"],
    _creationTime: Date.now() - 86400000 * 3,
    userId: "demo" as Notification["userId"],
    type: "trip_deadline",
    title: "Absence limit warning",
    body: "You have used 142 of your 180 absence days this year. Log all trips to keep an accurate record.",
    linkTo: "/dashboard/immigration-status",
    read: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export default function NotificationsPage() {
  useSeo({
    title: "Notification Centre — VisaClear",
    description: "Your personal notification inbox for reminders, document expiries, and trip deadline alerts.",
  });

  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
  const { isDemoAuthenticated } = useDemoAuth();

  const user = useQuery(api.users.getCurrentUser, isDemoAuthenticated ? "skip" : {});
  const notifications = useQuery(api.notifications.getMyNotifications, isDemoAuthenticated ? "skip" : {});
  const unreadCount = useQuery(api.notifications.getUnreadCount, isDemoAuthenticated ? "skip" : {});
  const markAllRead = useMutation(api.notifications.markAllRead);
  const markRead = useMutation(api.notifications.markRead);

  const loading = !isDemoAuthenticated && (notifications === undefined || user === undefined);

  const [filter, setFilter] = useState<FilterType>("all");

  const resolvedNotifications: Notification[] = isDemoAuthenticated
    ? DEMO_NOTIFICATIONS
    : (notifications ?? []);

  const resolvedUnread = isDemoAuthenticated
    ? DEMO_NOTIFICATIONS.filter((n) => !n.read).length
    : (unreadCount ?? 0);

  const filtered = resolvedNotifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  const handleNotificationClick = async (n: Notification) => {
    if (!isDemoAuthenticated && !n.read) {
      try {
        await markRead({ id: n._id });
      } catch {
        // Best-effort
      }
    }
    if (n.linkTo) navigate(n.linkTo);
  };

  const handleMarkAll = async () => {
    if (isDemoAuthenticated) { toast.info("Sign up to manage notifications."); return; }
    try {
      await markAllRead();
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Failed to mark notifications as read.");
    }
  };

  // Plan access check — mirrors convex/notifications.ts's own gate exactly
  // (isPaid(plan) || agentPlan). Previously this inferred "paid" from
  // notifications.length === 0, which is indistinguishable from "genuinely
  // paid but nothing to show yet" — a brand-new Pro subscriber with an empty
  // inbox saw "Notifications require a Pro plan" despite already being Pro.
  const PAID_PLANS = ["pro", "expert"];
  const isPaidUser = isDemoAuthenticated || Boolean(user && (PAID_PLANS.includes(user.plan ?? "free") || user.agentPlan));

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-40 bg-background/95 backdrop-blur">
          <div className="w-5 h-5 rounded bg-accent/20 animate-pulse" />
          <span className="font-semibold text-primary">Notification Centre</span>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif font-semibold text-primary">VisaClear</span>
            <span className="text-xs text-muted-foreground tracking-widest uppercase hidden sm:inline">by Vericore</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {resolvedUnread > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-muted"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <div className={cn(
            "flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg",
            resolvedUnread > 0 ? "text-primary bg-accent/10" : "text-muted-foreground",
          )}>
            {resolvedUnread > 0 ? <BellRing className="w-4 h-4 text-accent" /> : <Bell className="w-4 h-4" />}
            {resolvedUnread > 0 && <span className="text-accent">{resolvedUnread}</span>}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1 className="font-serif text-2xl font-semibold text-primary">Notification Centre</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reminders, document alerts, and trip deadline warnings — all in one place.
          </p>
        </div>

        {/* Free-plan gate — driven by the user's real plan, not an empty inbox */}
        {!isDemoAuthenticated && !isPaidUser && (
          <div className="bg-primary/4 border border-primary/20 rounded-2xl p-8 text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-5 h-5 text-primary/60" />
            </div>
            <h2 className="font-semibold text-primary mb-2">Notifications require a Pro plan</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Upgrade to Pro to get real-time alerts for reminder due dates, document expiries, and trip deadlines.
            </p>
            <button
              onClick={() => navigate("/pricing")}
              className="h-10 px-6 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              See plans <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter tabs */}
        {(resolvedNotifications.length > 0 || isDemoAuthenticated) && (
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {FILTER_OPTIONS.map((opt) => {
              const count = opt.value === "all"
                ? resolvedNotifications.length
                : opt.value === "unread"
                ? resolvedUnread
                : resolvedNotifications.filter((n) => n.type === opt.value).length;

              return (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
                    filter === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-primary hover:bg-muted/80",
                  )}
                >
                  {opt.label}
                  {count > 0 && (
                    <span className={cn(
                      "ml-1.5 text-[10px] font-bold",
                      filter === opt.value ? "text-primary-foreground/70" : "text-muted-foreground/70",
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Notification list */}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-base font-semibold text-muted-foreground">
              {filter === "unread" ? "No unread notifications" : "You're all caught up"}
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {filter === "unread"
                ? "All your notifications have been read."
                : "New alerts will appear here when reminders are due or documents are expiring."}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((n) => (
            <button
              key={n._id}
              onClick={() => void handleNotificationClick(n)}
              className={cn(
                "w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer",
                n.read
                  ? "bg-background border-border/40 hover:border-primary/30 hover:bg-primary/3"
                  : "bg-accent/5 border-accent/30 hover:border-accent/50 hover:bg-accent/8",
              )}
            >
              {notificationIcon(n.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    "text-sm leading-snug",
                    n.read ? "text-muted-foreground" : "text-primary font-semibold",
                  )}>
                    {n.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                    {typeLabel(n.type)}
                  </span>
                  {n.linkTo && (
                    <span className="text-[10px] text-accent font-semibold flex items-center gap-0.5">
                      View <ChevronRight className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" aria-label="Unread" />
              )}
            </button>
          ))}
        </div>

        {/* Footer note */}
        {resolvedNotifications.length > 0 && (
          <p className="text-center text-xs text-muted-foreground/50 mt-8">
            Showing the last {resolvedNotifications.length} notification{resolvedNotifications.length !== 1 ? "s" : ""}.
            Older notifications are automatically cleared.
          </p>
        )}
      </div>
    </div>
  );
}
