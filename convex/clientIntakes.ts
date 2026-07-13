import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
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
    if (!args.clientName.trim() || args.clientName.length > 200)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Client name must be under 200 characters." });
    if (args.clientEmail && args.clientEmail.length > 254)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Email address is too long." });
    if (args.clientPhone && args.clientPhone.length > 30)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Phone number is too long." });
    if (args.destination.length > 100)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Destination must be under 100 characters." });
    if (args.visaType.length > 100)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Visa type must be under 100 characters." });

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

    const intakes = (await ctx.db
      .query("client_intakes")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .order("desc")
      .take(200)).filter((i) => !i.archived);

    return await Promise.all(
      intakes.map(async (intake) => {
        const documents = await ctx.db
          .query("client_documents")
          .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
          .take(30);
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
          notes: intake.notes,
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
// The token itself is the credential — 128-bit entropy (32 hex chars)
// is unguessable, so returning clientName here is safe and removes the
// need for an additional account-based auth check in the portal.
export const getIntakeByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) return null;
    return {
      destination: intake.destination,
      visaType: intake.visaType,
      status: intake.status,
      clientName: intake.clientName,
    };
  },
});

// ─── Guest/client: list all documents uploaded under this intake token ────────
// No account required — the 128-bit token is the credential. Returns every
// document for this intake so the client can see what they've already sent.
export const listMyUploadsForIntake = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) return [];

    const documents = await ctx.db
      .query("client_documents")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .take(30);
    return documents.map((doc) => ({
      label: doc.label,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
    }));
  },
});

// ─── Guest/client: get a URL to upload a document to ─────────────────────────
// No account required. Rate-limited to 30 documents per intake per day.
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) throw new ConvexError({ code: "NOT_FOUND", message: "This upload link is invalid or has expired." });

    const today = new Date().toISOString().slice(0, 10);
    const existingDocs = await ctx.db
      .query("client_documents")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .take(500);
    if (existingDocs.filter((d) => d.uploadedAt.startsWith(today)).length >= 30) {
      throw new ConvexError({ code: "RATE_LIMITED", message: "Too many uploads today. Try again tomorrow." });
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Guest/client: record a document after it has been uploaded ───────────────
// No account required. The token proves the client is authorised for this
// intake. Rate-limited to 30 documents per intake per day.
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
    if (!args.label.trim() || args.label.length > 200)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Label must be under 200 characters." });
    if (args.fileName.length > 260)
      throw new ConvexError({ code: "BAD_REQUEST", message: "File name is too long." });

    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) throw new ConvexError({ code: "NOT_FOUND", message: "This upload link is invalid or has expired." });

    const today = new Date().toISOString().slice(0, 10);
    const existingDocs = await ctx.db
      .query("client_documents")
      .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
      .take(500);
    if (existingDocs.filter((d) => d.uploadedAt.startsWith(today)).length >= 30) {
      throw new ConvexError({ code: "RATE_LIMITED", message: "Too many uploads today. Try again tomorrow." });
    }

    await validateUploadedFile(ctx, args.storageId);

    await ctx.db.insert("client_documents", {
      intakeId: intake._id,
      label: args.label,
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      uploadedAt: new Date().toISOString(),
    });

    if (intake.status === "awaiting_documents") {
      await ctx.db.patch(intake._id, { status: "documents_received" });
    }

    // In-app notification — appears in the agent's bell immediately, no email
    // dependency. Created here so it fires even if the email action fails.
    await ctx.db.insert("in_app_notifications", {
      userId: intake.agentId,
      type: "client_document_uploaded",
      title: `${intake.clientName} uploaded a document`,
      body: args.label,
      linkTo: "/agents/dashboard",
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Email alert. Runs after the mutation commits — if RESEND_API_KEY
    // is not configured, sendAgentUploadAlert logs and exits cleanly.
    const agent = await ctx.db.get(intake.agentId);
    if (agent?.email) {
      await ctx.scheduler.runAfter(0, internal.emails.clientDocumentUpload.sendAgentUploadAlert, {
        to: agent.email,
        agentName: agent.name ?? "Agent",
        clientName: intake.clientName,
        documentLabel: args.label,
        destination: intake.destination,
      });
    }
  },
});

// ─── Agent: save notes for a client ──────────────────────────────────────────
export const updateIntakeNotes = mutation({
  args: {
    token: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);
    if (args.notes.length > 5000)
      throw new ConvexError({ code: "BAD_REQUEST", message: "Notes must be under 5000 characters." });

    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) throw new ConvexError({ code: "NOT_FOUND", message: "Client not found." });
    if (intake.agentId !== agent._id)
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your client." });

    await ctx.db.patch(intake._id, { notes: args.notes || undefined });
  },
});

// ─── Agent: archive a client intake (hides it from the active list) ───────────
export const archiveIntake = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);

    const intake = await ctx.db
      .query("client_intakes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!intake) throw new ConvexError({ code: "NOT_FOUND", message: "Client not found." });
    if (intake.agentId !== agent._id)
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your client." });

    await ctx.db.patch(intake._id, { archived: true });
  },
});
