import { internalMutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type StatField =
  | "totalUsers"
  | "totalChecklists"
  | "totalAgents"
  | "totalRejectionAnalyses"
  | "proUsers"
  | "expertUsers"
  | "totalAgentAIMessages"
  | "totalBusinessAIMessages"
  | "suspendedUsersCount"
  | "leadAccessRevokedCount";

const ZERO_ROW = {
  totalUsers: 0,
  totalChecklists: 0,
  totalAgents: 0,
  totalRejectionAnalyses: 0,
  proUsers: 0,
  expertUsers: 0,
  totalAgentAIMessages: 0,
  totalBusinessAIMessages: 0,
  suspendedUsersCount: 0,
  leadAccessRevokedCount: 0,
};

// Single denormalized counters row, read/written here only. This exists so
// the admin dashboard never has to collect() entire tables just to count
// them — at real scale (millions of rows) that would slow to a crawl or
// outright fail. Every insert/delete of a counted table must call bumpStat.
//
// ctx is typed as the minimal `{ db }` shape (not the full MutationCtx) so
// this is callable from convex/rateLimits.ts's checkUserDailyLimit, which
// only ever receives that narrower type — a real MutationCtx satisfies it
// too, so every existing call site keeps working unchanged.
async function getOrCreateRow(ctx: Pick<MutationCtx, "db">) {
  const existing = await ctx.db.query("platform_stats").first();
  if (existing) return existing;
  const id = await ctx.db.insert("platform_stats", ZERO_ROW);
  return await ctx.db.get(id);
}

export async function bumpStat(ctx: Pick<MutationCtx, "db">, field: StatField, delta: number): Promise<void> {
  const row = await getOrCreateRow(ctx);
  if (!row) return;
  // Newer counters (added after totalUsers etc.) are optional, so a
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

// One-time migration + drift-recovery tool for suspendedUsersCount /
// leadAccessRevokedCount (added 2026-07-18, bumped from
// convex/securityAudit.ts adminTakeAction). Same shape and same guarantee as
// recalculatePlanCounters above: safe to run any time via `npx convex run`
// as a reconciliation check, never called from a hot path. Neither
// isSuspended nor leadAccessRevoked has a dedicated index (both are rare
// boolean flags, not a common query filter), so this does a capped scan
// rather than an indexed one — acceptable here specifically because it's a
// manual, occasional operation, not something any user request triggers.
export const recalculateTrustAndSafetyCounters = internalMutation({
  args: {},
  handler: async (ctx) => {
    const [users, agentProfiles] = await Promise.all([
      ctx.db.query("users").take(20_000),
      ctx.db.query("agent_profiles").take(10_000),
    ]);
    const suspendedUsersCount = users.filter((u) => u.isSuspended).length;
    const leadAccessRevokedCount = agentProfiles.filter((p) => p.leadAccessRevoked).length;
    const row = await getOrCreateRow(ctx);
    if (!row) return;
    await ctx.db.patch(row._id, { suspendedUsersCount, leadAccessRevokedCount });
    return { suspendedUsersCount, leadAccessRevokedCount };
  },
});

// One-time migration + drift-recovery tool for totalAgentAIMessages /
// totalBusinessAIMessages (added 2026-07-18, bumped from
// convex/rateLimits.ts checkUserDailyLimit). Uses the by_resource_date index
// to read only AI-resource rows (excluding every other resource type that
// shares the user_daily_usage table), capped generously — a manual
// reconciliation tool, not a hot path.
export const recalculateAiUsageCounters = internalMutation({
  args: {},
  handler: async (ctx) => {
    const [agentRows, businessRows] = await Promise.all([
      ctx.db.query("user_daily_usage").withIndex("by_resource_date", (q) => q.eq("resource", "agent_ai_agent")).take(50_000),
      ctx.db.query("user_daily_usage").withIndex("by_resource_date", (q) => q.eq("resource", "agent_ai_business")).take(50_000),
    ]);
    const totalAgentAIMessages = agentRows.reduce((s, r) => s + r.count, 0);
    const totalBusinessAIMessages = businessRows.reduce((s, r) => s + r.count, 0);
    const row = await getOrCreateRow(ctx);
    if (!row) return;
    await ctx.db.patch(row._id, { totalAgentAIMessages, totalBusinessAIMessages });
    return { totalAgentAIMessages, totalBusinessAIMessages };
  },
});
