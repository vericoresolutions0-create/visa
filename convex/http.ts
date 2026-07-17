import { auth } from "./auth.js";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildReplyForMessage, deriveWebhookSecret } from "./telegramBot.ts";
import { verifyTwilioSignature } from "./whatsappBot.ts";

const http = httpRouter();

auth.addHttpRoutes(http);

// Public health check — no auth required. Used by uptime monitors (UptimeRobot,
// BetterUptime, etc.) to confirm the backend is reachable. Returns 200 + JSON.
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({ status: "ok", service: "visaclear-api" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }),
});

// Stripe signs every webhook body with HMAC-SHA256 over "{timestamp}.{body}"
// — verified here with the Web Crypto API (no Node runtime available in an
// httpAction) instead of the Stripe SDK's own verifier, which assumes Node.
async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  // Split on first "=" only — base64 values can contain "=".
  // During Stripe signing-key rotation, multiple v1= entries are sent;
  // collect all of them and accept if any matches.
  const pairs = signatureHeader.split(",").map((part) => {
    const eqIdx = part.indexOf("=");
    return [part.slice(0, eqIdx), part.slice(eqIdx + 1)] as [string, string];
  });
  const timestamp = pairs.find(([k]) => k === "t")?.[1];
  const signatures = pairs.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return false;

  // 5-minute tolerance — guards against captured/replayed requests.
  // Guard against a non-numeric timestamp (NaN) which would make the
  // comparison trivially true.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

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

  return signatures.some((signature) => {
    if (expectedHex.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expectedHex.length; i++) {
      mismatch |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  });
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

        if (metadata.product === "credits" && metadata.userId && metadata.credits) {
          await ctx.runMutation(internal.marketplace.applyCreditPurchase, {
            agentUserId: metadata.userId,
            credits: Number(metadata.credits) || 0,
            amountPaidCents: Number(metadata.amountCents) || 0,
            source: "stripe",
            providerReference: event.id,
          });
          break;
        }

        if (!metadata.userId || !metadata.product || !metadata.plan || !metadata.billingCycle) break;

        if (metadata.oneTime === "true") {
          // Pix / boleto / OXXO — one-time, no stored instrument to renew.
          await ctx.runMutation(internal.billing.applyOneTimePlanPayment, {
            userId: metadata.userId,
            plan: metadata.plan,
            billingCycle: metadata.billingCycle,
            amountCents: Number(metadata.amountCents) || 0,
            stripeEventId: event.id,
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
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        // Skip the initial invoice — checkout.session.completed already handled
        // month 1. Only renewals (subscription_cycle, subscription_update, manual)
        // flow through here. "subscription_create" fires on the very first invoice
        // that Stripe generates the moment a subscription is created, so filtering
        // it out prevents a double-commission on that first payment.
        if (
          invoice.billing_reason !== "subscription_create" &&
          invoice.subscription &&
          (invoice.amount_paid ?? 0) > 0
        ) {
          await ctx.runMutation(internal.billing.applySubscriptionRenewal, {
            stripeSubscriptionId: String(invoice.subscription),
            amountCents: Number(invoice.amount_paid ?? 0),
            stripeEventId: event.id,
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
      // A paid-for plan shouldn't stay active once the money is taken back.
      // The charge's own metadata (inherited from the Checkout Session)
      // reliably identifies the user for one-time payments and a
      // subscription's first charge; applyPaymentReversed falls back to a
      // stripeCustomerId lookup for later renewal charges, which don't
      // carry that metadata.
      case "charge.refunded": {
        const charge = event.data.object;
        await ctx.runMutation(internal.billing.applyPaymentReversed, {
          stripeEventId: event.id,
          stripeCustomerId: charge.customer ? String(charge.customer) : undefined,
          userId: charge.metadata?.userId || undefined,
          product: charge.metadata?.product === "agent" ? "agent" : charge.metadata?.product === "applicant" ? "applicant" : undefined,
          reason: "refunded",
        });
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object;
        // Webhook payloads send the charge as a plain ID, not expanded —
        // fetch it for .customer/.metadata, same info charge.refunded gets
        // for free. Raw REST call (not the Stripe SDK) for the same reason
        // as the signature verifier above: httpActions don't run in Node.
        const chargeId = String(dispute.charge ?? "");
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (chargeId && stripeSecretKey) {
          const chargeRes = await fetch(`https://api.stripe.com/v1/charges/${chargeId}`, {
            headers: { Authorization: `Bearer ${stripeSecretKey}` },
          });
          if (chargeRes.ok) {
            const charge = await chargeRes.json();
            await ctx.runMutation(internal.billing.applyPaymentReversed, {
              stripeEventId: event.id,
              stripeCustomerId: charge.customer ? String(charge.customer) : undefined,
              userId: charge.metadata?.userId || undefined,
              product: charge.metadata?.product === "agent" ? "agent" : charge.metadata?.product === "applicant" ? "applicant" : undefined,
              reason: "disputed",
            });
          } else {
            console.error(`charge.dispute.created: failed to fetch charge ${chargeId} for event ${event.id}`);
          }
        } else if (!stripeSecretKey) {
          console.error(`charge.dispute.created: STRIPE_SECRET_KEY not set, cannot resolve charge ${chargeId} for event ${event.id}`);
        }
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
          paystackReference: String(event.data?.reference ?? "") || undefined,
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

    let update: Record<string, unknown>;
    try {
      update = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    const message = update.message as Record<string, unknown> | null | undefined;
    const chat = message?.chat as Record<string, unknown> | null | undefined;
    const chatId = chat?.id;
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
