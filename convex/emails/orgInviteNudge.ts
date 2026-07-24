"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";
import { memberNoun } from "../orgHelpers.ts";

// ─── "Invite your next hire" nudge email ──────────────────────────────────────
// Sent by orgNudgeDispatch.ts to an org admin who hasn't invited anyone (of
// any status) in 30+ days. Deliberately low-key — this is a "come back when
// you're ready" prompt, not a countdown or a paywall, since inviting more
// people is free and entirely the org's own call.
export const sendOrgInviteNudgeEmail = internalAction({
  args: { to: v.string(), name: v.optional(v.string()), orgName: v.string(), orgType: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.to) return;
    const noun = memberNoun(args.orgType);
    const singular = noun === "students" ? "student" : noun === "clients" ? "client" : "employee";
    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const subject = `Ready to invite your next ${singular} to VisaClear?`;

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
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 8px;font-weight:600;">Bring your next ${escapeHtml(singular)} on board</h2>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 4px;">Hi ${escapeHtml(args.name ?? "there")},</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
              It's been a little while since ${escapeHtml(args.orgName)} last invited a ${escapeHtml(singular)} to VisaClear. Whenever you have someone new relocating, sending an invite takes under a minute — they get a real visa checklist, and you get live readiness tracking for your whole cohort in one place.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${siteUrl}/business/dashboard" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Invite someone new &rarr;
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
