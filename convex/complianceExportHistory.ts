import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getMyOrgAdminMembershipOrThrow } from "./organizations.ts";
import { assertNotSuspended } from "./authHelpers.ts";
import { mintFileToken } from "./fileTokens.ts";

// ─── Step 1: get an upload URL for the CSV the client already built ────────
// Same two-step generateUploadUrl → record pattern already used by
// vault.ts/clientIntakes.ts for real file uploads, not a new one invented
// for this feature.
export const generateExportUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await getMyOrgAdminMembershipOrThrow(ctx);
    assertNotSuspended(user);
    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Step 2: record the export after the CSV has actually been uploaded ────
export const recordComplianceExport = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    rowCount: v.number(),
  },
  handler: async (ctx, args) => {
    const { organizationId, user } = await getMyOrgAdminMembershipOrThrow(ctx);
    assertNotSuspended(user);
    if (args.fileName.length > 260) throw new ConvexError({ code: "BAD_REQUEST", message: "File name is too long." });
    if (args.rowCount < 0 || args.rowCount > 100000) throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid row count." });

    const org = await ctx.db.get(organizationId);
    await ctx.db.insert("compliance_export_history", {
      organizationId,
      exportedByUserId: user._id,
      exportedAt: new Date().toISOString(),
      rowCount: args.rowCount,
      orgType: org?.type,
      storageId: args.storageId,
      fileName: args.fileName,
    });
  },
});

// ─── List past exports for the caller's org ─────────────────────────────────
export const listMyExportHistory = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getMyOrgAdminMembershipOrThrow(ctx);
    const rows = await ctx.db
      .query("compliance_export_history")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(100);

    return await Promise.all(
      rows.map(async (row) => {
        const exportedBy = await ctx.db.get(row.exportedByUserId);
        return {
          _id: row._id,
          exportedAt: row.exportedAt,
          rowCount: row.rowCount,
          fileName: row.fileName,
          exportedByName: exportedBy?.name ?? exportedBy?.email ?? "Unknown",
        };
      }),
    );
  },
});

// ─── Real, re-checked-every-time download link for a past export ───────────
// Same short-lived bearer-token pattern as vault.ts/clientIntakes.ts's file
// downloads — never a permanent storage.getUrl() link handed out once and
// valid forever.
export const getExportDownloadUrl = mutation({
  args: { historyId: v.id("compliance_export_history") },
  handler: async (ctx, args) => {
    const { organizationId } = await getMyOrgAdminMembershipOrThrow(ctx);
    const row = await ctx.db.get(args.historyId);
    if (!row || row.organizationId !== organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Export not found." });
    }

    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) {
      throw new ConvexError({ code: "NOT_CONFIGURED", message: "File serving isn't available right now." });
    }

    const token = await mintFileToken(ctx, {
      storageId: row.storageId,
      fileName: row.fileName,
      mimeType: "text/csv",
    });
    return `${siteUrl}/files/download?token=${token}`;
  },
});
