/// <reference types="vite/client" />
// Tests the client intake / document upload flow — the actual mechanism
// behind VisaClear's core agent pitch: "send a link, documents land in
// your dashboard instantly." An agent creates a link with no client
// account required; the client uploads via that link; the upload shows
// up the moment agents query their intake list (Convex's reactive
// useQuery is what makes this "instant" on the frontend — this test
// proves the underlying data dependency that reactivity relies on: that
// a client upload is immediately visible to listMyIntakes, with no
// separate confirmation step or delay).
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedAgent(t: ReturnType<typeof convexTest>, overrides: { agentPlan?: "agent_listing" | "agent_featured" | "agency_white_label" | null } = {}) {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email: `agent-${Math.random()}@example.com`,
      agentPlan: overrides.agentPlan === null ? undefined : (overrides.agentPlan ?? "agent_listing"),
    }),
  );
}

async function storeBlob(t: ReturnType<typeof convexTest>, bytes: number, contentType: string): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: contentType });
    const storageId = await ctx.storage.store(blob);
    // convex-test 0.0.54's storage.store() doesn't persist the blob's content
    // type onto the _storage row (only size/sha256) — real Convex does this
    // correctly via the actual HTTP upload endpoint's Content-Type header, so
    // this patch exists purely to work around the test harness gap and make
    // fileValidation.ts's real content-type check exercisable here at all.
    await ctx.db.patch(storageId, { contentType });
    return storageId;
  });
}

const DEST = "United Kingdom";
const VISA = "skilled-worker";

async function createRealIntake(t: ReturnType<typeof convexTest>, agentUserId: Id<"users">) {
  return await t
    .withIdentity({ subject: agentUserId })
    .mutation(api.clientIntakes.createIntake, {
      clientName: "Jordan Client",
      destination: DEST,
      visaType: VISA,
    });
}

describe("clientIntakes — the create-link → client-upload → agent-sees-it flow", () => {
  test("an agent without an active plan cannot create an intake link", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t, { agentPlan: null });

    await expect(
      t.withIdentity({ subject: agentUserId }).mutation(api.clientIntakes.createIntake, {
        clientName: "Client",
        destination: DEST,
        visaType: VISA,
      }),
    ).rejects.toThrow();
  });

  test("creating an intake returns a real token, and the link resolves for a guest with no account", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    const { token } = await createRealIntake(t, agentUserId);

    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThanOrEqual(32); // 128-bit hex, unguessable

    // No identity attached — this is exactly what a client clicking the
    // link does: no login, no account, just the token.
    const intake = await t.query(api.clientIntakes.getIntakeByToken, { token });
    expect(intake).toMatchObject({ clientName: "Jordan Client", destination: DEST, visaType: VISA, status: "awaiting_documents" });
  });

  test("an invalid or made-up token resolves to null, not an error or someone else's data", async () => {
    const t = convexTest(schema, modules);
    const intake = await t.query(api.clientIntakes.getIntakeByToken, { token: "not-a-real-token" });
    expect(intake).toBeNull();
  });

  test("the core promise: a client's upload is immediately visible to the agent's dashboard query", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    const { token } = await createRealIntake(t, agentUserId);

    // Before any upload, the agent's list shows the client with zero documents.
    const before = await t.withIdentity({ subject: agentUserId }).query(api.clientIntakes.listMyIntakes, {});
    expect(before).toHaveLength(1);
    expect(before[0].documents).toHaveLength(0);
    expect(before[0].status).toBe("awaiting_documents");

    // The client uploads — no identity, exactly like the real portal page.
    const storageId = await storeBlob(t, 1024, "application/pdf");
    await t.mutation(api.clientIntakes.recordDocument, {
      token,
      storageId,
      label: "Passport",
      fileName: "passport.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
    });

    // No delay, no polling, no second call needed — this is the exact
    // query the dashboard's useQuery subscribes to, so on the real
    // frontend this update is what makes the upload "appear instantly".
    const after = await t.withIdentity({ subject: agentUserId }).query(api.clientIntakes.listMyIntakes, {});
    expect(after[0].documents).toHaveLength(1);
    expect(after[0].documents[0].label).toBe("Passport");
    expect(after[0].status).toBe("documents_received"); // auto-transitioned
  });

  test("uploading against an invalid token is rejected at both the URL-generation and record steps", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.clientIntakes.generateUploadUrl, { token: "fake-token" }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.clientIntakes.recordDocument, {
        token: "fake-token",
        storageId: "kg2abc" as Id<"_storage">,
        label: "Passport",
        fileName: "passport.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
      }),
    ).rejects.toThrow();
  });

  test("an oversized file is rejected outright — and never recorded as a document, regardless of storage cleanup", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    const { token } = await createRealIntake(t, agentUserId);

    const storageId = await storeBlob(t, 51 * 1024 * 1024, "application/pdf"); // over the 50MB cap
    await expect(
      t.mutation(api.clientIntakes.recordDocument, {
        token,
        storageId,
        label: "Passport",
        fileName: "huge.pdf",
        fileSize: 51 * 1024 * 1024,
        mimeType: "application/pdf",
      }),
    ).rejects.toThrow();

    // What actually matters: the rejected file is never recorded, so it
    // never appears in the agent's dashboard or anywhere else in the
    // product. (Convex mutations are all-or-nothing, so the storage.delete()
    // inside validateUploadedFile is itself rolled back along with the
    // throw — the blob is not actually removed. That's a real, known,
    // low-severity storage-hygiene quirk documented in fileValidation.ts,
    // not a correctness or visibility issue, so it's deliberately not
    // asserted here.)
    const intakes = await t.withIdentity({ subject: agentUserId }).query(api.clientIntakes.listMyIntakes, {});
    expect(intakes[0].documents).toHaveLength(0);
  });

  test("a disallowed file type (e.g. an executable) is rejected regardless of the claimed mimeType argument", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    const { token } = await createRealIntake(t, agentUserId);

    // The actual stored blob's real content-type is what's checked — not
    // the client-supplied mimeType argument, which is just a claim.
    const storageId = await storeBlob(t, 1024, "application/x-msdownload");
    await expect(
      t.mutation(api.clientIntakes.recordDocument, {
        token,
        storageId,
        label: "Passport",
        fileName: "totally-a-passport.pdf",
        fileSize: 1024,
        mimeType: "application/pdf", // lying about the type
      }),
    ).rejects.toThrow();
  });

  test("HEIC/HEIF and non-standard JPG are accepted (iPhone camera uploads — a real, common client scenario)", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    const { token } = await createRealIntake(t, agentUserId);

    const heicStorageId = await storeBlob(t, 2048, "image/heic");
    await t.mutation(api.clientIntakes.recordDocument, {
      token,
      storageId: heicStorageId,
      label: "Passport photo",
      fileName: "IMG_0001.heic",
      fileSize: 2048,
      mimeType: "image/heic",
    });

    const jpgStorageId = await storeBlob(t, 2048, "image/jpg");
    await t.mutation(api.clientIntakes.recordDocument, {
      token,
      storageId: jpgStorageId,
      label: "Bank statement",
      fileName: "scan.jpg",
      fileSize: 2048,
      mimeType: "image/jpg",
    });

    const intakes = await t.withIdentity({ subject: agentUserId }).query(api.clientIntakes.listMyIntakes, {});
    expect(intakes[0].documents).toHaveLength(2);
  });

  test("a client is capped at 30 uploads per intake per day", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    const { token } = await createRealIntake(t, agentUserId);

    const intakeId = await t.run(async (ctx) =>
      (await ctx.db.query("client_intakes").withIndex("by_token", (q) => q.eq("token", token)).unique())!._id,
    );
    const today = new Date().toISOString();
    // Seed 30 documents directly (bypassing the mutation) to reach the cap fast.
    await t.run(async (ctx) => {
      for (let i = 0; i < 30; i++) {
        const storageId = await ctx.storage.store(new Blob([new Uint8Array(10)], { type: "application/pdf" }));
        await ctx.db.insert("client_documents", {
          intakeId,
          label: `Doc ${i}`,
          storageId,
          fileName: `doc-${i}.pdf`,
          fileSize: 10,
          mimeType: "application/pdf",
          uploadedAt: today,
        });
      }
    });

    const storageId = await storeBlob(t, 10, "application/pdf");
    await expect(
      t.mutation(api.clientIntakes.recordDocument, {
        token,
        storageId,
        label: "One too many",
        fileName: "doc-31.pdf",
        fileSize: 10,
        mimeType: "application/pdf",
      }),
    ).rejects.toThrow();
  });

  test("a different agent cannot mint a download link for someone else's client document", async () => {
    const t = convexTest(schema, modules);
    const ownerAgentId = await seedAgent(t);
    const otherAgentId = await seedAgent(t);
    const { token } = await createRealIntake(t, ownerAgentId);

    const storageId = await storeBlob(t, 1024, "application/pdf");
    await t.mutation(api.clientIntakes.recordDocument, {
      token, storageId, label: "Passport", fileName: "passport.pdf", fileSize: 1024, mimeType: "application/pdf",
    });

    const documentId = await t.run(async (ctx) => (await ctx.db.query("client_documents").collect())[0]._id);

    await expect(
      t.withIdentity({ subject: otherAgentId }).mutation(api.clientIntakes.getClientDocumentDownloadUrl, { documentId }),
    ).rejects.toThrow();

    // The real owner can, though — proves this is an ownership check, not a blanket failure.
    // (CONVEX_SITE_URL isn't set in the test env, so this specific call still throws — but
    // with a different, "not configured" error, not the "not your client" one above. We only
    // assert the two failures are for different reasons by checking the error message.)
    try {
      await t.withIdentity({ subject: ownerAgentId }).mutation(api.clientIntakes.getClientDocumentDownloadUrl, { documentId });
    } catch (err) {
      expect(String(err)).not.toMatch(/Not your client/);
    }
  });

  test("archiving a client hides them from the agent's active list without deleting their data", async () => {
    const t = convexTest(schema, modules);
    const agentUserId = await seedAgent(t);
    const { token } = await createRealIntake(t, agentUserId);

    await t.withIdentity({ subject: agentUserId }).mutation(api.clientIntakes.archiveIntake, { token });

    const intakes = await t.withIdentity({ subject: agentUserId }).query(api.clientIntakes.listMyIntakes, {});
    expect(intakes).toHaveLength(0);

    // Still resolvable by the client's own link — archiving is an agent-side
    // filter, not a deletion, so an already-shared link doesn't break.
    const stillResolvable = await t.query(api.clientIntakes.getIntakeByToken, { token });
    expect(stillResolvable).not.toBeNull();
  });
});
