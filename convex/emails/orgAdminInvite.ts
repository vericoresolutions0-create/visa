"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";

// ─── Co-admin invite email (build queue item #24) ─────────────────────────────
export const sendOrgAdminInviteEmail = internalAction({
  args: { to: v.string(), inviterName: v.string(), orgName: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const { to, inviterName, orgName, token } = args;
    const safeOrgName = escapeHtml(orgName);
    const safeInviterName = escapeHtml(inviterName);
    const subject = `${inviterName} added you as an admin on ${orgName} — VisaClear`;
    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const inviteUrl = `${siteUrl}/business/admin-invite/${token}`;
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
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 16px;font-weight:600;">You've been invited to co-admin ${safeOrgName}</h2>
            <p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 16px;">
              ${safeInviterName} has invited you to be an admin on ${safeOrgName}'s VisaClear organisation. If you accept, you'll be able to invite and track your cohort, export compliance reports, and manage the organisation alongside ${safeInviterName} — full admin access, same as they have.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${inviteUrl}" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Review Invitation &rarr;
              </a>
            </div>
            <p style="font-size:12px;color:#999;line-height:1.6;text-align:center;font-style:italic;margin:0;">
              &ldquo;It&rsquo;s all about Privacy.&rdquo; Nothing changes on your account until you explicitly accept.
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
