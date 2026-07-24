"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";

// ─── Visa/permit renewal warning email ────────────────────────────────────────
// Real legal stakes: missing a renewal window can mean losing status
// entirely, not just an inconvenience — this is why the thresholds start
// at 90 days rather than the 30/7-day pattern used for lower-stakes vault
// document expiry.
export const sendVisaRenewalWarningEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    visaType: v.string(),
    hostCountry: v.string(),
    expiryDate: v.string(),
    daysRemaining: v.number(),
  },
  handler: async (ctx, args) => {
    if (!args.to) return;

    const formattedDate = new Date(args.expiryDate).toLocaleDateString(
      "en-GB",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    );

    const urgent = args.daysRemaining <= 30;
    const subject = `${urgent ? "URGENT — " : ""}Your ${args.visaType} status expires in ${args.daysRemaining} days — VisaClear`;
    const badgeColor = urgent ? "#dc2626" : "#d97706";
    const badgeBg = urgent ? "#fef2f2" : "#fffbeb";
    const badgeBorder = urgent ? "#fca5a5" : "#fcd34d";

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
            <div style="display:inline-block;background:${badgeBg};border:1px solid ${badgeBorder};border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:${badgeColor};margin-bottom:20px;">
              EXPIRES IN ${args.daysRemaining} DAYS
            </div>
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 8px;font-weight:600;">Time to start your renewal</h2>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 4px;">Hi ${escapeHtml(args.name)},</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
              Your ${escapeHtml(args.visaType)} status in ${escapeHtml(args.hostCountry)} is approaching its expiry date. Missing a renewal window can mean losing your status entirely — starting early gives you the most room to gather documents and deal with any delays.
            </p>
            <div style="background:#f8f5ef;border-radius:10px;padding:18px 20px;margin-bottom:24px;border-left:3px solid #b8953c;">
              <div style="font-size:12px;color:#b8953c;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Status</div>
              <div style="font-size:16px;color:#0f2040;font-weight:600;">${escapeHtml(args.visaType)} — ${escapeHtml(args.hostCountry)}</div>
              <div style="font-size:13px;color:#666;margin-top:4px;">Expires: ${formattedDate}</div>
            </div>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${siteUrl}/dashboard/immigration-status" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Review My Renewal Checklist &rarr;
              </a>
            </div>
            <p style="font-size:12px;color:#999;line-height:1.6;text-align:center;font-style:italic;margin:0;">
              This is a helpful reminder, not legal advice. Always verify your specific renewal deadline and requirements with the official immigration authority.
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
