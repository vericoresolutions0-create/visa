import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { validateUploadedFile } from "./fileValidation";
import { getCurrentUser, getCurrentUserOrThrow } from "./authHelpers.ts";

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

// ─── Agent: create a new client intake + shareable upload link ────────────────
export const createIntake = mutation({
  args: {
    clientName: v.string(),
    clientEmail: v.optional(v.string()),
    clientPhone: v.optional(v.string()),
    destination: v.string(),
    visaType: v.string(),
    sourceContactRequestId: v.optional(v.id("agent_contact_requests")),
  },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);
    if (!agent.agentPlan) {
      throw new ConvexError({ code: "FORBIDDEN", message: "An active agent plan is required to create client intakes." });
    }

    const token = generateToken();
    await ctx.db.insert("client_intakes", {
      agentId: agent._id,
      token,
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      clientPhone: args.clientPhone,
      destination: args.destination,
      visaType: args.visaType,
      status: "awaiting_documents",
      sourceContactRequestId: args.sourceContactRequestId,
      createdAt: new Date().toISOString(),
    });
    return { token };
  },
});

// ─── Agent: list my clients with their uploaded documents ─────────────────────
export const listMyIntakes = query({
  args: {},
  handler: async (ctx) => {
    const agent = await getCurrentUser(ctx);
    // Require an active agent plan — a lapsed plan means the agent is no
    // longer entitled to access client documents.
    if (!agent || !agent.agentPlan) return [];

    const intakes = await ctx.db
      .query("client_intakes")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .order("desc")
      .take(200);

    return await Promise.all(
      intakes.map(async (intake) => {
        const documents = await ctx.db
          .query("client_documents")
          .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
          .collect();
        const documentsWithUrls = await Promise.all(
          documents.map(async (doc) => ({
            _id: doc._id,
            label: doc.label,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
            uploadedAt: doc.uploadedAt,
            url: await ctx.storage.getUrl(doc.storageId),
          })),
        );
        const claimedBy = intake.claimedByUserId
          ? await ctx.db.get(intake.claimedByUserId)
          : null;
        return {
          _id: intake._id,
          token: intake.token,
          clientName: intake.clientName,
          clientEmail: intake.clientEmail,
          clientPhone: intake.clientPhone,
          destination: intake.destination,
          visaType: intake.visaType,
          status: intake.status,
          createdAt: intake.createdAt,
          claimedByEmail: claimedBy?.email,
          sourceContactRequestId: intake.sourceContactRequestId,
          documents: documentsWithUrls,
        };
      }),
    );
  },
});

// ─── Agent: update intake status ───────────────────────────────────────────────
export const updateIntakeStatus = mutation({
  args: {
    token: v.string(),
    status: v.union(
      v.literal("awaiting_documents"),
      v.literal("documents_received"),
      v.literal("in_review"),
      v.literal("complete"),
    ),
  },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);

    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) throw new ConvexError({ code: "NOT_FOUND", message: "Client not found" });
    if (intake.agentId !== agent._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your client" });
    }

    await ctx.db.patch(intake._id, { status: args.status });
  },
});

// ─── Public: look up basic intake info by share-link token ────────────────────
export const getIntakeByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) return null;
    // clientName is PII — never returned to an unauthenticated caller.
    // The client already knows their own name; the portal only needs to
    // confirm the visa route so they know they're in the right place.
    return {
      destination: intake.destination,
      visaType: intake.visaType,
      status: intake.status,
    };
  },
});

// ─── Client (must be signed in): list documents I've already uploaded here ────
export const listMyUploadsForIntake = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const client = await getCurrentUser(ctx);
    if (!client) return [];

    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) return [];

    const documents = await ctx.db
      .query("client_documents")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .collect();
    return documents
      .filter((doc) => doc.uploadedByUserId === client._id)
      .map((doc) => ({ label: doc.label, fileName: doc.fileName, uploadedAt: doc.uploadedAt }));
  },
});

// ─── Client (must be signed in): get a URL to upload a document to ────────────
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) throw new ConvexError({ code: "NOT_FOUND", message: "This upload link is invalid or has expired" });

    if (intake.claimedByUserId && intake.claimedByUserId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "This upload link has already been claimed by another account." });
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Client (must be signed in): record a document after it has been uploaded ─
export const recordDocument = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    label: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const client = await getCurrentUserOrThrow(ctx);

    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) throw new ConvexError({ code: "NOT_FOUND", message: "This upload link is invalid or has expired" });

    if (intake.claimedByUserId && intake.claimedByUserId !== client._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "This upload link has already been claimed by another account." });
    }

    await validateUploadedFile(ctx, args.storageId);

    await ctx.db.insert("client_documents", {
      intakeId: intake._id,
      label: args.label,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      uploadedByUserId: client._id,
      uploadedAt: new Date().toISOString(),
    });

    const patch: Partial<typeof intake> = {};
    if (intake.status === "awaiting_documents") patch.status = "documents_received";
    if (!intake.claimedByUserId) patch.claimedByUserId = client._id;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(intake._id, patch);
    }
  },
});
