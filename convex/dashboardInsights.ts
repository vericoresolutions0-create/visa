import { query } from "./_generated/server";
import { getCurrentUser } from "./authHelpers.ts";

type UrgentAction = { label: string; tone: "red" | "amber" };

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── Travel Health Score ──────────────────────────────────────────────────────
// Computed entirely from the user's real data — vault document expiry dates,
// overdue reminders, and incomplete trips. Nothing here is simulated: the
// score genuinely reflects whether this person has anything to worry about.
export const getTravelHealth = query({
  args: {},
  handler: async (ctx): Promise<{ score: number; actions: UrgentAction[] } | "locked" | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    if (user.plan !== "pro" && user.plan !== "expert") return "locked";

    const [vaultDocs, reminders, trips] = await Promise.all([
      ctx.db.query("vault_documents").withIndex("by_user", (q) => q.eq("userId", user._id)).take(100),
      ctx.db.query("reminders").withIndex("by_user", (q) => q.eq("userId", user._id)).take(100),
      ctx.db.query("saved_checklists").withIndex("by_user", (q) => q.eq("userId", user._id)).take(100),
    ]);

    let score = 100;
    const actions: UrgentAction[] = [];

    for (const doc of vaultDocs) {
      if (!doc.expiryDate) continue;
      const days = daysUntil(doc.expiryDate);
      if (days < 0) {
        score -= 15;
        actions.push({ label: `${doc.label} has expired`, tone: "red" });
      } else if (days <= 30) {
        score -= 10;
        actions.push({ label: `${doc.label} expires in ${days} day${days === 1 ? "" : "s"}`, tone: "red" });
      } else if (days <= 90) {
        score -= 4;
        actions.push({ label: `${doc.label} expires in ${days} days`, tone: "amber" });
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const overdueReminders = reminders.filter((r) => !r.sent && r.dueDate <= today);
    for (const r of overdueReminders) {
      score -= 8;
      actions.push({ label: `Reminder overdue: ${r.title}`, tone: "red" });
    }

    const incompleteTrips = trips.filter((t) => !t.archived && t.progress < 100);
    for (const t of incompleteTrips) {
      score -= 3;
      actions.push({
        label: `${t.tripName || t.title} is ${t.progress}% complete — ${100 - t.progress}% of documents still missing`,
        tone: "amber",
      });
    }

    score = Math.max(0, Math.min(100, score));

    actions.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "red" ? -1 : 1));

    return { score, actions: actions.slice(0, 5) };
  },
});
