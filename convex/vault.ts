import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const VAULT_CATEGORIES = [
  "identity",
  "financial",
  "employment",
  "travel",
  "education",
  "photo",
] as const;

async function getUserOrThrow(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
  return user;
}

function requirePlan(plan: string | undefined) {
  if (plan !== "pro" && plan !== "expert") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "The Document Vault is a Pro feature. Upgrade at /pricing.",
    });
  }
}

// ─── Get a URL to upload a vault document to ─────────────────────────────────
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUserOrThrow(ctx);
    requirePlan(user.plan);
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
    return await ctx.db.insert("vault_documents", {
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
  },
});

// ─── List my vault documents (with download URLs), newest first ─────────────
export const listMyDocuments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];
    const docs = await ctx.db
      .query("vault_documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      })),
    );
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
