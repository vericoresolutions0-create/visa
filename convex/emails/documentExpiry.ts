"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";

// ─── Document expiry warning email ───────────────────────────────────────────
export const sendDocumentExpiryEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    documentLabel: v.string(),
    expiryDate: v.string(),
    daysRemaining: v.number(),
  },
  handler: async (_ctx, args) => {
    if (!args.to) return;

    const formattedDate = new Date(args.expiryDate).toLocaleDateString(
      "en-GB",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    );

    const urgency = args.daysRemaining <= 7 ? "URGENT — " : "";
    const subject = `${urgency}Document expiring in ${args.daysRemaining} days: ${args.documentLabel} — VisaClear`;
    const badgeColor = args.daysRemaining <= 7 ? "#dc2626" : "#d97706";
    const badgeBg = args.daysRemaining <= 7 ? "#fef2f2" : "#fffbeb";
    const badgeBorder = args.daysRemaining <= 7 ? "#fca5a5" : "#fcd34d";
    const badgeLabel =
      args.daysRemaining <= 7
        ? `EXPIRES IN ${args.daysRemaining} DAYS`
        : "EXPIRY WARNING — 30 DAYS";

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
              ${badgeLabel}
            </div>
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 8px;font-weight:600;">Document Expiring Soon</h2>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 4px;">Hi ${escapeHtml(args.name)},</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
              Your document stored in the VisaClear Vault is expiring soon. Please renew it before your visa application deadline to avoid delays.
            </p>
            <div style="background:#f8f5ef;border-radius:10px;padding:18px 20px;margin-bottom:24px;border-left:3px solid #b8953c;">
              <div style="font-size:12px;color:#b8953c;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Document</div>
              <div style="font-size:16px;color:#0f2040;font-weight:600;">${escapeHtml(args.documentLabel)}</div>
              <div style="font-size:13px;color:#666;margin-top:4px;">Expires: ${formattedDate}</div>
            </div>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${siteUrl}/dashboard/vault" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                View My Vault &rarr;
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

    await sendEmail({ to: args.to, subject, html });
  },
});

// ─── Trip deadline email ──────────────────────────────────────────────────────
export const sendTripDeadlineEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    tripName: v.string(),
    travelDate: v.string(),
    daysRemaining: v.number(),
    progress: v.number(),
  },
  handler: async (_ctx, args) => {
    if (!args.to) return;

    const formattedDate = new Date(args.travelDate).toLocaleDateString(
      "en-GB",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    );

    const dayWord = args.daysRemaining === 1 ? "day" : "days";
    const subject = `Your trip is in ${args.daysRemaining} ${dayWord}: ${args.tripName} — VisaClear`;
    const urgency = args.daysRemaining <= 3 ? "#dc2626" : "#d97706";
    const progressColor = args.progress >= 80 ? "#16a34a" : args.progress >= 50 ? "#d97706" : "#dc2626";

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
            <div style="display:inline-block;background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:${urgency};margin-bottom:20px;">
              TRIP IN ${args.daysRemaining} ${dayWord.toUpperCase()}
            </div>
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 8px;font-weight:600;">Your Travel Date Is Approaching</h2>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 4px;">Hi ${escapeHtml(args.name)},</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
              Your upcoming trip is getting close. Make sure your visa checklist is complete before your application deadline.
            </p>
            <div style="background:#f8f5ef;border-radius:10px;padding:18px 20px;margin-bottom:16px;border-left:3px solid #b8953c;">
              <div style="font-size:12px;color:#b8953c;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Trip</div>
              <div style="font-size:16px;color:#0f2040;font-weight:600;">${escapeHtml(args.tripName)}</div>
              <div style="font-size:13px;color:#666;margin-top:4px;">Travel date: ${formattedDate}</div>
            </div>
            <div style="background:#f8f5ef;border-radius:10px;padding:14px 20px;margin-bottom:24px;">
              <div style="font-size:12px;color:#888;margin-bottom:8px;">Checklist progress</div>
              <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;">
                <div style="background:${progressColor};height:100%;width:${args.progress}%;border-radius:999px;"></div>
              </div>
              <div style="font-size:13px;color:${progressColor};font-weight:600;margin-top:6px;">${args.progress}% complete</div>
            </div>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${siteUrl}/dashboard" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                View My Checklist &rarr;
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

    await sendEmail({ to: args.to, subject, html });
  },
});
