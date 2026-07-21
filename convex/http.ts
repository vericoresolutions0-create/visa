import { auth } from "./auth.js";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildReplyForMessage, deriveWebhookSecret } from "./telegramBot.ts";
import { verifyTwilioSignature } from "./whatsappBot.ts";
import { captureException } from "./exceptionLog.ts";

const http = httpRouter();

auth.addHttpRoutes(http);

// Public health check — no auth required. Used by uptime monitors (UptimeRobot,
// BetterUptime, etc.) to confirm the backend is reachable. Does a real, cheap
// database read (not just a static response) so a genuinely broken database
// connection surfaces as a failing check instead of a false "ok".
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx) => {
    let dbOk = true;
    try {
      await ctx.runQuery(internal.systemHealth.pingDb, {});
    } catch {
      dbOk = false;
    }

    return new Response(
      JSON.stringify({
        status: dbOk ? "ok" : "degraded",
        service: "visaclear-api",
        dbOk,
        checkedAt: new Date().toISOString(),
      }),
      { status: dbOk ? 200 : 503, headers: { "Content-Type": "application/json" } },
    );
  }),
});

// Serves real client files (Vault documents, agent client-intake documents)
// behind a short-lived bearer token instead of Convex's own permanent,
// unauthenticated storage.getUrl links. The token itself is the credential —
// it was only ever minted after a fresh ownership check in vault.ts /
// clientIntakes.ts, and expires in 5 minutes (see convex/fileTokens.ts).
// The frontend's own download button does `fetch(url)` (to force a save-as
// instead of a navigation) from the app's origin — a different origin than
// this httpAction's *.convex.site domain, so the response needs a matching
// CORS header or the browser silently rejects the fetch. Reflect the
// request's Origin only when it's the real frontend (or, in local dev, the
// loopback address), rather than allowing any site to pull these links.
function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const siteUrl = process.env.SITE_URL || "https://visaclear.app";
  if (origin === siteUrl) return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

http.route({
  path: "/files/download",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const cors = allowedOrigin(request);
    const corsHeaders: Record<string, string> = cors
      ? { "Access-Control-Allow-Origin": cors, Vary: "Origin" }
      : {};

    const token = new URL(request.url).searchParams.get("token");
    if (!token) return new Response("Missing token.", { status: 400, headers: corsHeaders });

    const record = await ctx.runQuery(internal.fileTokens.validateFileToken, { token });
    if (!record) {
      return new Response("This link has expired. Go back and open the document again.", { status: 410, headers: corsHeaders });
    }

    const blob = await ctx.storage.get(record.storageId);
    if (!blob) return new Response("File not found.", { status: 404, headers: corsHeaders });

    // Strip anything that isn't a plain printable ASCII char (and drop
    // quotes specifically) before it goes into a response header — a
    // label/filename is user-supplied text and must not break out of the
    // quoted Content-Disposition attribute.
    const safeFileName = record.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");

    return new Response(blob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": record.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeFileName}"`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
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

        if (!metadata.userId || !metadata.product || !metadata.plan || !metadata.billingCycle) {
          const msg = `incomplete metadata (userId=${metadata.userId}, product=${metadata.product}, plan=${metadata.plan}, billingCycle=${metadata.billingCycle}) — plan not activated, needs manual review.`;
          console.error(`stripe webhook checkout.session.completed: ${msg} session=${session.id}, event=${event.id}`);
          await captureException(ctx, "stripe.webhook.checkout.session.completed", msg);
          break;
        }

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
            const msg = `failed to fetch charge ${chargeId} for event ${event.id}`;
            console.error(`charge.dispute.created: ${msg}`);
            await captureException(ctx, "stripe.webhook.charge.dispute.created", msg);
          }
        } else if (!stripeSecretKey) {
          const msg = `STRIPE_SECRET_KEY not set, cannot resolve charge ${chargeId} for event ${event.id}`;
          console.error(`charge.dispute.created: ${msg}`);
          await captureException(ctx, "stripe.webhook.charge.dispute.created", msg);
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
        // event.data.amount is the real charge in NGN kobo — do not use it
        // for amountCents, which every downstream consumer (commissions,
        // subscriptionAmountCents) expects to be USD cents. metadata.amountCents
        // was set at checkout-init time (paystack.ts) to the canonical USD
        // price for this plan/cycle.
        if (!metadata.amountCents) {
          const msg = `missing amountCents metadata for reference=${event.data?.reference}, userId=${metadata.userId} — skipping plan activation, needs manual review.`;
          console.error(`paystack webhook charge.success: ${msg}`);
          await captureException(ctx, "paystack.webhook.charge.success", msg);
        } else {
          await ctx.runMutation(internal.billing.applyOneTimePlanPayment, {
            userId: metadata.userId,
            plan: metadata.plan,
            billingCycle: metadata.billingCycle,
            amountCents: Number(metadata.amountCents) || 0,
            paystackReference: String(event.data?.reference ?? "") || undefined,
          });
        }
      } else {
        const msg = `missing required metadata (userId/plan/billingCycle) for reference=${event.data?.reference} — skipping, needs manual review.`;
        console.error(`paystack webhook charge.success: ${msg}`);
        await captureException(ctx, "paystack.webhook.charge.success", msg);
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
    // Constant-time compare, same as the Stripe/Paystack signature checks
    // above — a plain !== leaks timing information proportional to how many
    // leading characters match, in principle usable to brute-force the
    // secret one character at a time.
    const expectedSecret = await deriveWebhookSecret(botToken);
    const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (!providedSecret || providedSecret.length !== expectedSecret.length) {
      return new Response("Invalid secret", { status: 401 });
    }
    let secretMismatch = 0;
    for (let i = 0; i < expectedSecret.length; i++) {
      secretMismatch |= providedSecret.charCodeAt(i) ^ expectedSecret.charCodeAt(i);
    }
    if (secretMismatch !== 0) {
      return new Response("Invalid secret", { status: 401 });
    }

    let update: Record<string, unknown>;
    try {
      update = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Telegram can redeliver an update it considers slow/unacknowledged
    // even after a 200 response — this is real, not hypothetical, so skip
    // straight to acking anything already handled before doing any work.
    const updateId = update.update_id;
    if (updateId !== undefined && updateId !== null) {
      const isNewUpdate: boolean = await ctx.runMutation(internal.telegramBot.claimUpdateForProcessing, {
        updateId: String(updateId),
      });
      if (!isNewUpdate) {
        return new Response(null, { status: 200 });
      }
    }

    const message = update.message as Record<string, unknown> | null | undefined;
    const chat = message?.chat as Record<string, unknown> | null | undefined;
    const chatId = chat?.id;
    const text = message?.text;

    if (chatId && typeof text === "string") {
      const { replyText, matchedDestination, matchedVisaType, matched } = buildReplyForMessage(text);

      // A failed Telegram send (rate limit, blocked bot, brief outage) must
      // never crash the whole webhook response — same best-effort spirit as
      // the WhatsApp route below. Without this, an unwrapped failure here
      // propagated as an unhandled action error, which Convex surfaces as a
      // non-200 response, and Telegram retries on non-2xx too.
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: replyText }),
        });
        if (!res.ok) {
          console.error(`Telegram sendMessage returned ${res.status} for chat [redacted]`);
        }
      } catch (err) {
        console.error(`Failed to send Telegram reply to chat [redacted]`, err);
      }

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
