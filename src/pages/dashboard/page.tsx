import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { canUseMultiTripManager, canUseSuccessProbabilityScore, canUseDocumentVault } from "@/lib/plan-gates.ts";
import { type VisaType } from "@/lib/visa-data.ts";
import { getLocalizedChecklist, ensureChecklistLanguageLoaded } from "@/lib/visa-data-i18n.ts";
import { SettleInToolkit } from "@/pages/dashboard/trips/settle-in-toolkit.tsx";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import { useTranslation } from "react-i18next";
import {
  Globe,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Trash2,
  Plus,
  Bell,
  FileText,
  Shield,
  Users,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Camera,
  TrendingUp,
  LogIn,
  Star,
  LogOut,
  Calendar,
  X,
  Settings,
  ArchiveRestore,
  StickyNote,
  Sparkles,
  Award,
  Home,
  MapPin,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";

const DEST_FLAGS = DESTINATION_FLAGS;

const DEMO_USER_ID = "demo_user" as Id<"users">;
const DEMO_CHECKLISTS = [
  {
    _id: "demo_checklist_uk" as Id<"saved_checklists">,
    _creationTime: Date.now(),
    userId: DEMO_USER_ID,
    origin: "Nigeria",
    destination: "United Kingdom",
    visaType: "student",
    checkedItems: ["passport", "bank-statements", "cas"],
    title: "UK Student Visa Checklist",
    progress: 68,
    savedAt: new Date().toISOString(),
  },
  {
    _id: "demo_checklist_ca" as Id<"saved_checklists">,
    _creationTime: Date.now(),
    userId: DEMO_USER_ID,
    origin: "Ghana",
    destination: "Canada",
    visaType: "tourist",
    checkedItems: ["passport", "invitation-letter"],
    title: "Canada Visitor Visa Checklist",
    progress: 100,
    savedAt: new Date().toISOString(),
    status: "approved",
    settleInCheckedItems: ["ca-bank-1"],
    settleInProgress: 20,
  },
] satisfies Doc<"saved_checklists">[];

const DEMO_REMINDERS = [
  {
    _id: "demo_reminder_biometrics" as Id<"reminders">,
    _creationTime: Date.now(),
    userId: DEMO_USER_ID,
    checklistId: DEMO_CHECKLISTS[0]._id,
    title: "Book biometric appointment",
    note: "Use the VAC portal and keep the appointment receipt.",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    email: "demo@visaclear.local",
    sent: false,
    createdAt: new Date().toISOString(),
  },
] satisfies Doc<"reminders">[];

// ─── Trip Timeline ─────────────────────────────────────────────────────────────
const TRIP_TIMELINE_KEY = "vc_trip_date";

function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function TripTimeline() {
  const stored =
    typeof window !== "undefined"
      ? localStorage.getItem(TRIP_TIMELINE_KEY)
      : null;
  const [appointmentDate, setAppointmentDate] = useState<string>(stored ?? "");
  const [editing, setEditing] = useState(false);
  const [inputDate, setInputDate] = useState(stored ?? "");

  const save = () => {
    if (!inputDate) return;
    localStorage.setItem(TRIP_TIMELINE_KEY, inputDate);
    setAppointmentDate(inputDate);
    setEditing(false);
    toast.success("Trip date saved. Your countdown is ready.");
  };

  const clear = () => {
    localStorage.removeItem(TRIP_TIMELINE_KEY);
    setAppointmentDate("");
    setInputDate("");
    setEditing(false);
  };

  const days = appointmentDate ? getDaysUntil(appointmentDate) : null;

  const milestones = [
    {
      days: 90,
      label: "Start gathering documents",
      done: days !== null && days <= 90,
    },
    {
      days: 60,
      label: "Submit visa application",
      done: days !== null && days <= 60,
    },
    {
      days: 30,
      label: "Final document check",
      done: days !== null && days <= 30,
    },
    {
      days: 14,
      label: "Confirm biometric appointment",
      done: days !== null && days <= 14,
    },
    { days: 0, label: "Travel day", done: days !== null && days <= 0 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
          Trip Timeline
        </h3>
        {appointmentDate ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setInputDate(appointmentDate);
                setEditing(true);
              }}
              className="text-xs text-primary font-medium hover:underline cursor-pointer"
            >
              Edit date
            </button>
            <button
              onClick={clear}
              className="p-1 rounded hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : null}
      </div>

      {!appointmentDate && !editing ? (
        <div className="border border-dashed border-border rounded-xl p-6 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">
            No trip date set
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Set your appointment date and get countdown milestones at 90, 60,
            30, and 14 days out
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setEditing(true)}
          >
            Set Trip Date
          </Button>
        </div>
      ) : editing ? (
        <div className="bg-card border border-border rounded-xl p-5">
          <label className="block text-xs font-semibold text-foreground mb-2">
            Appointment / Travel Date
          </label>
          <input
            type="date"
            value={inputDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setInputDate(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring mb-3"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={save}
              disabled={!inputDate}
              className="cursor-pointer"
            >
              Save Date
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold text-foreground">
                {days !== null && days > 0
                  ? `${days} days to go`
                  : days === 0
                    ? "Travel day is today!"
                    : "Trip date has passed"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(appointmentDate).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {milestones.map((m) => (
              <div key={m.days} className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    m.done
                      ? "bg-accent border-accent"
                      : "border-border bg-background",
                  )}
                >
                  {m.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs",
                      m.done
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {m.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      m.done
                        ? "bg-accent/10 text-accent"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {m.days === 0 ? "Day 0" : `${m.days} days before`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reminder Modal ───────────────────────────────────────────────────────────
function ReminderModal({
  email,
  checklistId,
  demoMode = false,
  onDemoSave,
  onClose,
}: {
  email: string;
  checklistId?: Doc<"saved_checklists">["_id"];
  demoMode?: boolean;
  onDemoSave?: (reminder: {
    title: string;
    note?: string;
    dueDate: string;
    email: string;
    checklistId?: Doc<"saved_checklists">["_id"];
  }) => void;
  onClose: () => void;
}) {
  const createReminder = useMutation(api.reminders.createReminder);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reminderEmail, setReminderEmail] = useState(email);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title || !dueDate || !reminderEmail) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (demoMode) {
      onDemoSave?.({
        title,
        note: note || undefined,
        dueDate,
        email: reminderEmail,
        checklistId,
      });
      toast.success("Demo reminder saved for this session.");
      onClose();
      return;
    }
    setSaving(true);
    try {
      await createReminder({
        title,
        note: note || undefined,
        dueDate,
        email: reminderEmail,
        checklistId,
      });
      toast.success("Reminder set successfully");
      onClose();
    } catch {
      toast.error("Failed to create reminder");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl"
      >
        <h3 className="font-serif text-xl font-semibold text-primary mb-1">
          Set Reminder
        </h3>
        <p className="text-xs text-muted-foreground mb-5">
          We will notify you by email on the due date.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Reminder Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Biometric appointment booking"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Email for alert *
            </label>
            <input
              type="email"
              value={reminderEmail}
              onChange={(e) => setReminderEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Any extra details..."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button
            variant="secondary"
            className="flex-1 cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 cursor-pointer"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving}
          >
            {saving ? "Saving…" : "Set Reminder"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

type DashboardView = "overview" | "checklists" | "timeline" | "reminders";

function DashboardPageLinks({ current }: { current: DashboardView }) {
  const navigate = useNavigate();
  const pages = [
    {
      id: "overview",
      icon: <Shield className="w-4 h-4" />,
      label: "Dashboard Home",
      path: "/dashboard",
    },
    {
      id: "checklists",
      icon: <FileText className="w-4 h-4" />,
      label: "Saved Checklists",
      path: "/dashboard/checklists",
    },
    {
      id: "timeline",
      icon: <Calendar className="w-4 h-4" />,
      label: "Trip Timeline",
      path: "/dashboard/timeline",
    },
    {
      id: "reminders",
      icon: <Bell className="w-4 h-4" />,
      label: "Reminders",
      path: "/dashboard/reminders",
    },
    {
      id: "settings",
      icon: <Settings className="w-4 h-4" />,
      label: "Profile Settings",
      path: "/settings/profile",
    },
  ];

  return (
    <div>
      <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">
        Dashboard Pages
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {pages.map((page) => (
          <button
            key={page.path}
            onClick={() => navigate(page.path)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl border bg-card transition-all cursor-pointer min-h-24",
              current === page.id
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border hover:border-primary/30 hover:bg-primary/3 text-foreground",
            )}
          >
            <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-primary">
              {page.icon}
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              {page.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Inner dashboard (authenticated) ─────────────────────────────────────────
function DashboardInner({ view = "overview" }: { view?: DashboardView }) {
  const navigate = useNavigate();
  const { isDemoAuthenticated, user: demoUser } = useDemoAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isDemoAuthenticated ? "skip" : {},
  );
  const checklists = useQuery(
    api.checklists.getSavedChecklists,
    isDemoAuthenticated ? "skip" : {},
  );
  const reminders = useQuery(
    api.reminders.getReminders,
    isDemoAuthenticated ? "skip" : {},
  );
  const travelHealth = useQuery(
    api.dashboardInsights.getTravelHealth,
    isDemoAuthenticated ? "skip" : {},
  );
  const vaultDocs = useQuery(
    api.vault.listMyDocuments,
    isDemoAuthenticated ? "skip" : {},
  );
  const [zone3Tab, setZone3Tab] = useState<"vault" | "reminders">("vault");
  const deleteChecklist = useMutation(api.checklists.deleteChecklist);
  const deleteReminder = useMutation(api.reminders.deleteReminder);
  const [demoChecklists, setDemoChecklists] =
    useState<Doc<"saved_checklists">[]>(DEMO_CHECKLISTS);
  const [demoReminders, setDemoReminders] =
    useState<Doc<"reminders">[]>(DEMO_REMINDERS);
  const [reminderModal, setReminderModal] = useState<{
    checklistId?: Doc<"saved_checklists">["_id"];
  } | null>(null);

  const handleDeleteChecklist = async (id: Doc<"saved_checklists">["_id"]) => {
    if (isDemoAuthenticated) {
      setDemoChecklists((items) => items.filter((item) => item._id !== id));
      setDemoReminders((items) =>
        items.filter((item) => item.checklistId !== id),
      );
      toast.success("Demo checklist deleted.");
      return;
    }

    try {
      await deleteChecklist({ id });
      toast.success("Checklist deleted");
    } catch {
      toast.error("Failed to delete checklist");
    }
  };

  const handleDeleteReminder = async (id: Doc<"reminders">["_id"]) => {
    if (isDemoAuthenticated) {
      setDemoReminders((items) => items.filter((item) => item._id !== id));
      toast.success("Demo reminder deleted.");
      return;
    }

    try {
      await deleteReminder({ id });
      toast.success("Reminder deleted");
    } catch {
      toast.error("Failed to delete reminder");
    }
  };

  const isLoading =
    !isDemoAuthenticated &&
    (user === undefined || checklists === undefined || reminders === undefined);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const dashboardUser = demoUser ?? user;
  const visibleChecklists = isDemoAuthenticated
    ? demoChecklists
    : (checklists ?? []);
  const visibleReminders = isDemoAuthenticated
    ? demoReminders
    : (reminders ?? []);
  const tripsByUrgency = [...visibleChecklists]
    .filter((cl) => !cl.archived)
    .sort((a, b) => {
      if (a.travelDate && b.travelDate) return a.travelDate.localeCompare(b.travelDate);
      if (a.travelDate) return -1;
      if (b.travelDate) return 1;
      return a.progress - b.progress;
    });
  const plan = dashboardUser?.plan ?? "free";
  const planLabel =
    plan === "expert" ? "Expert" : plan === "pro" ? "Pro" : "Free";
  const upcomingReminders = visibleReminders.filter(
    (r) => new Date(r.dueDate) >= new Date(),
  );
  const overdueReminders = visibleReminders.filter(
    (r) => new Date(r.dueDate) < new Date() && !r.sent,
  );
  const showOverview = view === "overview";

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      {showOverview && (
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary via-primary to-primary/90 p-6 text-primary-foreground shadow-xl shadow-primary/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] tracking-[0.28em] uppercase font-semibold mb-2 text-accent/90">
                Your Account
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-1">
                Welcome back
                {dashboardUser?.name
                  ? `, ${dashboardUser.name.split(" ")[0]}`
                  : ""}
              </h2>
              <p className="text-primary-foreground/75 text-sm truncate">
                {dashboardUser?.email}
              </p>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-primary-foreground shadow-sm">
                <Star className="w-3 h-3 shrink-0 text-accent" />
                {planLabel}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              {
                icon: <FileText className="w-3.5 h-3.5" />,
                val: visibleChecklists.length,
                label: "Saved",
              },
              {
                icon: <Bell className="w-3.5 h-3.5" />,
                val: upcomingReminders.length,
                label: "Reminders",
              },
              {
                icon: <AlertCircle className="w-3.5 h-3.5" />,
                val: overdueReminders.length,
                label: "Overdue",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/8 p-3 shadow-sm backdrop-blur-sm">
                <div
                  className="flex items-center gap-1.5 mb-1"
                  style={{ color: "oklch(0.72 0.13 80)" }}
                >
                  {s.icon}
                  <span className="text-[10px] uppercase tracking-wide text-primary-foreground/50">
                    {s.label}
                  </span>
                </div>
                <div className="text-xl font-bold text-primary-foreground">
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* Travel Health Score — Pro/Expert only, computed from real data */}
          {travelHealth && travelHealth !== "locked" && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wide text-primary-foreground/50">
                  Travel Health Score
                </span>
                <span className="text-2xl font-bold" style={{ color: "oklch(0.72 0.13 80)" }}>
                  {travelHealth.score}
                  <span className="text-xs text-primary-foreground/50">/100</span>
                </span>
              </div>
              {travelHealth.actions.length > 0 ? (
                <ul className="space-y-1">
                  {travelHealth.actions.map((a, i) => (
                    <li key={i} className="text-xs text-primary-foreground/80 flex items-start gap-1.5">
                      <span className={a.tone === "red" ? "text-red-300" : "text-accent"}>●</span>
                      {a.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-primary-foreground/70">Everything is in order. No urgent action needed.</p>
              )}
            </div>
          )}
          {travelHealth === "locked" && (
            <button
              onClick={() => navigate("/pricing")}
              className="mt-4 w-full rounded-2xl border border-accent/30 bg-white/8 p-4 text-left hover:bg-white/12 transition-colors cursor-pointer"
            >
              <span className="text-xs font-semibold text-accent">
                Upgrade to Pro to see your Travel Health Score →
              </span>
              <p className="text-[11px] text-primary-foreground/60 mt-1">
                Tracks document expiries, overdue reminders, and incomplete trips in one number.
              </p>
            </button>
          )}
        </div>
      )}

      <DashboardPageLinks current={view} />

      {/* Quick actions */}
      {showOverview && (
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: <Plus className="w-4 h-4" />,
                label: "New Checklist",
                path: "/checklist",
              },
              {
                icon: <Globe className="w-4 h-4" />,
                label: "Immigration Status",
                path: "/dashboard/immigration-status",
              },
              {
                icon: <MapPin className="w-4 h-4" />,
                label: "European Tracker",
                path: "/dashboard/european-tracker",
              },
              {
                icon: <Bell className="w-4 h-4" />,
                label: "Notifications",
                path: "/dashboard/notifications",
              },
              {
                icon: <StickyNote className="w-4 h-4" />,
                label: "Document Vault",
                path: "/dashboard/vault",
              },
              {
                icon: <Bell className="w-4 h-4" />,
                label: "Country Watch",
                path: "/dashboard/country-watch",
              },
              {
                icon: <Home className="w-4 h-4" />,
                label: "Family & Household",
                path: "/dashboard/household",
              },
              {
                icon: <AlertCircle className="w-4 h-4" />,
                label: "Rejection Analyser",
                path: "/rejection-analyser",
              },
              {
                icon: <TrendingUp className="w-4 h-4" />,
                label: "Risk Score",
                path: "/risk-score",
              },
              {
                icon: <Award className="w-4 h-4" />,
                label: "Wall of Fame",
                path: "/wall-of-fame",
              },
              {
                icon: <Clock className="w-4 h-4" />,
                label: "Wait Times",
                path: "/wait-times",
              },
              {
                icon: <Camera className="w-4 h-4" />,
                label: "Photo Checker",
                path: "/passport-photo",
              },
              {
                icon: <Users className="w-4 h-4" />,
                label: "Find an Agent",
                path: "/agents",
              },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary/35 hover:-translate-y-0.5 hover:bg-primary/5 transition-all cursor-pointer shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-primary">
                  {a.icon}
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zone 2 — My Trips, ordered by urgency, horizontal scroll */}
      {showOverview && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
              My Trips
            </h3>
            <button
              onClick={() => navigate("/dashboard/checklists")}
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {tripsByUrgency.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:flex sm:overflow-x-auto sm:pb-1 sm:-mx-1 sm:px-1 sm:snap-x">
              {tripsByUrgency.map((cl) => {
                const needsAttention = cl.progress < 100;
                return (
                  <button
                    key={cl._id}
                    onClick={() => navigate(`/dashboard/trips/${cl._id}`)}
                    className={cn(
                      "sm:snap-start sm:shrink-0 sm:w-60 w-full text-left rounded-2xl border p-4 shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer bg-card",
                      needsAttention ? "border-accent/40 shadow-accent/10" : "border-border",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{DEST_FLAGS[cl.destination] ?? "🌍"}</span>
                      <span className="font-semibold text-sm text-foreground truncate flex-1">
                        {cl.tripName || cl.title}
                      </span>
                    </div>
                    {cl.travelDate ? (
                      <div className="text-xs text-muted-foreground mb-2">
                        Travel {new Date(cl.travelDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground/60 mb-2 italic">No travel date set</div>
                    )}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", needsAttention ? "bg-accent" : "bg-green-500")}
                        style={{ width: `${cl.progress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      {needsAttention && <AlertTriangle className="w-3 h-3 text-accent" />}
                      {cl.progress}% complete
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl p-6 text-center">
              <Globe className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No trips yet</p>
              <p className="text-xs text-muted-foreground mb-4">Start a checklist and it becomes a trip you can track here.</p>
              <Button size="sm" className="cursor-pointer" onClick={() => navigate("/checklist")}>
                Start a Checklist
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Zone 3 — My Vault & Reminders, tabbed */}
      {showOverview && (
        <div>
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 mb-3 w-fit">
            {(["vault", "reminders"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setZone3Tab(t)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer",
                  zone3Tab === t ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "vault" ? "My Vault" : "Reminders"}
              </button>
            ))}
          </div>

          {zone3Tab === "vault" ? (
            !canUseDocumentVault(plan) ? (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-3">
                <Shield className="w-5 h-5 text-accent shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Upload once, keep forever.{" "}
                    <button onClick={() => navigate("/pricing")} className="text-primary font-semibold hover:underline cursor-pointer">
                      Upgrade to Pro
                    </button>{" "}
                    to unlock your Document Vault.
                  </p>
                </div>
              </div>
            ) : (vaultDocs ?? []).length > 0 ? (
              <div className="space-y-2">
                {(vaultDocs ?? []).slice(0, 5).map((doc) => {
                  const days = doc.expiryDate
                    ? Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  const expiring = days !== null && days <= 90;
                  return (
                    <div key={doc._id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{doc.label}</div>
                        <div className="text-xs text-muted-foreground capitalize">{doc.category}</div>
                      </div>
                      {expiring && (
                        <span className={cn(
                          "text-[11px] font-semibold px-2 py-1 rounded-full shrink-0",
                          days! < 0 || days! <= 30 ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600",
                        )}>
                          {days! < 0 ? "Expired" : `${days}d left`}
                        </span>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => navigate("/dashboard/vault")}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer"
                >
                  Open full vault →
                </button>
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-xl p-6 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">Your vault is empty</p>
                <p className="text-xs text-muted-foreground mb-4">Upload your passport, bank statement, or any document once and reuse it forever.</p>
                <Button size="sm" className="cursor-pointer" onClick={() => navigate("/dashboard/vault")}>
                  Add a document
                </Button>
              </div>
            )
          ) : upcomingReminders.length > 0 ? (
            <div className="space-y-2">
              {upcomingReminders.slice(0, 5).map((r) => (
                <div key={r._id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <Bell className="w-4 h-4 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => navigate("/dashboard/reminders")}
                className="text-xs text-primary font-medium hover:underline cursor-pointer"
              >
                View all reminders →
              </button>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl p-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No upcoming reminders</p>
              <p className="text-xs text-muted-foreground mb-4">Never miss a biometric appointment or document expiry.</p>
              <Button size="sm" variant="secondary" className="cursor-pointer" onClick={() => setReminderModal({})}>
                Add Reminder
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Saved Checklists */}
      {view === "checklists" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
              Saved Checklists
            </h3>
            <button
              onClick={() => navigate("/checklist")}
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          {visibleChecklists.length > 0 ? (
            <div className="space-y-2.5">
              {visibleChecklists.map((cl) => (
                <div
                  key={cl._id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/25 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">
                      {DEST_FLAGS[cl.destination] ?? "🌍"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {cl.tripName || cl.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {cl.origin} → {cl.destination} · {cl.visaType}
                        {cl.status && cl.status !== "planning" ? (
                          <span className="ml-1.5 normal-case font-semibold text-accent">
                            · {cl.status.replace("_", " ")}
                          </span>
                        ) : null}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${cl.progress}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {cl.progress}% complete
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => navigate(`/dashboard/trips/${cl._id}`)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Trip workspace"
                      >
                        <StickyNote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setReminderModal({ checklistId: cl._id })
                        }
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Set reminder"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          navigate(
                            `/checklist?from=${encodeURIComponent(cl.origin)}&to=${encodeURIComponent(cl.destination)}&type=${cl.visaType}`,
                          )
                        }
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Continue checklist"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          void handleDeleteChecklist(cl._id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No saved checklists yet
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Generate a checklist and save your progress
              </p>
              <Button
                size="sm"
                className="cursor-pointer"
                onClick={() => navigate("/checklist")}
              >
                Start a Checklist
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Trip Timeline */}
      {(showOverview || view === "timeline") && <TripTimeline />}

      {/* Reminders */}
      {view === "reminders" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
              Reminders
            </h3>
            <button
              onClick={() => setReminderModal({})}
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {visibleReminders.length > 0 ? (
            <div className="space-y-2.5">
              {visibleReminders.map((r) => {
                const isOverdue = new Date(r.dueDate) < new Date() && !r.sent;
                return (
                  <div
                    key={r._id}
                    className={cn(
                      "rounded-2xl border p-4 flex items-start gap-3 shadow-sm hover:border-primary/25 transition-all",
                      isOverdue
                        ? "border-red-200 bg-red-50/50"
                        : "border-border",
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        isOverdue ? "bg-red-100" : "bg-accent/10",
                      )}
                    >
                      <Bell
                        className={cn(
                          "w-4 h-4",
                          isOverdue ? "text-red-500" : "text-accent",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground">
                        {r.title}
                      </div>
                      {r.note && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {r.note}
                        </div>
                      )}
                      <div
                        className={cn(
                          "text-xs mt-1 font-medium",
                          isOverdue ? "text-red-500" : "text-muted-foreground",
                        )}
                      >
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(r.dueDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        {isOverdue && " · OVERDUE"}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        void handleDeleteReminder(r._id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl p-6 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No reminders set
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Never miss a biometric appointment or document expiry
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setReminderModal({})}
              >
                Add Reminder
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upgrade card (free plan) */}
      {showOverview && plan === "free" && (
        <div className="bg-gradient-to-br from-primary/8 to-accent/8 border border-primary/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-primary">
              Upgrade to Pro
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Unlock AI Rejection Analyser, unlimited checklists, deadline
            reminders, PDF exports, and passport photo checking.
          </p>
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={() => navigate("/pricing")}
          >
            See Pro Plans <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Reminder modal */}
      <AnimatePresence>
        {reminderModal !== null && (
          <ReminderModal
            email={dashboardUser?.email ?? ""}
            checklistId={reminderModal.checklistId}
            demoMode={isDemoAuthenticated}
            onDemoSave={(reminder) => {
              setDemoReminders((items) => [
                {
                  _id: `demo_reminder_${Date.now()}` as Id<"reminders">,
                  _creationTime: Date.now(),
                  userId: DEMO_USER_ID,
                  checklistId: reminder.checklistId,
                  title: reminder.title,
                  note: reminder.note,
                  dueDate: reminder.dueDate,
                  email: reminder.email,
                  sent: false,
                  createdAt: new Date().toISOString(),
                },
                ...items,
              ]);
            }}
            onClose={() => setReminderModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DashboardShell({
  children,
  title = "My Dashboard",
}: {
  children: ReactNode;
  title?: string;
}) {
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const { isDemoAuthenticated, user: demoUser, signOut } = useDemoAuth();
  const { isAuthenticated, signOut: signOutReal } = useAuth();
  // Real, Convex-authenticated users must be able to reach their own
  // dashboard, not just demo-mode sessions — this gate previously checked
  // isDemoAuthenticated only, which would have locked every real signed-in
  // user out of their own account.
  const canAccessDashboard = isDemoAuthenticated || isAuthenticated;
  const shellUser = useQuery(api.users.getCurrentUser, isDemoAuthenticated ? "skip" : {});
  const shellPlan = isDemoAuthenticated ? (demoUser?.plan ?? "expert") : (shellUser?.plan ?? "free");
  const showNotificationBell = shellPlan === "pro" || shellPlan === "expert";

  const handleSignOut = async () => {
    if (isAuthenticated) {
      await signOutReal();
      navigate("/");
      return;
    }
    signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">
                  VisaClear
                </span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">
                  by Vericore
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Shield className="w-3.5 h-3.5 text-accent" />
              {title}
            </div>
            {canAccessDashboard ? (
              <>
                {showNotificationBell && <NotificationBell />}
                <button
                  onClick={() => navigate("/settings/profile")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                  title="Profile settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
                <button
                  onClick={() => { void handleSignOut(); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {!canAccessDashboard ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">
              Sign In to Continue
            </h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Your dashboard, saved checklists, reminders, and application
              history are all in one place.
            </p>
            <div className="max-w-sm mx-auto">
              <AuthAccessPanel returnPath="/dashboard" />
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">
          &ldquo;It&apos;s all about Privacy.&rdquo;
        </p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Vericore Ltd. · VisaClear is a
          guidance tool, not legal advice.
        </p>
      </footer>
    </div>
  );
}

// ─── Trip Workspace (Multi-Trip Manager detail view) ─────────────────────────
const TRIP_STATUS_OPTIONS: {
  value: NonNullable<Doc<"saved_checklists">["status"]>;
  label: string;
}[] = [
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function TripWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDemoAuthenticated, user: demoUser } = useDemoAuth();
  const realTrip = useQuery(
    api.checklists.getTrip,
    !isDemoAuthenticated && id ? { id } : "skip",
  );
  const translateCountry = useCountryName();
  const { i18n } = useTranslation();
  const [, setI18nTick] = useState(0);
  useEffect(() => {
    ensureChecklistLanguageLoaded(i18n.language).then(() => setI18nTick((n) => n + 1));
  }, [i18n.language]);
  const user = useQuery(api.users.getCurrentUser, isDemoAuthenticated ? "skip" : {});
  const reminders = useQuery(api.reminders.getReminders, isDemoAuthenticated ? "skip" : {});
  const updateTripDetails = useMutation(api.checklists.updateTripDetails);
  const setTripArchived = useMutation(api.checklists.setTripArchived);
  const updateSettleInProgress = useMutation(api.checklists.updateSettleInProgress);
  const estimateSuccessProbability = useAction(api.ai.successProbability.estimateSuccessProbability);

  const [demoChecklists, setDemoChecklists] = useState<Doc<"saved_checklists">[]>(DEMO_CHECKLISTS);
  const effectiveTrip = isDemoAuthenticated ? (demoChecklists.find((c) => c._id === id) ?? null) : realTrip;

  const plan = isDemoAuthenticated ? (demoUser?.plan ?? "expert") : (user?.plan ?? "free");
  const canManage = canUseMultiTripManager(plan);
  const canUseScore = canUseSuccessProbabilityScore(plan);
  const [scoreResult, setScoreResult] = useState<{
    probability: number;
    reasoning: string;
    recommendations: string[];
    disclaimer: string;
  } | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  const [tripName, setTripName] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [status, setStatus] = useState<NonNullable<Doc<"saved_checklists">["status"]>>("planning");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (effectiveTrip && !hydrated) {
      setTripName(effectiveTrip.tripName ?? effectiveTrip.title);
      setTravelDate(effectiveTrip.travelDate ?? "");
      setStatus(effectiveTrip.status ?? "planning");
      setNotes(effectiveTrip.notes ?? "");
      setHydrated(true);
    }
  }, [effectiveTrip, hydrated]);

  if (effectiveTrip === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (effectiveTrip === null) {
    return (
      <div className="border border-dashed border-border rounded-xl p-8 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground mb-1">Trip not found</p>
        <p className="text-xs text-muted-foreground mb-4">
          This trip doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button size="sm" className="cursor-pointer" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const trip = effectiveTrip;
  const tripReminders = isDemoAuthenticated ? [] : (reminders ?? []).filter((r) => r.checklistId === trip._id);

  const handleSave = async () => {
    if (isDemoAuthenticated) {
      setDemoChecklists((prev) =>
        prev.map((c) =>
          c._id === trip._id
            ? { ...c, tripName: tripName.trim() || c.title, travelDate: travelDate || undefined, status, notes }
            : c,
        ),
      );
      toast.success("Trip updated. (demo only)");
      return;
    }
    setSaving(true);
    try {
      await updateTripDetails({
        id: trip._id,
        tripName: tripName.trim() || trip.title,
        travelDate: travelDate || undefined,
        status,
        notes,
      });
      toast.success("Trip updated.");
    } catch {
      toast.error("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (isDemoAuthenticated) {
      setDemoChecklists((prev) => prev.map((c) => (c._id === trip._id ? { ...c, archived: !c.archived } : c)));
      toast.success(trip.archived ? "Trip restored. (demo only)" : "Trip archived. (demo only)");
      navigate("/dashboard");
      return;
    }
    try {
      await setTripArchived({ id: trip._id, archived: !trip.archived });
      toast.success(trip.archived ? "Trip restored." : "Trip archived.");
      navigate("/dashboard");
    } catch {
      toast.error("Could not update this trip. Please try again.");
    }
  };

  const handleEstimateScore = async () => {
    setScoreLoading(true);
    try {
      if (isDemoAuthenticated) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setScoreResult({
          probability: 78,
          reasoning: "This is a demo estimate: a strong checklist completion rate and consistent document history typically correlate with a higher approval likelihood, but every embassy's review is ultimately discretionary.",
          recommendations: [
            "Double-check that every required document is current, not just present.",
            "Make sure proof-of-funds figures match what you state in your application form.",
          ],
          disclaimer: "Demo estimate only — not generated by AI. Real accounts get a live, AI-estimated score based on your actual checklist.",
        });
        return;
      }

      const fullChecklist = getLocalizedChecklist(trip.destination, trip.visaType as VisaType, i18n.language);
      const checkedSet = new Set(trip.checkedItems);
      const missingRequiredItems = (fullChecklist?.items ?? [])
        .filter((item) => item.required && !checkedSet.has(item.id))
        .map((item) => item.title);

      const result = await estimateSuccessProbability({
        origin: trip.origin,
        destination: trip.destination,
        visaType: trip.visaType,
        completionPercent: trip.progress,
        missingRequiredItems,
        language: i18n.language,
      });
      setScoreResult(result);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Could not estimate your success probability. Please try again.");
      }
    } finally {
      setScoreLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl shrink-0">{DEST_FLAGS[trip.destination] ?? "🌍"}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground capitalize">
              {translateCountry(trip.origin)} → {translateCountry(trip.destination)} · {trip.visaType}
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden max-w-xs">
              <div className="h-full rounded-full bg-accent" style={{ width: `${trip.progress}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{trip.progress}% of checklist complete</div>
          </div>
          <button
            onClick={() =>
              navigate(
                `/checklist?from=${encodeURIComponent(trip.origin)}&to=${encodeURIComponent(trip.destination)}&type=${trip.visaType}`,
              )
            }
            className="text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
          >
            Continue checklist
          </button>
        </div>

        {!canManage && (
          <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-3 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-accent shrink-0" />
            <p className="text-xs text-muted-foreground">
              Trip names, status tracking, and private notes are a Pro feature.{" "}
              <button
                onClick={() => navigate("/pricing")}
                className="text-primary font-semibold hover:underline cursor-pointer"
              >
                Upgrade to Pro
              </button>
            </p>
          </div>
        )}

        <fieldset disabled={!canManage} className="space-y-4 disabled:opacity-50">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Trip name</label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder={trip.title}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Travel date</label>
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TRIP_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-1.5">
              <StickyNote className="w-3.5 h-3.5" /> Private notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Embassy phone numbers, agent contact, anything you want to remember about this trip…"
              className="min-h-[100px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={saving} className="cursor-pointer" onClick={() => void handleSave()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={() => void handleArchive()}
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              {trip.archived ? "Restore trip" : "Archive trip"}
            </Button>
          </div>
        </fieldset>
      </div>

      {/* Success Probability Score — Expert anchor feature */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
            Success Probability Score
          </h3>
          {!canUseScore && (
            <span className="text-[10px] font-bold text-accent uppercase tracking-wide">Expert</span>
          )}
        </div>
        {!canUseScore ? (
          <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-accent shrink-0" />
            <p className="text-xs text-muted-foreground">
              Know your approval odds before you submit.{" "}
              <button onClick={() => navigate("/pricing")} className="text-primary font-semibold hover:underline cursor-pointer">
                Upgrade to Expert
              </button>
            </p>
          </div>
        ) : scoreResult ? (
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-3xl font-bold text-primary">{scoreResult.probability}</span>
              <span className="text-sm text-muted-foreground">/100 estimated approval odds</span>
            </div>
            <p className="text-sm text-foreground/90 mb-3 leading-relaxed">{scoreResult.reasoning}</p>
            {scoreResult.recommendations.length > 0 && (
              <ul className="space-y-1 mb-3">
                {scoreResult.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-accent">●</span> {r}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-muted-foreground/70 italic">{scoreResult.disclaimer}</p>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer mt-3"
              disabled={scoreLoading}
              onClick={() => void handleEstimateScore()}
            >
              {scoreLoading ? "Re-estimating…" : "Re-estimate"}
            </Button>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-3">
              Get an AI-estimated approval probability based on your actual checklist completion and any missing
              required documents.
            </p>
            <Button size="sm" disabled={scoreLoading} className="cursor-pointer" onClick={() => void handleEstimateScore()}>
              {scoreLoading ? "Estimating…" : "Estimate my approval odds"}
            </Button>
          </div>
        )}
      </div>

      {trip.status === "approved" && (
        <SettleInToolkit
          trip={trip}
          onSave={async (checkedItems, progress) => {
            if (isDemoAuthenticated) {
              setDemoChecklists((prev) =>
                prev.map((c) =>
                  c._id === trip._id ? { ...c, settleInCheckedItems: checkedItems, settleInProgress: progress } : c,
                ),
              );
              return;
            }
            await updateSettleInProgress({ id: trip._id, settleInCheckedItems: checkedItems, settleInProgress: progress });
          }}
        />
      )}

      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">
          Reminders for this trip
        </h3>
        {tripReminders.length > 0 ? (
          <div className="space-y-2">
            {tripReminders.map((r) => (
              <div key={r._id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <Bell className="w-4 h-4 text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">Due {r.dueDate}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No reminders set for this trip yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardInner />
    </DashboardShell>
  );
}

export function DashboardChecklistsPage() {
  return (
    <DashboardShell title="Saved Checklists">
      <DashboardInner view="checklists" />
    </DashboardShell>
  );
}

export function DashboardTimelinePage() {
  return (
    <DashboardShell title="Trip Timeline">
      <DashboardInner view="timeline" />
    </DashboardShell>
  );
}

export function DashboardRemindersPage() {
  return (
    <DashboardShell title="Reminders">
      <DashboardInner view="reminders" />
    </DashboardShell>
  );
}

export function DashboardTripWorkspacePage() {
  return (
    <DashboardShell title="Trip Workspace">
      <TripWorkspace />
    </DashboardShell>
  );
}
