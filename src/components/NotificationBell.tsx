import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Bell, BellRing, FileWarning, Calendar, Clock, UploadCloud, X, CheckCheck, AlertTriangle, DollarSign, Star, UserRoundCheck, UserPlus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useNavigate } from "react-router-dom";
import type { Doc } from "@/convex/_generated/dataModel.js";

type Notification = Doc<"in_app_notifications">;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notificationIcon(type: Notification["type"]) {
  if (type === "document_expiry")
    return <FileWarning className="w-4 h-4 text-amber-500 shrink-0" />;
  if (type === "trip_deadline")
    return <Calendar className="w-4 h-4 text-blue-500 shrink-0" />;
  if (type === "client_document_uploaded")
    return <UploadCloud className="w-4 h-4 text-green-500 shrink-0" />;
  if (type === "agent_trial_expiring")
    return <FileWarning className="w-4 h-4 text-amber-500 shrink-0" />;
  if (type === "agent_payment_failed")
    return <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />;
  if (type === "agent_commission_earned")
    return <DollarSign className="w-4 h-4 text-green-600 shrink-0" />;
  if (type === "agent_payout_status")
    return <DollarSign className="w-4 h-4 text-blue-500 shrink-0" />;
  if (type === "agent_review_received")
    return <Star className="w-4 h-4 text-accent shrink-0" />;
  if (type === "agent_returning_client")
    return <UserRoundCheck className="w-4 h-4 text-green-600 shrink-0" />;
  if (type === "org_member_invite_accepted")
    return <UserPlus className="w-4 h-4 text-blue-500 shrink-0" />;
  if (type === "org_member_ready")
    return <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />;
  return <Clock className="w-4 h-4 text-accent shrink-0" />;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const notifications = useQuery(api.notifications.getMyNotifications) ?? [];
  const unreadCount = useQuery(api.notifications.getUnreadCount) ?? 0;
  const markAllRead = useMutation(api.notifications.markAllRead);
  const markRead = useMutation(api.notifications.markRead);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      try {
        await markRead({ id: n._id });
      } catch {
        // Best-effort — don't block navigation on a network hiccup
      }
    }
    setOpen(false);
    if (n.linkTo) navigate(n.linkTo);
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
    } catch {
      // Silently ignore — the bell will show as read once connectivity returns
    }
  };

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border",
          hasUnread
            ? "text-primary border-accent/40 bg-accent/8 hover:bg-accent/15"
            : "text-muted-foreground border-transparent hover:text-primary hover:bg-primary/5 hover:border-primary/20",
        )}
        title="Notifications"
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ""}`}
      >
        {hasUnread ? (
          <BellRing className="w-3.5 h-3.5" />
        ) : (
          <Bell className="w-3.5 h-3.5" />
        )}
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-primary">Notifications</span>
            <div className="flex items-center gap-2">
              {hasUnread && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">You're all caught up.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => void handleNotificationClick(n)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-primary/4 transition-colors cursor-pointer",
                    !n.read && "bg-accent/5",
                  )}
                >
                  <div className="mt-0.5">{notificationIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-xs leading-snug line-clamp-2",
                        n.read ? "text-muted-foreground" : "text-primary font-semibold",
                      )}
                    >
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-1">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
          {/* Footer: link to full notifications page */}
          <div className="px-4 py-2.5 border-t border-border bg-muted/30">
            <button
              onClick={() => { setOpen(false); navigate("/dashboard/notifications"); }}
              className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
