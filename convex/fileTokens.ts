import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// 5 minutes — long enough for a browser's PDF viewer to make several range
// requests while a user reads a document, short enough that a leaked link
// stops working almost immediately. Not single-use: some in-browser PDF
// viewers issue multiple GETs for the same URL to page through a document,
// and consuming the token on the first byte would break the rest of it.
const TOKEN_TTL_MS = 5 * 60 * 1000;

// Called from inside an already-authorized mutation (vault.ts, clientIntakes.ts)
// right after it verifies the caller actually owns the document. The token
// itself becomes the credential from here on — same unguessable-random-string
// pattern already used for client-intake share links.
export async function mintFileToken(
  ctx: MutationCtx,
  args: { storageId: Id<"_storage">; fileName: string; mimeType?: string },
): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "");
  await ctx.db.insert("file_download_tokens", {
    token,
    storageId: args.storageId,
    fileName: args.fileName,
    mimeType: args.mimeType,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

// Called from the /files/download httpAction — read-only, never mutates,
// so a browser retrying/re-requesting the same URL within the TTL always
// gets the same answer instead of a token that vanishes after one read.
export const validateFileToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("file_download_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!row || row.expiresAt < Date.now()) return null;
    return { storageId: row.storageId, fileName: row.fileName, mimeType: row.mimeType };
  },
});

// Daily cleanup — expired tokens are already rejected by validateFileToken,
// this just stops the table growing forever.
export const cleanupExpiredTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deleted = 0;
    // Bounded loop: delete in batches so a large backlog can't blow past
    // this single mutation's execution limits. Each batch only ever
    // contains genuinely expired rows (indexed on expiresAt), so deleting
    // them always shrinks what the next iteration finds.
    for (let i = 0; i < 20; i++) {
      const expired = await ctx.db
        .query("file_download_tokens")
        .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
        .take(200);
      if (expired.length === 0) break;
      for (const row of expired) await ctx.db.delete(row._id);
      deleted += expired.length;
      if (expired.length < 200) break;
    }
    return deleted;
  },
});
