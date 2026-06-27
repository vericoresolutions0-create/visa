import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { recordPartnerEvent } from "./partners.ts";

// Google only activates once AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET are set
// as Convex env vars — until then it's simply absent from the providers
// list, same "not configured yet" pattern used for the AI features.
const hasGoogleConfig = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
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

// Lets the frontend know whether to show the real Google button or the
// graceful "not set up yet" fallback — mirrors the AI_NOT_CONFIGURED pattern.
export const isGoogleConfigured = query({
  args: {},
  handler: async () => hasGoogleConfig,
});
