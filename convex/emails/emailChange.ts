"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";

export const sendEmailChangeConfirmationEmail = internalAction({
  args: { to: v.string(), token: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const { to, token, name } = args;
    const safeName = escapeHtml(name);
    const subject = "Confirm your new VisaClear email";
    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const confirmUrl = `${siteUrl}/settings/confirm-email/${token}`;
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
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 16px;font-weight:600;">Hi ${safeName}, confirm this is your new email.</h2>
            <p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 24px;">
              You (or someone signed in to your account) requested to change the email address on your VisaClear account to this one. Click below to confirm — this link expires in 1 hour and can only be used once.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${confirmUrl}" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Confirm New Email &rarr;
              </a>
            </div>
            <p style="font-size:12px;color:#999;line-height:1.6;text-align:center;font-style:italic;margin:0;">
              If you didn't request this, you can safely ignore this email — your account email won't change.
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

export const sendEmailChangeNoticeEmail = internalAction({
  args: { to: v.string(), newEmail: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const { to, newEmail, name } = args;
    const safeName = escapeHtml(name);
    const safeNewEmail = escapeHtml(newEmail);
    const subject = "Your VisaClear email is changing";
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
          <td style="background:#0f2040;padding:32px 40px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:28px;color:#ffffff;font-weight:600;letter-spacing:-0.5px;">VisaClear</div>
            <div style="font-size:11px;color:#b8a06a;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">by Vericore</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 16px;font-weight:600;">Hi ${safeName}, your email is changing.</h2>
            <p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 16px;">
              We received a request to change the email address on your VisaClear account to <strong>${safeNewEmail}</strong>. The change won't take effect until that address is confirmed.
            </p>
            <p style="font-size:14px;color:#666;line-height:1.7;margin:0;">
              <strong>If you didn't request this</strong>, sign in to your account and cancel the pending change from Settings, or contact us at <a href="mailto:hello@visaclear.app" style="color:#0f2040;">hello@visaclear.app</a>.
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
