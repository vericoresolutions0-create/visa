import { internalMutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type StatField =
  | "totalUsers"
  | "totalChecklists"
  | "totalAgents"
  | "totalRejectionAnalyses"
  | "proUsers"
  | "expertUsers";

const ZERO_ROW = {
  totalUsers: 0,
  totalChecklists: 0,
  totalAgents: 0,
  totalRejectionAnalyses: 0,
  proUsers: 0,
  expertUsers: 0,
};

// Single denormalized counters row, read/written here only. This exists so
// the admin dashboard never has to collect() entire tables just to count
// them — at real scale (millions of rows) that would slow to a crawl or
// outright fail. Every insert/delete of a counted table must call bumpStat.
async function getOrCreateRow(ctx: MutationCtx) {
  const existing = await ctx.db.query("platform_stats").first();
  if (existing) return existing;
  const id = await ctx.db.insert("platform_stats", ZERO_ROW);
  return await ctx.db.get(id);
}

export async function bumpStat(ctx: MutationCtx, field: StatField, delta: number): Promise<void> {
  const row = await getOrCreateRow(ctx);
  if (!row) return;
  // proUsers/expertUsers are optional (added after totalUsers etc.), so a
  // pre-migration row reads as undefined here — treat that as 0 rather than
  // producing NaN.
  const current = row[field] ?? 0;
  await ctx.db.patch(row._id, { [field]: Math.max(0, current + delta) });
}

export async function readStats(ctx: QueryCtx) {
  const row = await ctx.db.query("platform_stats").first();
  if (!row) return ZERO_ROW;
  return {
    ...ZERO_ROW,
    ...row,
  };
}

type Plan = "free" | "pro" | "expert" | undefined;

// Keeps platform_stats.proUsers/expertUsers accurate across every place an
// applicant's plan can change (real checkout, simulated checkout, trial
// start, admin override, cancellation, account deletion) without ever
// having to collect() every paying user to count them. Called with the
// plan *before* and *after* the change; a no-op when neither side is a
// paid plan or the plan didn't actually change.
export async function bumpPlanCounters(
  ctx: MutationCtx,
  fromPlan: Plan,
  toPlan: Plan,
): Promise<void> {
  if (fromPlan === toPlan) return;
  if (fromPlan === "pro") await bumpStat(ctx, "proUsers", -1);
  if (fromPlan === "expert") await bumpStat(ctx, "expertUsers", -1);
  if (toPlan === "pro") await bumpStat(ctx, "proUsers", 1);
  if (toPlan === "expert") await bumpStat(ctx, "expertUsers", 1);
}

// One-time migration: proUsers/expertUsers didn't exist before this counter
// was added, so any pro/expert users that predate it were never counted.
// Recomputes both fields from the real users table via the by_plan index
// (an indexed collect(), not a full scan) and overwrites the counter — meant
// to be run once via `npx convex run`, never on a hot path.
export const recalculatePlanCounters = internalMutation({
  args: {},
  handler: async (ctx) => {
    const [proUsers, expertUsers] = await Promise.all([
      ctx.db.query("users").withIndex("by_plan", (q) => q.eq("plan", "pro")).take(5000),
      ctx.db.query("users").withIndex("by_plan", (q) => q.eq("plan", "expert")).take(5000),
    ]);
    const row = await getOrCreateRow(ctx);
    if (!row) return;
    await ctx.db.patch(row._id, {
      proUsers: proUsers.length,
      expertUsers: expertUsers.length,
    });
    return { proUsers: proUsers.length, expertUsers: expertUsers.length };
  },
});
