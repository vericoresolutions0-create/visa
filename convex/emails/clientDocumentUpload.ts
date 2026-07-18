"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail";

export const sendAgentUploadAlert = internalAction({
  args: {
    to: v.string(),
    agentName: v.string(),
    clientName: v.string(),
    documentLabel: v.string(),
    destination: v.string(),
  },
  handler: async (ctx, args) => {
    const dashboardUrl = process.env.SITE_URL
      ? `${process.env.SITE_URL}/agents/dashboard`
      : "https://visaclear.app/agents/dashboard";

    await sendEmail(ctx, {
      to: args.to,
      subject: `${args.clientName} just uploaded a document`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;background:#fff;">
          <p style="font-size:18px;font-weight:700;margin:0 0 28px;">VisaClear</p>

          <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">New document uploaded</h1>
          <p style="color:#555;line-height:1.6;margin:0 0 24px;">
            Hi ${args.agentName},<br><br>
            Your client <strong>${args.clientName}</strong> uploaded a document for their
            <strong>${args.destination}</strong> visa application.
          </p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
            <tr>
              <td style="padding:10px 14px;background:#f5f5f5;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#777;border-radius:6px 6px 0 0;">Document</td>
            </tr>
            <tr>
              <td style="padding:12px 14px;border:1px solid #e5e5e5;border-top:none;font-weight:600;border-radius:0 0 6px 6px;">${args.documentLabel}</td>
            </tr>
          </table>

          <a href="${dashboardUrl}"
             style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;margin-bottom:36px;">
            View on dashboard
          </a>

          <p style="font-size:12px;color:#999;border-top:1px solid #e5e5e5;padding-top:16px;margin:0;">
            VisaClear · Built with GDPR &amp; NDPA Principles · CISA Certified
          </p>
        </div>
      `,
    });
  },
});
