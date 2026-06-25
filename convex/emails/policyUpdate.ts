"use node";

import { Hercules } from "@usehercules/sdk";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

// Shares the same email dependency as emails/reminder.ts — both need a live
// HERCULES_API_KEY (or, once migrated, a standalone provider) to actually send.
const hercules = new Hercules({
  apiKey: process.env.HERCULES_API_KEY!,
  apiVersion: "2025-12-09",
});

export const sendPolicyUpdateEmail = internalAction({
  args: {
    to: v.string(),
    countryName: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (_ctx, args) => {
    await hercules.email.send({
      from: "hello@vericore.app",
      to: args.to,
      subject: `${args.countryName} policy update — VisaClear`,
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
            <div style="display:inline-block;background:#e8f0fe;border:1px solid #4285F4;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:#1a56b8;margin-bottom:20px;">
              ${args.countryName.toUpperCase()} POLICY UPDATE
            </div>
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 12px;font-weight:600;">${args.title}</h2>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;white-space:pre-line;">${args.body}</p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="https://visaclear.vericore.app/dashboard" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                View My Dashboard &rarr;
              </a>
            </div>
            <p style="font-size:12px;color:#999;line-height:1.6;text-align:center;font-style:italic;margin:0;">
              You are receiving this because you are watching ${args.countryName} on VisaClear.
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
