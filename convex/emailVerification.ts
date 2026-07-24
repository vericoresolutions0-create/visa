import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.js";
import { internal } from "./_generated/api";
import { getCurrentUserOrThrow } from "./authHelpers.ts";
import { checkUserDailyLimit } from "./rateLimits.ts";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

// Shared by the public resend mutation below and the new-signup hook in
// auth.ts — same in-process plain-function pattern as
// creditAgentReferralCommission, so a brand new account's first
// verification email is scheduled atomically with account creation rather
// than as a second, separately-failable step.
export async function startEmailVerification(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string,
  name: string,
): Promise<void> {
  const existing = await ctx.db
    .query("pending_email_verifications")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const row of existing) {
    await ctx.db.delete(row._id);
  }

  const token = generateToken();
  const now = Date.now();
  await ctx.db.insert("pending_email_verifications", {
    userId,
    token,
    requestedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + VERIFICATION_TTL_MS).toISOString(),
  });

  await ctx.scheduler.runAfter(0, internal.emails.emailVerification.sendEmailVerificationEmail, {
    to: email,
    token,
    name,
  });
}

export const requestEmailVerification = mutation({
  args: {},
  handler: async (ctx): Promise<{ sent: true }> => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.emailVerificationTime) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Your email is already verified." });
    }
    if (!user.email) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Add an email address to your account first." });
    }
    await checkUserDailyLimit(
      ctx, user._id, "email_verification_resend", 5,
      "Too many verification emails requested. Please wait a bit and try again.",
    );
    await startEmailVerification(ctx, user._id, user.email, user.name ?? "there");
    return { sent: true };
  },
});

export const confirmEmailVerification = mutation({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ verified: true }> => {
    const user = await getCurrentUserOrThrow(ctx);
    const pending = await ctx.db
      .query("pending_email_verifications")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!pending) {
      throw new ConvexError({ code: "NOT_FOUND", message: "This verification link is invalid." });
    }
    if (pending.consumedAt) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This verification link has already been used." });
    }
    if (new Date(pending.expiresAt) <= new Date()) {
      throw new ConvexError({ code: "EXPIRED", message: "This verification link has expired. Please request a new one from Settings." });
    }
    if (pending.userId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This verification link belongs to a different account. Please sign in as the account that requested it.",
      });
    }

    await ctx.db.patch(user._id, { emailVerificationTime: Date.now() });
    await ctx.db.delete(pending._id);
    return { verified: true };
  },
});
