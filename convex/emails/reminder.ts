"use node";

import { Hercules } from "@usehercules/sdk";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

const hercules = new Hercules({
  apiKey: process.env.HERCULES_API_KEY!,
  apiVersion: "2025-12-09",
});

export const sendReminderEmail = internalAction({
  args: {
    to: v.string(),
    title: v.string(),
    dueDate: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const formattedDate = new Date(args.dueDate).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    await hercules.email.send({
      from: "hello@vericore.app",
      to: args.to,
      subject: `Reminder: ${args.title} — VisaClear`,
      html: `
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
            <div style="display:inline-block;background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:#7a5300;margin-bottom:20px;">
              REMINDER DUE
            </div>
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 8px;font-weight:600;">${args.title}</h2>
            <p style="font-size:14px;color:#b8a06a;font-weight:600;margin:0 0 20px;">Due: ${formattedDate}</p>
            ${args.note ? `<p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 20px;padding:14px 16px;background:#f8f5ef;border-radius:8px;border-left:3px solid #b8953c;">${args.note}</p>` : ""}
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">
              This is your scheduled visa application reminder from VisaClear. Please check your application progress and complete any outstanding items before your deadline.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="https://visaclear.vericore.app/dashboard" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                View My Dashboard &rarr;
              </a>
            </div>
            <p style="font-size:12px;color:#999;line-height:1.6;text-align:center;font-style:italic;margin:0;">
              &ldquo;It&rsquo;s all about Privacy.&rdquo; &nbsp;&middot;&nbsp; GDPR &amp; NDPA Compliant
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f5ef;padding:18px 40px;text-align:center;border-top:1px solid #ede8df;">
            <p style="font-size:11px;color:#aaa;margin:0;">
              &copy; ${new Date().getFullYear()} Vericore Ltd &nbsp;&middot;&nbsp;
              <a href="https://visaclear.vericore.app/privacy" style="color:#aaa;">Privacy Policy</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  },
});
