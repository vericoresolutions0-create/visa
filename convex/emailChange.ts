import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.js";
import { internal } from "./_generated/api";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";

const EMAIL_CHANGE_TTL_MS = 60 * 60 * 1000;

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function isEmailTakenByAnotherUser(
  ctx: MutationCtx,
  email: string,
  excludeUserId: Id<"users">,
) {
  const matches = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .collect();
  return matches.some((u) => u._id !== excludeUserId);
}

export const requestEmailChange = mutation({
  args: { newEmail: v.string() },
  handler: async (ctx, args): Promise<{ requested: true }> => {
    const user = await getCurrentUserOrThrow(ctx);
    const newEmail = args.newEmail.trim().toLowerCase();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail) || newEmail.length > 254) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter a valid email address." });
    }
    if (newEmail === user.email?.toLowerCase()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "That's already your current email." });
    }
    if (await isEmailTakenByAnotherUser(ctx, newEmail, user._id)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "That email is already in use by another account." });
    }

    const existing = await ctx.db
      .query("pending_email_changes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    const token = generateToken();
    const now = Date.now();
    await ctx.db.insert("pending_email_changes", {
      userId: user._id,
      newEmail,
      token,
      requestedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + EMAIL_CHANGE_TTL_MS).toISOString(),
    });

    await ctx.scheduler.runAfter(0, internal.emails.emailChange.sendEmailChangeConfirmationEmail, {
      to: newEmail,
      token,
      name: user.name ?? "there",
    });
    if (user.email) {
      await ctx.scheduler.runAfter(0, internal.emails.emailChange.sendEmailChangeNoticeEmail, {
        to: user.email,
        newEmail,
        name: user.name ?? "there",
      });
    }

    return { requested: true };
  },
});

export const confirmEmailChange = mutation({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ newEmail: string }> => {
    const user = await getCurrentUserOrThrow(ctx);
    const pending = await ctx.db
      .query("pending_email_changes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!pending) {
      throw new ConvexError({ code: "NOT_FOUND", message: "This confirmation link is invalid." });
    }
    if (pending.consumedAt) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This confirmation link has already been used." });
    }
    if (new Date(pending.expiresAt) <= new Date()) {
      throw new ConvexError({ code: "EXPIRED", message: "This confirmation link has expired. Please request the change again." });
    }
    if (pending.userId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This confirmation link belongs to a different account. Please sign in as the account that requested this change.",
      });
    }
    if (await isEmailTakenByAnotherUser(ctx, pending.newEmail, user._id)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "That email is now in use by another account." });
    }

    await ctx.db.patch(user._id, { email: pending.newEmail, emailVerificationTime: Date.now() });
    await ctx.db.delete(pending._id);

    return { newEmail: pending.newEmail };
  },
});

export const getMyPendingEmailChange = query({
  args: {},
  handler: async (ctx): Promise<{ newEmail: string; expiresAt: string } | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const rows = await ctx.db
      .query("pending_email_changes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const active = rows.find((r) => !r.consumedAt && new Date(r.expiresAt) > new Date());
    return active ? { newEmail: active.newEmail, expiresAt: active.expiresAt } : null;
  },
});

export const cancelEmailChange = mutation({
  args: {},
  handler: async (ctx): Promise<{ cancelled: boolean }> => {
    const user = await getCurrentUserOrThrow(ctx);
    const rows = await ctx.db
      .query("pending_email_changes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    let cancelled = false;
    for (const row of rows) {
      if (!row.consumedAt) {
        await ctx.db.delete(row._id);
        cancelled = true;
      }
    }
    return { cancelled };
  },
});
