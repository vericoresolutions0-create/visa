import { auth } from "./auth.js";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildReplyForMessage, deriveWebhookSecret } from "./telegramBot.ts";
import { verifyTwilioSignature } from "./whatsappBot.ts";

const http = httpRouter();

auth.addHttpRoutes(http);

// Stripe signs every webhook body with HMAC-SHA256 over "{timestamp}.{body}"
// — verified here with the Web Crypto API (no Node runtime available in an
// httpAction) instead of the Stripe SDK's own verifier, which assumes Node.
async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => part.split("=") as [string, string]),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // 5 minute tolerance — same default Stripe's own libraries use, guards
  // against a captured/replayed webhook request being resent later.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  if (expectedHex.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return new Response("Stripe webhook not configured", { status: 500 });
    }

    const payload = await request.text();
    const isValid = await verifyStripeSignature(
      payload,
      request.headers.get("stripe-signature"),
      secret,
    );
    if (!isValid) {
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(payload);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const metadata = session.metadata ?? {};
        if (!metadata.userId || !metadata.product || !metadata.plan || !metadata.billingCycle) break;

        if (metadata.oneTime === "true") {
          // Pix / boleto / OXXO — one-time, no stored instrument to renew.
          await ctx.runMutation(internal.billing.applyOneTimePlanPayment, {
            userId: metadata.userId,
            plan: metadata.plan,
            billingCycle: metadata.billingCycle,
            amountCents: Number(metadata.amountCents) || 0,
          });
        } else {
          await ctx.runMutation(internal.billing.applyCheckoutCompleted, {
            userId: metadata.userId,
            product: metadata.product,
            plan: metadata.plan,
            billingCycle: metadata.billingCycle,
            amountCents: Number(metadata.amountCents) || 0,
            stripeCustomerId: String(session.customer),
            stripeSubscriptionId: String(session.subscription),
            stripeEventId: event.id,
            referralCode: metadata.referralCode || undefined,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await ctx.runMutation(internal.billing.applySubscriptionEnded, {
          stripeSubscriptionId: String(subscription.id),
        });
        break;
      }
      default:
        break;
    }

    return new Response(null, { status: 200 });
  }),
});

// Paystack signs every webhook body with HMAC-SHA512, hex-encoded, over the
// raw payload using the secret key — verified with Web Crypto for the same
// reason as Stripe's verifier above (httpActions don't run in Node).
async function verifyPaystackSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  if (expectedHex.length !== signatureHeader.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return mismatch === 0;
}

http.route({
  path: "/paystack/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return new Response("Paystack webhook not configured", { status: 500 });
    }

    const payload = await request.text();
    const isValid = await verifyPaystackSignature(
      payload,
      request.headers.get("x-paystack-signature"),
      secret,
    );
    if (!isValid) {
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(payload);

    if (event.event === "charge.success") {
      const metadata = event.data?.metadata ?? {};
      if (metadata.userId && metadata.plan && metadata.billingCycle) {
        await ctx.runMutation(internal.billing.applyOneTimePlanPayment, {
          userId: metadata.userId,
          plan: metadata.plan,
          billingCycle: metadata.billingCycle,
          amountCents: Number(event.data?.amount) || 0,
          paystackReference: String(event.data.reference ?? ""),
        });
      }
    }

    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return new Response("Telegram bot not configured", { status: 500 });
    }

    // Telegram echoes back whatever secret_token was set during
    // setWebhook registration on every real request — verifying it here
    // confirms the request actually came from Telegram, not a forged POST.
    const expectedSecret = await deriveWebhookSecret(botToken);
    const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (providedSecret !== expectedSecret) {
      return new Response("Invalid secret", { status: 401 });
    }

    const update = await request.json();
    const message = update.message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    if (chatId && typeof text === "string") {
      const { replyText, matchedDestination, matchedVisaType, matched } = buildReplyForMessage(text);

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: replyText }),
      });

      await ctx.runMutation(internal.telegramBot.logBotInteraction, {
        chatId: String(chatId),
        questionText: text,
        matchedDestination,
        matchedVisaType,
        matched,
      });
    }

    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/whatsapp/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      return new Response("WhatsApp bot not configured", { status: 500 });
    }

    // Twilio sends the body form-encoded, not JSON — the one place this
    // route structurally diverges from every other webhook in this file.
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);

    const isValid = await verifyTwilioSignature(
      request.url,
      params,
      request.headers.get("x-twilio-signature"),
      authToken,
    );
    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const fromRaw = params.get("From");
    const text = params.get("Body");
    const fromNumber = fromRaw?.replace(/^whatsapp:/, "");

    if (fromNumber && typeof text === "string") {
      const { replyText, matchedDestination, matchedVisaType, matched } = buildReplyForMessage(text);

      // A failed Twilio send (rate limit, unverified sandbox number, brief
      // outage) must never crash the whole webhook response — same
      // best-effort spirit as the Telegram route's fire-and-forget fetch.
      // Still logging on a send failure, and always returning 200, avoids
      // both losing analytics and triggering Twilio's retry-on-non-2xx
      // behaviour (which could otherwise double-send once the retry
      // succeeds).
      try {
        await ctx.runAction(internal.whatsappBot.sendWhatsAppReply, {
          to: fromNumber,
          body: replyText,
        });
      } catch (err) {
        console.error(`Failed to send WhatsApp reply to [redacted]`, err);
      }

      await ctx.runMutation(internal.whatsappBot.logBotInteraction, {
        fromNumber,
        questionText: text,
        matchedDestination,
        matchedVisaType,
        matched,
      });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
