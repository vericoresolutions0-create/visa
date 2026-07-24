"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export const sendApplicantDigestEmail = internalAction({
  args: {
    to: v.string(),
    name: v.string(),
    expiringDocs: v.array(v.object({ label: v.string(), expiryDate: v.string() })),
    staleChecklists: v.array(v.object({ destination: v.string(), visaType: v.string(), progress: v.number() })),
    embassyUpdates: v.array(v.object({ destination: v.string(), summary: v.union(v.string(), v.null()) })),
  },
  handler: async (ctx, args) => {
    if (!args.to) return;
    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const itemCount = args.expiringDocs.length + args.staleChecklists.length + args.embassyUpdates.length;
    const subject = `Your VisaClear weekly update — ${itemCount} thing${itemCount === 1 ? "" : "s"} to check`;

    const sections: string[] = [];

    if (args.expiringDocs.length > 0) {
      const rows = args.expiringDocs
        .map((d) => `<li style="margin-bottom:6px;"><strong>${escapeHtml(d.label)}</strong> — expires ${fmtDate(d.expiryDate)}</li>`)
        .join("");
      sections.push(`
        <div style="margin-bottom:24px;">
          <div style="font-size:12px;color:#b8953c;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Documents expiring soon</div>
          <ul style="margin:0;padding-left:18px;font-size:14px;color:#444;line-height:1.6;">${rows}</ul>
        </div>`);
    }

    if (args.embassyUpdates.length > 0) {
      const rows = args.embassyUpdates
        .map((u) => `<li style="margin-bottom:6px;"><strong>${escapeHtml(u.destination)}</strong>${u.summary ? ` — ${escapeHtml(u.summary)}` : " — the official page changed this week"}</li>`)
        .join("");
      sections.push(`
        <div style="margin-bottom:24px;">
          <div style="font-size:12px;color:#b8953c;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Embassy updates for your destinations</div>
          <ul style="margin:0;padding-left:18px;font-size:14px;color:#444;line-height:1.6;">${rows}</ul>
        </div>`);
    }

    if (args.staleChecklists.length > 0) {
      const rows = args.staleChecklists
        .map((c) => `<li style="margin-bottom:6px;"><strong>${escapeHtml(c.destination)} ${escapeHtml(c.visaType)}</strong> — ${c.progress}% complete</li>`)
        .join("");
      sections.push(`
        <div style="margin-bottom:24px;">
          <div style="font-size:12px;color:#b8953c;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Checklists waiting for you</div>
          <ul style="margin:0;padding-left:18px;font-size:14px;color:#444;line-height:1.6;">${rows}</ul>
        </div>`);
    }

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
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 8px;font-weight:600;">Your weekly VisaClear update</h2>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">Hi ${escapeHtml(args.name)}, here's what's changed since your last visit.</p>
            ${sections.join("")}
            <div style="text-align:center;margin-top:8px;">
              <a href="${siteUrl}/dashboard" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
                Go to My Dashboard &rarr;
              </a>
            </div>
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
