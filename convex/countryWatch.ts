import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./admin.ts";
import { getCurrentUser, getCurrentUserOrThrow as getUserOrThrow } from "./authHelpers.ts";

const WATCH_LIMITS: Record<string, number> = { free: 0, pro: 5, expert: 10 };

// ─── My watched countries ─────────────────────────────────────────────────────
export const getMyWatches = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("country_watches")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// ─── Add a country to watch ──────────────────────────────────────────────────
export const addWatch = mutation({
  args: { countryName: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    const plan = user.plan ?? "free";
    const limit = WATCH_LIMITS[plan] ?? 0;
    if (limit === 0) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Country Watch is a Pro feature. Upgrade at /pricing." });
    }
    const existing = await ctx.db
      .query("country_watches")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    if (args.countryName.length > 100)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Country name is too long." });
    if (existing.some((w) => w.countryName === args.countryName)) {
      return; // already watching
    }
    if (existing.length >= limit) {
      throw new ConvexError({
        code: "WATCH_LIMIT_REACHED",
        message: `Your ${plan === "expert" ? "Expert" : "Pro"} plan can watch up to ${limit} countries. Remove one to add another.`,
      });
    }
    await ctx.db.insert("country_watches", {
      userId: user._id,
      countryName: args.countryName,
      createdAt: new Date().toISOString(),
    });
  },
});

// ─── Remove a watched country ────────────────────────────────────────────────
export const removeWatch = mutation({
  args: { id: v.id("country_watches") },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Watch not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this watch" });
    }
    await ctx.db.delete(args.id);
  },
});

// ─── Recent policy updates for my watched countries ──────────────────────────
export const getMyFeed = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const watches = await ctx.db
      .query("country_watches")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const watchedCountries = new Set(watches.map((w) => w.countryName));
    if (watchedCountries.size === 0) return [];

    const updates = await Promise.all(
      [...watchedCountries].map((country) =>
        ctx.db
          .query("country_policy_updates")
          .withIndex("by_country", (q) => q.eq("countryName", country))
          .order("desc")
          .take(10),
      ),
    );
    return updates.flat().sort((a, b) => b._creationTime - a._creationTime);
  },
});

// ─── Admin: publish a policy update and notify every watcher ────────────────
export const publishUpdate = mutation({
  args: { countryName: v.string(), title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const id = await ctx.db.insert("country_policy_updates", {
      countryName: args.countryName,
      title: args.title,
      body: args.body,
      publishedAt: new Date().toISOString(),
      publishedByUserId: admin._id,
    });
    await ctx.scheduler.runAfter(0, internal.countryWatch.dispatchUpdateEmails, {
      countryName: args.countryName,
      title: args.title,
      body: args.body,
    });
    return id;
  },
});

// ─── Admin: list updates published so far ────────────────────────────────────
export const listUpdates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("country_policy_updates").order("desc").take(50);
  },
});

const DISPATCH_PAGE_SIZE = 50;

export const getWatchersPage = internalQuery({
  args: { countryName: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("country_watches")
      .withIndex("by_country", (q) => q.eq("countryName", args.countryName))
      .paginate(args.paginationOpts);
    const withEmails = await Promise.all(
      result.page.map(async (w) => {
        const user = await ctx.db.get(w.userId);
        return user?.email ?? null;
      }),
    );
    return { ...result, emails: withEmails.filter((e): e is string => !!e) };
  },
});

// Paginated + self-chaining for the same reason reminderDispatch is: a single
// policy update could have thousands of watchers, and we never want one
// invocation to risk timing out and silently leaving people unnotified.
export const dispatchUpdateEmails = internalAction({
  args: { countryName: v.string(), title: v.string(), body: v.string(), cursor: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const { emails, isDone, continueCursor } = await ctx.runQuery(
      internal.countryWatch.getWatchersPage,
      { countryName: args.countryName, paginationOpts: { cursor: args.cursor ?? null, numItems: DISPATCH_PAGE_SIZE } },
    );

    await Promise.allSettled(
      emails.map((to) =>
        ctx.runAction(internal.emails.policyUpdate.sendPolicyUpdateEmail, {
          to,
          countryName: args.countryName,
          title: args.title,
          body: args.body,
        }),
      ),
    );

    if (!isDone) {
      await ctx.scheduler.runAfter(0, internal.countryWatch.dispatchUpdateEmails, {
        ...args,
        cursor: continueCursor,
      });
    }
  },
});
