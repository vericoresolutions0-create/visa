import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { recordPartnerEvent } from "./partners.ts";

// Google only activates once AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET are set
// as Convex env vars — until then it's simply absent from the providers
// list, same "not configured yet" pattern used for the AI features.
const hasGoogleConfig = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

const {
  auth,
  signIn: convexAuthSignIn,
  signOut,
  store,
  isAuthenticated,
} = convexAuth({
  providers: [
    Password({
      // Records real consent at the moment of account creation — the
      // sign-up form only submits agreedToTermsAt when its checkbox is
      // checked, so this field's presence is the actual consent record.
      profile(params) {
        return {
          email: params.email as string,
          ...(params.agreedToTermsAt ? { agreedToTermsAt: params.agreedToTermsAt as string } : {}),
          ...(params.partnerReferralSlug ? { partnerReferralSlug: params.partnerReferralSlug as string } : {}),
        };
      },
    }),
    ...(hasGoogleConfig ? [Google] : []),
  ],
  callbacks: {
    // Fires exactly once for a genuinely new account (existingUserId is
    // null) — the authoritative place to record a real partner signup,
    // independent of any frontend timing.
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId, profile }) {
      if (existingUserId !== null) return;
      const slug = (profile as { partnerReferralSlug?: string }).partnerReferralSlug;
      if (!slug) return;
      await recordPartnerEvent(ctx, { slug, eventType: "signup", userId });
    },
  },
});

export { auth, signOut, store, isAuthenticated };

// Re-exported under a new name, purely so the guarded `signIn` below (the
// one actually invoked at the "auth:signIn" function path the client
// library hardcodes) can hand off to it via ctx.runAction once the rate
// limit check passes. This is the exact same Password-provider logic as
// before, completely unmodified — only the entry point is wrapped.
export const rawSignIn = convexAuthSignIn;

// Rate-limits signIn/signUp/reset attempts per email before delegating to
// the real implementation above — see convex/authRateLimit.ts and the
// comment on rawSignIn for why this wraps the entry point instead of using
// Convex Auth's own `profile()` hook. Provider-initiated flows without an
// email/flow (e.g. starting Google sign-in) pass straight through
// unaffected.
export const signIn = action({
  args: {
    provider: v.optional(v.string()),
    verifier: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    params: v.optional(v.any()),
    calledBy: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const params = args.params as Record<string, unknown> | undefined;
    const flow = typeof params?.flow === "string" ? params.flow : undefined;
    const email = typeof params?.email === "string" ? params.email : undefined;
    if (email && flow) {
      await ctx.runMutation(internal.authRateLimit.checkAndRecordAuthAttempt, { email, flow });
    }
    return await ctx.runAction(api.auth.rawSignIn, args);
  },
});

// Lets the frontend know whether to show the real Google button or the
// graceful "not set up yet" fallback — mirrors the AI_NOT_CONFIGURED pattern.
export const isGoogleConfigured = query({
  args: {},
  handler: async () => hasGoogleConfig,
});
