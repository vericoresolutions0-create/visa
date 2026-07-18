"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";

export const sendSettleInReadyEmail = internalAction({
  args: { to: v.string(), destination: v.string(), tripId: v.string() },
  handler: async (ctx, args) => {
    const { to, destination, tripId } = args;
    const safeDestination = escapeHtml(destination);
    const subject = `Your ${destination} visa is approved — here's what's next`;
    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const tripUrl = `${siteUrl}/dashboard/trips/${tripId}`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0f2040;padding:32px 40px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:28px;color:#ffffff;font-weight:600;letter-spacing:-0.5px;">VisaClear</div>
            <div style="font-size:11px;color:#b8a06a;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">by Vericore</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 16px;font-weight:600;">Congratulations — your ${safeDestination} visa is approved.</h2>
            <p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 16px;">
              The hard part is done. We've unlocked your Settle-In Toolkit for ${safeDestination} — a checklist for opening a bank account, getting a local SIM, registering for tax/social ID, sorting housing, and registering for healthcare, plus what to do in your first 30 days.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${tripUrl}" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Open Your Settle-In Toolkit &rarr;
              </a>
            </div>
            <p style="font-size:12px;color:#999;line-height:1.6;text-align:center;font-style:italic;margin:0;">
              &ldquo;It&rsquo;s all about Privacy.&rdquo; Congratulations from the whole VisaClear team.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f5ef;padding:20px 40px;text-align:center;border-top:1px solid #ede8df;">
            <p style="font-size:11px;color:#aaa;margin:0;">
              &copy; ${new Date().getFullYear()} Vericore Ltd &nbsp;·&nbsp;
              <a href="${siteUrl}/privacy" style="color:#aaa;">Privacy Policy</a> &nbsp;·&nbsp;
              <a href="${siteUrl}/terms" style="color:#aaa;">Terms</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await sendEmail(ctx, { to, subject, html });
  },
});
