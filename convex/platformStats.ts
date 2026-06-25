import type { MutationCtx, QueryCtx } from "./_generated/server";

type StatField = "totalUsers" | "totalChecklists" | "totalAgents" | "totalRejectionAnalyses";

const ZERO_ROW = { totalUsers: 0, totalChecklists: 0, totalAgents: 0, totalRejectionAnalyses: 0 };

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
  await ctx.db.patch(row._id, { [field]: Math.max(0, row[field] + delta) });
}

export async function readStats(ctx: QueryCtx) {
  const row = await ctx.db.query("platform_stats").first();
  return row ?? ZERO_ROW;
}
