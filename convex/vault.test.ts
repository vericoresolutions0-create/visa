/// <reference types="vite/client" />
// Regression test for a real gap found during a founder-requested Quick
// Actions audit (2026-07-19): only 2 of 6 vault.ts functions checked the
// user's plan server-side. A user who downgraded from Pro/Expert to Free
// kept full read/download/edit access to their existing vault documents via
// direct Convex calls — the free-plan lockout only ever existed in the
// frontend UI (an entire-page conditional render), never enforced where it
// actually matters. This proves every vault function that reveals or acts on
// document content is now gated the same way generateUploadUrl/addDocument
// already were, and that deleteDocument is deliberately left ungated so a
// downgraded user can still clean up their own data.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

async function seedUser(t: ReturnType<typeof convexTest>, plan: "free" | "pro" | "expert" = "free") {
  return await t.run(async (ctx) => ctx.db.insert("users", { email: `user-${Math.random()}@example.com`, plan }));
}

async function seedDocument(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob([new Uint8Array(10)], { type: "application/pdf" }));
    return await ctx.db.insert("vault_documents", {
      userId,
      category: "identity",
      label: "Passport",
      storageId,
      fileName: "passport.pdf",
      fileSize: 10,
      mimeType: "application/pdf",
      uploadedAt: new Date().toISOString(),
    });
  });
}

describe("vault.ts — plan gating enforced server-side, not just in the frontend", () => {
  test("listMyDocuments returns empty for a free-plan user instead of leaking their old Pro-era documents", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "free");
    await seedDocument(t, userId);

    const docs = await t.withIdentity({ subject: userId }).query(api.vault.listMyDocuments, {});
    expect(docs).toEqual([]);
  });

  test("listMyDocuments returns real documents for a pro/expert user", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "pro");
    await seedDocument(t, userId);

    const docs = await t.withIdentity({ subject: userId }).query(api.vault.listMyDocuments, {});
    expect(docs.length).toBe(1);
    expect(docs[0].label).toBe("Passport");
  });

  test("getDocumentDownloadUrl rejects a free-plan user before it ever mints a token", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "free");
    const documentId = await seedDocument(t, userId);

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.vault.getDocumentDownloadUrl, { documentId }),
    ).rejects.toThrow(/Pro feature/);
  });

  test("getDocumentDownloadUrl passes the plan gate for a pro user (fails later only on missing CONVEX_SITE_URL in the test env)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "pro");
    const documentId = await seedDocument(t, userId);

    try {
      await t.withIdentity({ subject: userId }).mutation(api.vault.getDocumentDownloadUrl, { documentId });
    } catch (err) {
      // Proves the plan gate isn't what's failing here — a genuinely
      // different, later error (file serving not configured in this test env).
      expect(String(err)).not.toMatch(/Pro feature/);
    }
  });

  test("updateDocumentExpiry rejects a free-plan user, even on a document they own", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "free");
    const documentId = await seedDocument(t, userId);

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.vault.updateDocumentExpiry, { id: documentId, expiryDate: "2027-01-01" }),
    ).rejects.toThrow(/Pro feature/);
  });

  test("createExpiryReminder rejects a free-plan user, even on a document they own", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "free");
    const documentId = await seedDocument(t, userId);

    await expect(
      t.withIdentity({ subject: userId }).mutation(api.vault.createExpiryReminder, { id: documentId }),
    ).rejects.toThrow(/Pro feature/);
  });

  test("deleteDocument is deliberately NOT plan-gated — a downgraded user can still remove their own data", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "free");
    const documentId = await seedDocument(t, userId);

    // Must not throw a plan error — deletion is intentionally always allowed
    // for the owner, regardless of current plan.
    await t.withIdentity({ subject: userId }).mutation(api.vault.deleteDocument, { id: documentId });

    const remaining = await t.run(async (ctx) => ctx.db.query("vault_documents").collect());
    expect(remaining.length).toBe(0);
  });

  test("ownership is still enforced independently of plan — a pro user can't touch another user's document", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, "pro");
    const attackerId = await seedUser(t, "pro");
    const documentId = await seedDocument(t, ownerId);

    await expect(
      t.withIdentity({ subject: attackerId }).mutation(api.vault.updateDocumentExpiry, { id: documentId, expiryDate: "2027-01-01" }),
    ).rejects.toThrow(/don't have access/);
  });
});
