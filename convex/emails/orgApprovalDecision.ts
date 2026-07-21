"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";

export const sendOrgApprovalDecisionEmail = internalAction({
  args: {
    to: v.string(),
    orgName: v.string(),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const { to, orgName, decision } = args;
    const safeOrgName = escapeHtml(orgName);
    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const approved = decision === "approved";
    const subject = approved
      ? `${orgName} is approved on VisaClear`
      : `An update on ${orgName}'s VisaClear application`;

    const body = approved
      ? `<p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 24px;">You can now invite employees, students, or clients and start tracking their visa readiness.</p>
         <div style="text-align:center;margin-bottom:28px;">
           <a href="${siteUrl}/business/dashboard" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
             Go to Your Dashboard &rarr;
           </a>
         </div>`
      : `<p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 24px;">
           We weren't able to approve this application. If you think this is a mistake, just reply to this email and we'll take another look.
         </p>`;

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
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 16px;font-weight:600;">
              ${approved ? `${safeOrgName} is approved.` : `${safeOrgName}'s application wasn't approved.`}
            </h2>
            ${body}
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
