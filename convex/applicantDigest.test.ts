/// <reference types="vite/client" />
// Build-queue item #25: weekly applicant re-engagement digest. Admins
// already get an equivalent freshness digest; applicants had nothing
// pulling them back between visits. buildDigestForUser carries the real
// content rules — the dispatcher itself (applicantDigestDispatch.ts) is
// thin orchestration, same pattern as agentTrialDispatch.ts/
// orgNudgeDispatch.ts, which have no dedicated test files either.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", { email: `user-${Math.random()}@example.com`, plan: "pro" }));
}

async function buildDigest(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return await t.run(async (ctx) => ctx.runQuery(internal.applicantDigest.buildDigestForUser, { userId }));
}

describe("applicantDigest.buildDigestForUser — the golden rule", () => {
  test("a user with nothing real to report gets null, not an empty-but-truthy digest", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    expect(await buildDigest(t, userId)).toBeNull();
  });
});

describe("applicantDigest.buildDigestForUser — expiring documents", () => {
  test("a document expiring within 60 days is included", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) =>
      ctx.db.insert("vault_documents", {
        userId, category: "identity", label: "Passport", storageId: await ctx.storage.store(new Blob([new Uint8Array(1)])),
        fileName: "p.pdf", fileSize: 10, mimeType: "application/pdf",
        expiryDate: daysFromNow(30).slice(0, 10), uploadedAt: new Date().toISOString(),
      }),
    );
    const digest = await buildDigest(t, userId);
    expect(digest?.expiringDocs).toHaveLength(1);
    expect(digest?.expiringDocs[0].label).toBe("Passport");
  });

  test("a document expiring in 200 days is NOT included (outside the 60-day window)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) =>
      ctx.db.insert("vault_documents", {
        userId, category: "identity", label: "Passport", storageId: await ctx.storage.store(new Blob([new Uint8Array(1)])),
        fileName: "p.pdf", fileSize: 10, mimeType: "application/pdf",
        expiryDate: daysFromNow(200).slice(0, 10), uploadedAt: new Date().toISOString(),
      }),
    );
    expect(await buildDigest(t, userId)).toBeNull();
  });

  test("a document with no expiry date at all is never included", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) =>
      ctx.db.insert("vault_documents", {
        userId, category: "identity", label: "Photo", storageId: await ctx.storage.store(new Blob([new Uint8Array(1)])),
        fileName: "p.jpg", fileSize: 10, mimeType: "image/jpeg", uploadedAt: new Date().toISOString(),
      }),
    );
    expect(await buildDigest(t, userId)).toBeNull();
  });
});

describe("applicantDigest.buildDigestForUser — stale checklists", () => {
  test("an incomplete checklist untouched for 14+ days is flagged", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) =>
      ctx.db.insert("saved_checklists", {
        userId, origin: "Nigeria", destination: "United Kingdom", visaType: "work",
        checkedItems: [], title: "UK Work", progress: 40, savedAt: daysAgo(20),
      }),
    );
    const digest = await buildDigest(t, userId);
    expect(digest?.staleChecklists).toHaveLength(1);
    expect(digest?.staleChecklists[0].destination).toBe("United Kingdom");
  });

  test("a checklist saved only 3 days ago is NOT flagged as stale yet", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) =>
      ctx.db.insert("saved_checklists", {
        userId, origin: "Nigeria", destination: "United Kingdom", visaType: "work",
        checkedItems: [], title: "UK Work", progress: 40, savedAt: daysAgo(3),
      }),
    );
    expect(await buildDigest(t, userId)).toBeNull();
  });

  test("a 100%-complete checklist is never flagged as stale, no matter how old", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) =>
      ctx.db.insert("saved_checklists", {
        userId, origin: "Nigeria", destination: "United Kingdom", visaType: "work",
        checkedItems: [], title: "UK Work", progress: 100, savedAt: daysAgo(200),
      }),
    );
    expect(await buildDigest(t, userId)).toBeNull();
  });

  test("an archived checklist is never flagged, even if stale and incomplete", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) =>
      ctx.db.insert("saved_checklists", {
        userId, origin: "Nigeria", destination: "United Kingdom", visaType: "work",
        checkedItems: [], title: "UK Work", progress: 40, savedAt: daysAgo(60), archived: true,
      }),
    );
    expect(await buildDigest(t, userId)).toBeNull();
  });
});

describe("applicantDigest.buildDigestForUser — embassy updates", () => {
  test("a recent embassy page change for a destination the user has an open checklist for is included", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("saved_checklists", {
        userId, origin: "Nigeria", destination: "United Kingdom", visaType: "work",
        checkedItems: [], title: "UK Work", progress: 50, savedAt: daysAgo(2),
      });
      await ctx.db.insert("embassy_page_snapshots", {
        destination: "United Kingdom", url: "https://example.gov/uk-visa", contentHash: "abc",
        lastCheckedAt: new Date().toISOString(), changedAt: daysAgo(2), aiSummary: "New income threshold announced.",
      });
    });
    const digest = await buildDigest(t, userId);
    expect(digest?.embassyUpdates).toHaveLength(1);
    expect(digest?.embassyUpdates[0].summary).toBe("New income threshold announced.");
  });

  test("an embassy change from 30 days ago is outside the 7-day window and NOT included", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("saved_checklists", {
        userId, origin: "Nigeria", destination: "United Kingdom", visaType: "work",
        checkedItems: [], title: "UK Work", progress: 50, savedAt: daysAgo(2),
      });
      await ctx.db.insert("embassy_page_snapshots", {
        destination: "United Kingdom", url: "https://example.gov/uk-visa", contentHash: "abc",
        lastCheckedAt: new Date().toISOString(), changedAt: daysAgo(30),
      });
    });
    expect(await buildDigest(t, userId)).toBeNull();
  });

  test("an embassy change for a destination the user has no checklist for is never included", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) =>
      ctx.db.insert("embassy_page_snapshots", {
        destination: "Canada", url: "https://example.gov/ca-visa", contentHash: "abc",
        lastCheckedAt: new Date().toISOString(), changedAt: daysAgo(1),
      }),
    );
    expect(await buildDigest(t, userId)).toBeNull();
  });

  test("a completed (100%) checklist's destination doesn't trigger embassy-update matching", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("saved_checklists", {
        userId, origin: "Nigeria", destination: "United Kingdom", visaType: "work",
        checkedItems: [], title: "UK Work", progress: 100, savedAt: daysAgo(2),
      });
      await ctx.db.insert("embassy_page_snapshots", {
        destination: "United Kingdom", url: "https://example.gov/uk-visa", contentHash: "abc",
        lastCheckedAt: new Date().toISOString(), changedAt: daysAgo(1),
      });
    });
    expect(await buildDigest(t, userId)).toBeNull();
  });
});
