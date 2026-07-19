import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { validateUploadedFile } from "./fileValidation";
import { getCurrentUser, getCurrentUserOrThrow as getUserOrThrow } from "./authHelpers.ts";
import { checkUserDailyLimit } from "./rateLimits.ts";
import { mintFileToken } from "./fileTokens.ts";

const VAULT_CATEGORIES = [
  "identity",
  "financial",
  "employment",
  "travel",
  "education",
  "photo",
  "legal",
  "medical",
  "other",
] as const;

function requirePlan(plan: string | undefined) {
  if (plan !== "pro" && plan !== "expert") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "The Document Vault is a Pro feature. Upgrade at /pricing.",
    });
  }
}

const EXPIRY_REMINDER_LEAD_DAYS = 60;

// Reminders use date-only strings (YYYY-MM-DD), matching reminderProcessor.ts's
// "today" comparison format. Clamped to today so an expiry that's already
// closer than the lead time still gets a reminder tomorrow, not one dated
// in the past that the dispatch cron would (correctly) treat as overdue but
// the user never got advance warning for.
function computeExpiryReminderDueDate(expiryDate: string, leadDays: number = EXPIRY_REMINDER_LEAD_DAYS): string {
  const dueMs = new Date(expiryDate).getTime() - leadDays * 24 * 60 * 60 * 1000;
  const todayStr = new Date().toISOString().split("T")[0];
  const dueStr = new Date(dueMs).toISOString().split("T")[0];
  return dueStr < todayStr ? todayStr : dueStr;
}

// ─── Get a URL to upload a vault document to ─────────────────────────────────
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUserOrThrow(ctx);
    requirePlan(user.plan);
    await checkUserDailyLimit(ctx, user._id, "vault_upload", 20, "You can upload up to 20 documents per day. Resets at midnight UTC.");
    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Record a vault document after it has been uploaded ─────────────────────
export const addDocument = mutation({
  args: {
    storageId: v.id("_storage"),
    category: v.union(...VAULT_CATEGORIES.map((c) => v.literal(c))),
    label: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    expiryDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    requirePlan(user.plan);
    if (args.label.length > 200) throw new ConvexError({ code: "BAD_REQUEST", message: "Label must be under 200 characters." });
    if (args.fileName.length > 260) throw new ConvexError({ code: "BAD_REQUEST", message: "File name is too long." });
    if (args.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(args.expiryDate)) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Expiry date must be in YYYY-MM-DD format." });
    }
    await checkUserDailyLimit(
      ctx, user._id, "vault_upload", 20,
      "You can upload up to 20 documents per day. Resets at midnight UTC.",
    );
    await validateUploadedFile(ctx, args.storageId);
    const docId = await ctx.db.insert("vault_documents", {
      userId: user._id,
      category: args.category,
      label: args.label,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      expiryDate: args.expiryDate,
      uploadedAt: new Date().toISOString(),
    });

    // Auto-create the reminder so a user who sets an expiry date at upload
    // time never has to remember to come back and set one manually.
    if (args.expiryDate && user.email) {
      await ctx.db.insert("reminders", {
        userId: user._id,
        vaultDocumentId: docId,
        title: `${args.label} expires soon`,
        note: `This document in your Vault expires on ${args.expiryDate}.`,
        dueDate: computeExpiryReminderDueDate(args.expiryDate),
        email: user.email,
        sent: false,
        createdAt: new Date().toISOString(),
      });
    }

    return docId;
  },
});

// ─── Update a document's expiry date after upload ────────────────────────────
export const updateDocumentExpiry = mutation({
  args: { id: v.id("vault_documents"), expiryDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    requirePlan(user.plan);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this document" });
    }
    await ctx.db.patch(args.id, { expiryDate: args.expiryDate });

    // Keep any existing unsent reminder in sync with the corrected date,
    // rather than leaving it pointing at a now-wrong expiry. If the expiry
    // was cleared, leave an existing reminder alone — the user may still
    // want to be reminded even without a tracked date.
    if (args.expiryDate) {
      const existingReminder = (
        await ctx.db.query("reminders").withIndex("by_user", (q) => q.eq("userId", user._id)).take(200)
      ).find((r) => r.vaultDocumentId === args.id && !r.sent);

      const dueDate = computeExpiryReminderDueDate(args.expiryDate);
      if (existingReminder) {
        await ctx.db.patch(existingReminder._id, { dueDate });
      } else if (user.email) {
        await ctx.db.insert("reminders", {
          userId: user._id,
          vaultDocumentId: args.id,
          title: `${doc.label} expires soon`,
          note: `This document in your Vault expires on ${args.expiryDate}.`,
          dueDate,
          email: user.email,
          sent: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  },
});

// ─── Manual backfill: set a reminder for a document that predates auto-creation ──
export const createExpiryReminder = mutation({
  args: { id: v.id("vault_documents"), leadDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    requirePlan(user.plan);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this document" });
    }
    if (!doc.expiryDate) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Add an expiry date to this document first." });
    }
    if (!user.email) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Your account needs an email address to receive reminders." });
    }

    const existingReminder = (
      await ctx.db.query("reminders").withIndex("by_user", (q) => q.eq("userId", user._id)).take(200)
    ).find((r) => r.vaultDocumentId === args.id && !r.sent);
    if (existingReminder) {
      throw new ConvexError({ code: "ALREADY_EXISTS", message: "A reminder is already set for this document." });
    }

    const leadDays = args.leadDays ?? EXPIRY_REMINDER_LEAD_DAYS;
    if (!Number.isInteger(leadDays) || leadDays < 1 || leadDays > 365) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Lead days must be a whole number between 1 and 365." });
    }

    return await ctx.db.insert("reminders", {
      userId: user._id,
      vaultDocumentId: args.id,
      title: `${doc.label} expires soon`,
      note: `This document in your Vault expires on ${doc.expiryDate}.`,
      dueDate: computeExpiryReminderDueDate(doc.expiryDate, leadDays),
      email: user.email,
      sent: false,
      createdAt: new Date().toISOString(),
    });
  },
});

// ─── List my vault documents, newest first ───────────────────────────────────
// No download URL here anymore — those are minted on demand (see
// getDocumentDownloadUrl below) so a link can't outlive this list forever.
// `url: null` keeps the returned shape identical to the demo-mode documents
// the vault page merges this with, so the frontend doesn't need two types.
export const listMyDocuments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    // Return empty rather than throw: a plan downgrade shouldn't crash the
    // page for a real user (this query fires unconditionally on load) — the
    // frontend's own canUseVault check (driven by user.plan, not this list)
    // is what shows the upgrade prompt instead of the vault UI.
    if (user.plan !== "pro" && user.plan !== "expert") return [];
    const docs = await ctx.db
      .query("vault_documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);
    return docs.map((doc) => ({ ...doc, url: null as string | null }));
  },
});

// ─── Mint a short-lived, single-purpose link to actually view/download a
// document. Re-checks ownership fresh every time it's called, unlike a
// permanent storage.getUrl link generated once and handed out forever.
export const getDocumentDownloadUrl = mutation({
  args: { documentId: v.id("vault_documents") },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    requirePlan(user.plan);
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.userId !== user._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Document not found." });
    }

    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) {
      throw new ConvexError({ code: "NOT_CONFIGURED", message: "File serving isn't available right now." });
    }

    const token = await mintFileToken(ctx, {
      storageId: doc.storageId,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
    });
    return `${siteUrl}/files/download?token=${token}`;
  },
});

// ─── Delete a vault document ──────────────────────────────────────────────────
export const deleteDocument = mutation({
  args: { id: v.id("vault_documents") },
  handler: async (ctx, args) => {
    const user = await getUserOrThrow(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found" });
    if (doc.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You don't have access to this document" });
    }
    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(args.id);
  },
});
