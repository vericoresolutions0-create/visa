"use node";

import { Resend } from "resend";

// Single chokepoint for actually sending an email. Every email-sending
// action in this folder calls this instead of talking to a provider
// directly, so connecting (or swapping) a real provider only ever means
// changing this one file.
export async function sendEmail(args: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email not sent: no provider configured] to=${args.to} subject="${args.subject}"`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "VisaClear <vericoresolutions0@gmail.com>",
    to: args.to,
    subject: args.subject,
    html: args.html,
  });

  if (error) {
    console.error(`[email failed to send] to=${args.to} subject="${args.subject}"`, error);
  }
}
