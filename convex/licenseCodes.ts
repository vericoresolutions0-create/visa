import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getCurrentUserOrThrow, assertNotSuspended } from "./authHelpers.ts";
import { requireAdmin, logAdminAction } from "./admin.ts";
import { hasActiveAgentTrial } from "./agentTrials.ts";

// 33-symbol alphabet, 0/O/1/I removed to avoid transcription errors when an
// admin reads this aloud or an agency retypes it from an email. 12 symbols
// gives ~61 bits of entropy (33^12), making blind guessing infeasible —
// the real security boundary is the email-match check in redeemLicenseCode,
// this just keeps the code itself unguessable too.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_GENERATION_ATTEMPTS = 5;

function generateLicenseCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

// Generates a candidate and checks it against the table on every single
// attempt (including the last one) — a candidate is never returned
// unchecked. At ~61 bits of entropy a real collision is effectively
// impossible, but this still fails loudly rather than silently risking a
// duplicate if it ever somehow happened.
async function generateUniqueLicenseCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateLicenseCode();
    const collision = await ctx.db.query("license_codes").withIndex("by_code", (q) => q.eq("code", candidate)).unique();
    if (!collision) return candidate;
  }
  throw new ConvexError({ code: "INTERNAL", message: "Could not generate a unique code. Please try again." });
}

const PLAN_VALIDATOR = v.union(v.literal("agent_listing"), v.literal("agent_featured"), v.literal("agency_white_label"));

export const issueLicenseCode = mutation({
  args: {
    email: v.string(),
    plan: PLAN_VALIDATOR,
    whitelabelApplicationId: v.optional(v.id("whitelabel_applications")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const email = args.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter a valid email address." });
    }

    const existing = await ctx.db.query("license_codes").withIndex("by_email", (q) => q.eq("email", email)).collect();
    const now = new Date();
    if (existing.some((c) => !c.redeemedAt && new Date(c.expiresAt) > now)) {
      throw new ConvexError({ code: "ALREADY_ISSUED", message: "This email already has an active, unredeemed code." });
    }

    const code = await generateUniqueLicenseCode(ctx);

    const issuedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + CODE_TTL_MS).toISOString();
    await ctx.db.insert("license_codes", {
      code,
      email,
      plan: args.plan,
      whitelabelApplicationId: args.whitelabelApplicationId,
      issuedByUserId: admin._id,
      issuedAt,
      expiresAt,
    });

    if (args.whitelabelApplicationId) {
      await ctx.db.patch(args.whitelabelApplicationId, { read: true });
    }

    await logAdminAction(ctx, admin, "issueLicenseCode", code, `${email} -> ${args.plan}`);
    return { code };
  },
});

export const redeemLicenseCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(user);
    const normalizedCode = args.code.trim().toUpperCase();
    const license = await ctx.db.query("license_codes").withIndex("by_code", (q) => q.eq("code", normalizedCode)).unique();
    if (!license) {
      throw new ConvexError({ code: "NOT_FOUND", message: "That code wasn't found. Please check it and try again." });
    }
    if (license.redeemedAt) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This code has already been redeemed." });
    }
    if (new Date(license.expiresAt) <= new Date()) {
      throw new ConvexError({ code: "EXPIRED", message: "This code has expired. Please contact us for a new one." });
    }
    // The actual consent/security enforcement: without this check, a leaked
    // or guessed code could be redeemed by anyone, not just the agency it
    // was issued to.
    if (!user.email || user.email.toLowerCase() !== license.email) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This code was issued to a different email address — please sign in with that email to redeem it.",
      });
    }

    const now = new Date().toISOString();
    // Mirrors completeAgentCheckout exactly — only the plan field changes.
    // No invented amount, no fake payment timestamp, no fake card details.
    await ctx.db.patch(user._id, {
      agentPlan: license.plan,
      agentSubscriptionStartedAt: user.agentSubscriptionStartedAt ?? now,
    });
    // If an active trial is in effect, leave agent_profiles.tier as the
    // trial set it — redeeming a code for a different plan shouldn't
    // silently end the trial early. users.agentPlan is still updated above,
    // so the redeemed plan takes over correctly once the trial ends.
    if (!hasActiveAgentTrial(user)) {
      const agentProfile = await ctx.db.query("agent_profiles").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
      if (agentProfile) {
        await ctx.db.patch(agentProfile._id, { tier: license.plan });
      }
    }

    await ctx.db.patch(license._id, { redeemedAt: now, redeemedByUserId: user._id });
    return { plan: license.plan };
  },
});

export const listLicenseCodes = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("license_codes").order("desc").take(200);
  },
});
