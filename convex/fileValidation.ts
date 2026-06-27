import { ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// Validates the actual stored blob (size + content type Convex recorded at
// upload time), never the client-supplied fileSize/mimeType arguments —
// those are just claims and can't be trusted. Deletes the blob and throws
// if it fails either check, so a rejected upload doesn't leak storage.
export async function validateUploadedFile(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
): Promise<void> {
  const meta = await ctx.db.system.get("_storage", storageId);
  if (!meta) {
    throw new ConvexError({
      code: "UPLOAD_NOT_FOUND",
      message: "This upload could not be found. Please try uploading again.",
    });
  }
  if (meta.size > MAX_UPLOAD_BYTES) {
    await ctx.storage.delete(storageId);
    throw new ConvexError({
      code: "FILE_TOO_LARGE",
      message: "Files must be under 15MB.",
    });
  }
  if (!meta.contentType || !ALLOWED_UPLOAD_MIME_TYPES.has(meta.contentType)) {
    await ctx.storage.delete(storageId);
    throw new ConvexError({
      code: "INVALID_FILE_TYPE",
      message: "Only PDF, JPEG, PNG, or WEBP files are allowed.",
    });
  }
}
