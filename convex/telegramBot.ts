import { ConvexError, v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { requireAdmin } from "./admin.ts";
import { CHECKLISTS_WITH_DATA, getChecklist, type VisaType } from "../src/lib/visa-data.ts";

// Lets the admin panel know whether to show "Connect Telegram Bot" — same
// "not configured yet" pattern used for Stripe, Paystack, and Google.
export const isTelegramConfigured = query({
  args: {},
  handler: async () => Boolean(process.env.TELEGRAM_BOT_TOKEN),
});

// Common short forms real users actually type — deliberately small and
// hand-maintained rather than fuzzy-matched, so a match is always a real,
// confident match (no fallible guessing about what country someone meant).
const DESTINATION_ALIASES: Record<string, string> = {
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  us: "United States",
  usa: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  america: "United States",
  uae: "UAE",
  emirates: "UAE",
  dubai: "UAE",
  holland: "Netherlands",
};

const VISA_TYPE_KEYWORDS: Record<string, VisaType> = {
  tourist: "tourist",
  tourism: "tourist",
  visit: "tourist",
  visiting: "tourist",
  visitor: "tourist",
  holiday: "tourist",
  vacation: "tourist",
  student: "student",
  study: "student",
  studying: "student",
  school: "student",
  university: "student",
  work: "work",
  working: "work",
  job: "work",
  employment: "work",
  family: "family",
  spouse: "family",
  marriage: "family",
  partner: "family",
  transit: "transit",
  transiting: "transit",
  layover: "transit",
};

function findDestination(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [alias, real] of Object.entries(DESTINATION_ALIASES)) {
    if (lower.includes(alias)) return real;
  }
  for (const destination of CHECKLISTS_WITH_DATA) {
    if (lower.includes(destination.toLowerCase())) return destination;
  }
  return undefined;
}

function findVisaType(text: string): VisaType | undefined {
  const lower = text.toLowerCase();
  for (const [keyword, type] of Object.entries(VISA_TYPE_KEYWORDS)) {
    if (lower.includes(keyword)) return type;
  }
  return undefined;
}

const SITE_URL_FALLBACK = "https://visaclear.onhercules.app";

export type BotReply = {
  replyText: string;
  matchedDestination?: string;
  matchedVisaType?: VisaType;
  matched: boolean;
};

// Pure, deterministic — no AI call. The whole point of the bot is a fast,
// always-correct answer pulled from the same real checklist data the
// website uses, not a generative guess that could hallucinate documents.
export function buildReplyForMessage(text: string): BotReply {
  const trimmed = text.trim();
  const siteUrl = process.env.SITE_URL || SITE_URL_FALLBACK;

  if (trimmed === "/start" || trimmed === "/help") {
    return {
      matched: false,
      replyText:
        "👋 Welcome to VisaClear!\n\nAsk me things like:\n" +
        '"What documents do I need for a UK tourist visa?"\n' +
        '"Canada student visa requirements"\n\n' +
        `Or get the full checklist with PDF export and reminders at ${siteUrl}/checklist`,
    };
  }

  const destination = findDestination(trimmed);
  if (!destination) {
    return {
      matched: false,
      replyText:
        "I couldn't recognise a destination in your question. Try naming a country directly, e.g. " +
        '"UK tourist visa documents" or "Canada student visa requirements".\n\n' +
        `For the full list of destinations we cover, visit ${siteUrl}/checklist`,
    };
  }

  const visaType = findVisaType(trimmed) ?? "tourist";
  const checklist = getChecklist(destination, visaType);
  if (!checklist) {
    return {
      matched: false,
      matchedDestination: destination,
      replyText:
        `I don't have a ${visaType} visa checklist for ${destination} yet. ` +
        `See what's available at ${siteUrl}/checklist`,
    };
  }

  const requiredItems = checklist.items.filter((i) => i.required);
  const lines = requiredItems.map((item, i) => `${i + 1}. ${item.title}`);
  const visaLabel = visaType.charAt(0).toUpperCase() + visaType.slice(1);

  const replyText =
    `📋 ${destination} ${visaLabel} Visa — Required Documents\n\n` +
    `${lines.join("\n")}\n\n` +
    `⏱ Typical processing time: ${checklist.processingTime}\n` +
    `💰 Fee: ${checklist.fee}\n\n` +
    `Get the full checklist with descriptions, a downloadable PDF, and deadline reminders:\n` +
    `${siteUrl}/checklist?to=${encodeURIComponent(destination)}&type=${visaType}`;

  return { matched: true, matchedDestination: destination, matchedVisaType: visaType, replyText };
}

export const logBotInteraction = internalMutation({
  args: {
    chatId: v.string(),
    questionText: v.string(),
    matchedDestination: v.optional(v.string()),
    matchedVisaType: v.optional(v.string()),
    matched: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("telegram_bot_log", { ...args, createdAt: new Date().toISOString() });
  },
});

export const getBotStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const recent = await ctx.db.query("telegram_bot_log").withIndex("by_created").order("desc").take(50);
    const matchedCount = recent.filter((r) => r.matched).length;
    return {
      recent,
      totalLogged: recent.length,
      matchedCount,
      matchRate: recent.length > 0 ? Math.round((matchedCount / recent.length) * 100) : 0,
    };
  },
});

// Derives the Telegram webhook secret from the bot token itself via
// SHA-256, instead of storing a second secret somewhere — both this action
// and the webhook handler in http.ts compute the same value from the same
// env var, so there's nothing extra for a human to set or remember.
export async function deriveWebhookSecret(botToken: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`visaclear-telegram:${botToken}`));
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Admin-triggered, one-time setup action — registers this deployment's
// HTTP endpoint as the bot's webhook with Telegram, so the founder never
// has to manually call Telegram's API from a terminal.
export const registerWebhook = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; description?: string }> => {
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (user?.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!botToken || !siteUrl) {
      throw new ConvexError({
        code: "NOT_CONFIGURED",
        message: "TELEGRAM_BOT_TOKEN is not set on this deployment yet.",
      });
    }

    const secretToken = await deriveWebhookSecret(botToken);
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `${siteUrl}/telegram/webhook`,
        secret_token: secretToken,
      }),
    });
    const data = await response.json();
    return { ok: Boolean(data.ok), description: data.description };
  },
});
