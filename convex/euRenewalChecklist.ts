import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./authHelpers.ts";

const MAX_DOCUMENT_ID_LENGTH = 100;
const MAX_CHECKED_DOCUMENTS = 50;

// ─── Read my EU renewal checklist state ──────────────────────────────────────
export const getMyEuRenewalChecklist = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const row = await ctx.db
      .query("eu_renewal_checklist")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return row?.checkedDocumentIds ?? [];
  },
});

// ─── Toggle a single document's checked state ────────────────────────────────
// Upserts rather than requiring the frontend to send the full array on every
// click — the server owns the actual add/remove so two rapid toggles (or two
// open tabs) can't race and silently drop one of them the way a client-diffed
// full-array overwrite could.
export const toggleEuRenewalDocument = mutation({
  args: { documentId: v.string(), checked: v.boolean() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!args.documentId || args.documentId.length > MAX_DOCUMENT_ID_LENGTH) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid document id." });
    }

    const existing = await ctx.db
      .query("eu_renewal_checklist")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const current = new Set(existing?.checkedDocumentIds ?? []);
    if (args.checked) {
      if (!current.has(args.documentId) && current.size >= MAX_CHECKED_DOCUMENTS) {
        throw new ConvexError({ code: "BAD_REQUEST", message: "Too many checklist items." });
      }
      current.add(args.documentId);
    } else {
      current.delete(args.documentId);
    }

    const checkedDocumentIds = [...current];
    if (existing) {
      await ctx.db.patch(existing._id, { checkedDocumentIds, updatedAt: new Date().toISOString() });
    } else {
      await ctx.db.insert("eu_renewal_checklist", {
        userId: user._id,
        checkedDocumentIds,
        updatedAt: new Date().toISOString(),
      });
    }
    return checkedDocumentIds;
  },
});
