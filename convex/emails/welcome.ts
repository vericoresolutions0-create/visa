"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";

export const sendWelcomeEmail = internalAction({
  args: { to: v.string(), name: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const { to, name } = args;
    const displayName = name ?? "there";
    const subject = "Welcome to VisaClear — Your visa checklist is ready";
    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0f2040;padding:32px 40px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:28px;color:#ffffff;font-weight:600;letter-spacing:-0.5px;">VisaClear</div>
            <div style="font-size:11px;color:#b8a06a;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">by Vericore</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="font-size:15px;color:#333;margin:0 0 12px;">Hi ${escapeHtml(displayName)},</p>
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 16px;font-weight:600;">Welcome to VisaClear.</h2>
            <p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 20px;">
              You now have access to precise, personalised visa document checklists built for applicants who deserve more than vague embassy advice.
            </p>
            <p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 24px;">
              Here is what you can do:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              ${[
                ["Generate your checklist", "Pick your origin and destination — get a precise document list in 60 seconds."],
                ["Set deadline reminders", "Never miss a biometric appointment or document expiry."],
                ["AI Rejection Analyser", "Paste a refusal letter and get a step-by-step recovery plan."],
                ["Find a verified agent", "Browse immigration agents who specialise in your route."],
              ].map(([t, d]) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0ede6;">
                  <div style="font-weight:600;font-size:13px;color:#0f2040;">${t}</div>
                  <div style="font-size:12px;color:#888;margin-top:2px;">${d}</div>
                </td>
              </tr>`).join("")}
            </table>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${siteUrl}/checklist" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Get My Free Checklist &rarr;
              </a>
            </div>
            <p style="font-size:12px;color:#999;line-height:1.6;text-align:center;font-style:italic;margin:0;">
              &ldquo;It&rsquo;s all about Privacy.&rdquo; Your data is never sold. Built with GDPR &amp; NDPA principles.
            </p>
          </td>
        </tr>
        <!-- Footer -->
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

    await sendEmail({ to, subject, html });
  },
});
