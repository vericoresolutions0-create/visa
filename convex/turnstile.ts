import { ConvexError } from "convex/values";
import { query } from "./_generated/server";

// Cloudflare Turnstile bot-defense on signup. Same "absent until configured"
// pattern as Google OAuth (see hasGoogleConfig in auth.ts) — until both env
// vars are set in the Convex dashboard, this is fully inert: no widget shown,
// no server-side check enforced, signup behaves exactly as it does today.
// TURNSTILE_SITE_KEY is not secret (Cloudflare's own site keys are meant to
// be embedded in public HTML) — TURNSTILE_SECRET_KEY must never be exposed.
export const hasTurnstileConfig = Boolean(
  process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY,
);

// Lets the frontend know whether to render the real widget or skip it
// entirely — mirrors isGoogleConfigured. Returns the site key itself since
// it's the public half of the pair and the widget needs it to render.
export const getSiteKey = query({
  args: {},
  handler: async (): Promise<string | null> =>
    hasTurnstileConfig ? (process.env.TURNSTILE_SITE_KEY as string) : null,
});

// Called from convex/auth.ts's signIn action, only when flow === "signUp"
// and hasTurnstileConfig is true. Not a registered Convex function — plain
// helper so it runs in-process inside the same action, same pattern as
// creditAgentReferralCommission/startEmailVerification elsewhere.
export async function verifyTurnstileToken(token: string | undefined): Promise<void> {
  if (!hasTurnstileConfig) return;
  if (!token) {
    throw new ConvexError({ code: "BOT_CHECK_FAILED", message: "Please complete the verification check and try again." });
  }

  const secret = process.env.TURNSTILE_SECRET_KEY as string;
  const body = new URLSearchParams({ secret, response: token });

  let ok = false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    ok = data.success === true;
  } catch {
    // Cloudflare unreachable — fail closed on a signup bot-check rather than
    // silently letting every signup through while the check is broken.
    ok = false;
  }

  if (!ok) {
    throw new ConvexError({ code: "BOT_CHECK_FAILED", message: "Verification check failed. Please try again." });
  }
}
