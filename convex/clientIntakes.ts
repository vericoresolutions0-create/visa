import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { validateUploadedFile } from "./fileValidation";
import { getCurrentUser, getCurrentUserOrThrow, assertNotSuspended } from "./authHelpers.ts";
import { mintFileToken } from "./fileTokens.ts";
import { recomputeReadinessForUpload } from "./caseReadiness.ts";

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

// listMyIntakes caps at this many active clients (see .take below). Kept as
// a named constant so it's easy to find — src/pages/agents/dashboard.tsx's
// client-count display compares against this same number (duplicated there
// as a literal, since frontend code can't import from convex/*.ts source)
// to show a truncation notice instead of silently presenting a capped list
// as "all clients" once an agent scales past this many active ones.
const MAX_INTAKES = 200;

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
    assertNotSuspended(agent);
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
      .take(MAX_INTAKES)).filter((i) => !i.archived);

    return await Promise.all(
      intakes.map(async (intake) => {
        const documents = await ctx.db
          .query("client_documents")
          .withIndex("by_intake", (q) => q.eq("intakeId", intake._id))
          .take(30);
        // No download URL here anymore — permanent, unauthenticated storage
        // links are replaced by getClientDocumentDownloadUrl below, minted
        // fresh (and re-checked) at the moment the agent actually opens one.
        const documentsWithUrls = documents.map((doc) => ({
          _id: doc._id,
          label: doc.label,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          uploadedAt: doc.uploadedAt,
          url: null as string | null,
        }));
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

// ─── Agent: mint a short-lived link to actually view/download a client's
// uploaded document. Re-checks the agent owns this intake (and still has an
// active plan) fresh every time, unlike a permanent link handed out once.
export const getClientDocumentDownloadUrl = mutation({
  args: { documentId: v.id("client_documents") },
  handler: async (ctx, args) => {
    const agent = await getCurrentUserOrThrow(ctx);
    assertNotSuspended(agent);
    if (!agent.agentPlan) {
      throw new ConvexError({ code: "FORBIDDEN", message: "An active agent plan is required to view client documents." });
    }

    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new ConvexError({ code: "NOT_FOUND", message: "Document not found." });
    const intake = await ctx.db.get(doc.intakeId);
    if (!intake || intake.agentId !== agent._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your client's document." });
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
    assertNotSuspended(agent);

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

    // Keep the readiness score/critical-count badge current the moment a
    // client uploads — without this it stayed stale (even after the client
    // fixed the exact gap the agent was waiting on) until the agent reopened
    // the panel and clicked "Compute" again.
    await recomputeReadinessForUpload(ctx, intake);

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
    assertNotSuspended(agent);
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
    assertNotSuspended(agent);

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
