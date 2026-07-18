"use node";

import OpenAI from "openai";
import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendEmail } from "./sendEmail.ts";

export const sendAgentWelcomeEmail = internalAction({
  args: {
    to: v.string(),
    agentName: v.string(),
    specialisations: v.array(v.string()),
    country: v.string(),
    yearsExperience: v.number(),
    bio: v.string(),
    region: v.optional(v.union(v.literal("global"), v.literal("europe"))),
  },
  handler: async (ctx, args) => {
    const { to, agentName, specialisations, country, yearsExperience, bio, region } = args;

    // Generate an AI bio suggestion — this is a draft for the agent to review,
    // not a replacement for their own words.
    let aiBioSuggestion: string | null = null;
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = `You are helping a visa immigration professional write a short, compelling professional bio for their VisaClear agent listing.

Agent details:
- Name: ${agentName}
- Country: ${country}
- Years of experience: ${yearsExperience}
- Specialisations: ${specialisations.join(", ")}
- Their own words: ${bio.slice(0, 500)}
${region ? `- Market focus: ${region === "europe" ? "Europe / EU" : "Global"}` : ""}

Write a 2-3 sentence professional bio in third person that highlights their expertise, experience, and the types of applicants they can best help. Keep it direct and specific — no filler phrases like "passionate about" or "dedicated to". Mention their specialisations naturally.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.6,
      });
      aiBioSuggestion = response.choices[0]?.message?.content?.trim() ?? null;
    } catch {
      // Non-fatal — the email still sends without the bio suggestion
    }

    const siteUrl = process.env.SITE_URL || "https://visaclear.app";
    const dashboardUrl = `${siteUrl}/agents/dashboard`;

    const bioPart = aiBioSuggestion
      ? `
        <tr>
          <td style="padding:0 40px 28px;">
            <p style="font-size:13px;color:#888;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">AI-drafted bio suggestion</p>
            <div style="background:#f8f6f2;border-left:3px solid #b8a06a;border-radius:4px;padding:14px 16px;">
              <p style="font-size:14px;color:#444;line-height:1.7;margin:0;">${escapeHtml(aiBioSuggestion)}</p>
            </div>
            <p style="font-size:12px;color:#aaa;margin:8px 0 0;">This is a starting point — edit it in your dashboard to match your voice.</p>
          </td>
        </tr>`
      : "";

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
            <div style="font-size:11px;color:#b8a06a;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Agent Partner Programme</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 24px;">
            <p style="font-size:15px;color:#333;margin:0 0 12px;">Hi ${escapeHtml(agentName)},</p>
            <h2 style="font-family:Georgia,serif;font-size:22px;color:#0f2040;margin:0 0 16px;font-weight:600;">Your agent workspace is ready.</h2>
            <p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 20px;">
              Your agent account is live. Here's what's waiting for you:
            </p>
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
                  <span style="font-size:14px;color:#0f2040;font-weight:600;">Client pipeline</span>
                  <span style="font-size:14px;color:#666;"> — manage intakes, track cases, upload documents</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
                  <span style="font-size:14px;color:#0f2040;font-weight:600;">Lead Marketplace</span>
                  <span style="font-size:14px;color:#666;"> — browse real applicants looking for help right now</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
                  <span style="font-size:14px;color:#0f2040;font-weight:600;">AI Casework Assistant</span>
                  <span style="font-size:14px;color:#666;"> — ask about your cases, draft follow-ups, flag stalled clients</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;">
                  <span style="font-size:14px;color:#0f2040;font-weight:600;">White-label option</span>
                  <span style="font-size:14px;color:#666;"> — run VisaClear under your own brand</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${bioPart}
        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 32px;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#0f2040;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.02em;">
              Get started →
            </a>
          </td>
        </tr>
        <!-- What's next -->
        <tr>
          <td style="padding:0 40px 32px;">
            <p style="font-size:13px;color:#888;margin:0 0 10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">What happens next</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #f0ece4;">
                  ✓ &nbsp;Our team reviews your credentials (typically 1–2 business days)
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #f0ece4;">
                  ✓ &nbsp;You receive a verification confirmation
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#555;">
                  ✓ &nbsp;Lead marketplace unlocks — applicants start finding you
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Reply line -->
        <tr>
          <td style="padding:0 40px 32px;">
            <p style="font-size:14px;color:#666;line-height:1.7;margin:0;">
              Any questions, reply to this email — we're here.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f6f2;padding:24px 40px;text-align:center;">
            <p style="font-size:12px;color:#aaa;margin:0;">
              VisaClear · by Vericore · <a href="${siteUrl}" style="color:#b8a06a;text-decoration:none;">visaclear.app</a>
            </p>
            <p style="font-size:11px;color:#bbb;margin:6px 0 0;">
              Built with GDPR &amp; NDPA principles · CISA Certified
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await sendEmail(ctx, {
      to,
      subject: `Welcome to VisaClear, ${agentName} — your agent workspace is ready`,
      html,
    });
  },
});
