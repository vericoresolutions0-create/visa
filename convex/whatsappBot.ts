import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, query } from "./_generated/server";
import { requireAdmin } from "./admin.ts";

// Lets the admin panel know whether to show the WhatsApp setup panel — same
// "not configured yet" pattern used for Stripe, Paystack, Google, Telegram.
export const isWhatsAppConfigured = query({
  args: {},
  handler: async () =>
    Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_NUMBER,
    ),
});

// Twilio's signature algorithm (https://www.twilio.com/docs/usage/security):
// take the full request URL, append every POST parameter name+value pair —
// sorted alphabetically by name, no delimiters between pairs or within a
// pair — then HMAC-SHA1 the result with the Auth Token and base64-encode
// it. Structurally different from both Stripe's (HMAC-SHA256 over
// "timestamp.body", hex) and Paystack's (HMAC-SHA512 over raw body, hex)
// verifiers already in this file, so it can't reuse either directly.
export async function verifyTwilioSignature(
  fullUrl: string,
  params: URLSearchParams,
  signatureHeader: string | null,
  authToken: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const sortedKeys = Array.from(new Set(params.keys())).sort();
  let stringToSign = fullUrl;
  for (const key of sortedKeys) {
    stringToSign += key + (params.get(key) ?? "");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(stringToSign));
  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  if (expectedBase64.length !== signatureHeader.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedBase64.length; i++) {
    mismatch |= expectedBase64.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return mismatch === 0;
}

export const logBotInteraction = internalMutation({
  args: {
    fromNumber: v.string(),
    questionText: v.string(),
    matchedDestination: v.optional(v.string()),
    matchedVisaType: v.optional(v.string()),
    matched: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("whatsapp_bot_log", { ...args, createdAt: new Date().toISOString() });
  },
});

export const getBotStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const recent = await ctx.db.query("whatsapp_bot_log").withIndex("by_created").order("desc").take(50);
    const matchedCount = recent.filter((r) => r.matched).length;
    return {
      recent,
      totalLogged: recent.length,
      matchedCount,
      matchRate: recent.length > 0 ? Math.round((matchedCount / recent.length) * 100) : 0,
    };
  },
});

// Sends a real WhatsApp message via Twilio's Messages API (Basic Auth with
// Account SID + Auth Token) — an internal action, not a mutation, since it
// makes a real outbound network call. Honest no-op (throws, never silently
// "succeeds") if Twilio isn't configured on this deployment yet.
export const sendWhatsAppReply = internalAction({
  args: { to: v.string(), body: v.string() },
  handler: async (_ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
      throw new ConvexError({ code: "NOT_CONFIGURED", message: "Twilio WhatsApp credentials are not set on this deployment yet." });
    }

    const params = new URLSearchParams({
      To: `whatsapp:${args.to}`,
      From: `whatsapp:${fromNumber}`,
      Body: args.body,
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: params.toString(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new ConvexError({ code: "TWILIO_ERROR", message: `Twilio send failed: ${text}` });
    }
  },
});
