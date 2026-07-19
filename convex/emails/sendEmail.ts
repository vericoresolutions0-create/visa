"use node";

import { Resend } from "resend";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";

// Retries a transient failure (a bad minute on Resend's end, a network
// blip) before giving up — most delivery failures are exactly this kind of
// thing and don't need a human to ever find out about them. 3 attempts,
// short backoff, bounded well under any Convex action time limit.
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [400, 1200];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Single chokepoint for actually sending an email. Every email-sending
// action in this folder calls this instead of talking to a provider
// directly, so connecting (or swapping) a real provider only ever means
// changing this one file.
//
// Hardened 2026-07-18: previously, a Resend failure was only ever a
// console.error — no retry, no record, no way for anyone to know a real
// user's password-reset or email-change confirmation link never arrived.
// Now: transient failures are retried with backoff, and if every attempt
// fails, a durable row is written (convex/emails/emailFailures.ts) instead
// of vanishing into a log nobody's watching — visible on the admin System
// Health score and in a dedicated "Email Delivery" tab.
export async function sendEmail(
  ctx: ActionCtx,
  args: { to: string; subject: string; html: string },
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const domain = args.to.split("@")[1] ?? "?";
    console.log(`[email not sent: no provider configured] to=[redacted]@${domain} subject="${args.subject}"`);
    return;
  }

  const resend = new Resend(apiKey);
  let lastErrorMessage = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "VisaClear <hello@visaclear.app>",
        to: args.to,
        subject: args.subject,
        html: args.html,
      });
      if (!error) return; // delivered — done.
      lastErrorMessage = error.message || error.name || "Unknown Resend error";
    } catch (err) {
      // resend.emails.send() rejects (rather than returning { error }) on a
      // genuine network/transport failure — must be caught explicitly, or a
      // DNS blip would propagate as an unhandled action failure with no
      // record at all, which is the exact silent-failure bug being fixed.
      lastErrorMessage = err instanceof Error ? err.message : String(err);
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }
  }

  const domain = args.to.split("@")[1] ?? "?";
  console.error(
    `[email failed to send after ${MAX_ATTEMPTS} attempts] to=[redacted]@${domain} subject="${args.subject}"`,
    lastErrorMessage,
  );
  await ctx.runMutation(internal.emails.emailFailures.recordFailure, {
    to: args.to,
    subject: args.subject,
    errorMessage: lastErrorMessage.slice(0, 500),
    attempts: MAX_ATTEMPTS,
  });
}
