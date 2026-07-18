import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, query } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
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

// convexAuthSignIn is Convex Auth's own unthrottled Password-provider
// action — it must NEVER be re-exported as a top-level `export const` from
// this file. Any exported action/mutation/query in a convex/*.ts file is
// registered as a callable function at "file:exportName", regardless of the
// name it's exported under — so a previous `export const rawSignIn = ...`
// here created a second, fully public, unthrottled entry point
// (`api.auth.rawSignIn`) sitting right next to the rate-limited `signIn`
// below, letting anyone skip the rate limiter by calling it directly.
// Instead, `signIn` below calls convexAuthSignIn's handler in-process via
// `_handler` — Convex's own sanctioned way to reuse one function's logic
// inside another without a second network-visible entry point (see
// https://docs.convex.dev/production/best-practices/#use-helper-functions-to-write-shared-code).
const callConvexAuthSignIn = (convexAuthSignIn as unknown as {
  _handler: (ctx: ActionCtx, args: unknown) => Promise<unknown>;
})._handler;

// Rate-limits signIn/signUp/reset attempts per email before delegating to
// the real implementation above — see convex/authRateLimit.ts and the
// comment on callConvexAuthSignIn for why this calls the handler directly
// instead of using Convex Auth's own `profile()` hook. Provider-initiated
// flows without an email/flow (e.g. starting Google sign-in) pass straight
// through unaffected.
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
    return await callConvexAuthSignIn(ctx, args);
  },
});

// Lets the frontend know whether to show the real Google button or the
// graceful "not set up yet" fallback — mirrors the AI_NOT_CONFIGURED pattern.
export const isGoogleConfigured = query({
  args: {},
  handler: async () => hasGoogleConfig,
});
