import { ConvexError, v } from "convex/values";
import { action, query, mutation } from "./_generated/server";
import { internal } from "./_generated/api.js";
import { requireAdmin } from "./admin.ts";

// ─── Manual vendor-check tracking ─────────────────────────────────────────────
// For vendors with no API to read billing/plan state (Vercel's plan tier,
// Convex's usage ceiling, a domain registrar's renewal date) — records that a
// human actually looked, and when, so staleness can be shown honestly instead
// of a fabricated live number.

export const getVendorChecks = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("vendor_checks").collect();
    return rows.map((r) => ({
      vendorKey: r.vendorKey,
      lastCheckedAt: r.lastCheckedAt,
      note: r.note ?? null,
    }));
  },
});

export const markVendorChecked = mutation({
  args: { vendorKey: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (!args.vendorKey || args.vendorKey.length > 100) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid vendor key." });
    }
    if (args.note && args.note.length > 500) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Note is too long." });
    }

    const existing = await ctx.db
      .query("vendor_checks")
      .withIndex("by_vendorKey", (q) => q.eq("vendorKey", args.vendorKey))
      .unique();

    const patch = {
      lastCheckedAt: new Date().toISOString(),
      lastCheckedByAdminId: admin._id,
      ...(args.note !== undefined ? { note: args.note.trim() || undefined } : {}),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("vendor_checks", { vendorKey: args.vendorKey, ...patch });
    }
  },
});

// ─── Real OpenAI spend (the one vendor here with an actual usage API) ────────
// Requires a separate Admin API key (platform.openai.com organization admin
// keys, not the regular OPENAI_API_KEY already used for AI features — that
// key can't read organization billing data, only make inference calls).

export const isOpenAiAdminConfigured = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return Boolean(process.env.OPENAI_ADMIN_KEY);
  },
});

type OpenAiCostsResponse = {
  data?: OpenAiCostBucket[];
} | OpenAiCostBucket[];

type OpenAiCostBucket = {
  results?: { amount?: { value?: number; currency?: string } }[];
};

export const getOpenAiSpendThisMonth = action({
  args: {},
  handler: async (ctx): Promise<{ spendUsd: number; currency: string; asOf: string }> => {
    // Actions can't call requireAdmin directly — route through internal query,
    // same pattern as blogAI.ts's translateArticle.
    await ctx.runQuery(internal.admin.verifyAdminForAction, {});

    const adminKey = process.env.OPENAI_ADMIN_KEY;
    if (!adminKey) {
      throw new ConvexError({
        code: "NOT_CONFIGURED",
        message: "No OpenAI Admin key set. Generate one at platform.openai.com → Settings → Organization → Admin keys, then set OPENAI_ADMIN_KEY.",
      });
    }

    const now = new Date();
    const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000;
    const nowSeconds = Math.floor(now.getTime() / 1000);

    let currency = "usd";
    let spendUsd = 0;
    let page: string | undefined;

    // Real pagination — a full month can span more daily buckets than a
    // single page returns; looping until has_more is false (capped so a
    // malformed/unbounded response can't hang the action) is what makes this
    // an accurate month-to-date total rather than just the first page.
    for (let i = 0; i < 20; i++) {
      const params = new URLSearchParams({
        start_time: String(monthStart),
        end_time: String(nowSeconds),
        bucket_width: "1d",
        limit: "31",
      });
      if (page) params.set("page", page);

      let res: Response;
      try {
        res = await fetch(`https://api.openai.com/v1/organization/costs?${params}`, {
          headers: { Authorization: `Bearer ${adminKey}` },
        });
      } catch {
        throw new ConvexError({ code: "NETWORK_ERROR", message: "Could not reach the OpenAI API. Please try again." });
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new ConvexError({
          code: "OPENAI_API_ERROR",
          message: res.status === 401 || res.status === 403
            ? "OpenAI rejected the Admin key — it may be missing the Usage/Costs read permission."
            : `OpenAI Costs API returned ${res.status}. ${body.slice(0, 200)}`,
        });
      }

      const json = (await res.json()) as OpenAiCostsResponse & { has_more?: boolean; next_page?: string };
      const buckets: OpenAiCostBucket[] = Array.isArray(json) ? json : (json.data ?? []);

      for (const bucket of buckets) {
        for (const result of bucket.results ?? []) {
          const value = result.amount?.value;
          if (typeof value === "number" && Number.isFinite(value)) {
            spendUsd += value;
            currency = result.amount?.currency ?? currency;
          }
        }
      }

      if (!Array.isArray(json) && json.has_more && json.next_page) {
        page = json.next_page;
      } else {
        break;
      }
    }

    return { spendUsd: Math.round(spendUsd * 100) / 100, currency, asOf: now.toISOString() };
  },
});
