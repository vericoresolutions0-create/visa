"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";

const PLAN_LABELS: Record<string, string> = {
  agent_listing: "Listing",
  agent_featured: "Featured",
  agency_white_label: "White Label",
};

// ─── Agent payment failed email ───────────────────────────────────────────────
export const sendAgentPaymentFailedEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    plan: v.union(
      v.literal("agent_listing"),
      v.literal("agent_featured"),
      v.literal("agency_white_label"),
    ),
    amountCents: v.number(),
    nextPaymentAttempt: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    if (!args.to) return;

    const planLabel = PLAN_LABELS[args.plan] ?? args.plan;
    const amount = (args.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    const isFinal = !args.nextPaymentAttempt;
    const subject = isFinal
      ? `URGENT — Final payment attempt failed for your ${planLabel} plan — VisaClear`
      : `Payment failed for your ${planLabel} plan — VisaClear`;

    const retryLine = isFinal
      ? "This was the final retry — your plan will end if payment isn't updated."
      : args.nextPaymentAttempt
        ? `We'll automatically retry on ${new Date(args.nextPaymentAttempt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
        : "";

    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0f2040;padding:28px 40px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:24px;color:#ffffff;font-weight:600;">VisaClear</div>
            <div style="font-size:10px;color:#b8a06a;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">by Vericore</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 28px;">
            <div style="display:inline-block;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:#dc2626;margin-bottom:20px;">
              ${isFinal ? "FINAL ATTEMPT FAILED" : "PAYMENT FAILED"}
            </div>
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 8px;font-weight:600;">We Couldn't Process Your Payment</h2>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 4px;">Hi ${escapeHtml(args.name)},</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
              Your card was declined for your <strong>${escapeHtml(planLabel)}</strong> plan renewal. ${escapeHtml(retryLine)}
            </p>
            <div style="background:#f8f5ef;border-radius:10px;padding:18px 20px;margin-bottom:24px;border-left:3px solid #b8953c;">
              <div style="font-size:12px;color:#b8953c;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Amount Due</div>
              <div style="font-size:16px;color:#0f2040;font-weight:600;">${amount}</div>
            </div>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${siteUrl}/agents/dashboard" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Update Payment Method &rarr;
              </a>
            </div>
            <p style="font-size:12px;color:#999;line-height:1.6;text-align:center;font-style:italic;margin:0;">
              &ldquo;It&rsquo;s all about Privacy.&rdquo; &nbsp;&middot;&nbsp; GDPR &amp; NDPA Principles
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f5ef;padding:18px 40px;text-align:center;border-top:1px solid #ede8df;">
            <p style="font-size:11px;color:#aaa;margin:0;">
              &copy; ${new Date().getFullYear()} Vericore Ltd &nbsp;&middot;&nbsp;
              <a href="${siteUrl}/privacy" style="color:#aaa;">Privacy Policy</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await sendEmail(ctx, { to: args.to, subject, html });
  },
});
