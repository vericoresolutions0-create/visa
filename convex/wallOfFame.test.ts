/// <reference types="vite/client" />
// Regression test for a real inefficiency found during a founder-requested
// Quick Actions audit (2026-07-19): listApprovedStories paginated ALL
// approved stories first, then filtered by destination in memory on the
// returned page — for a less-common destination this could return a
// near-empty page with status: "CanLoadMore" still true, real matches
// buried several pages back. Fixed with a compound `by_status_destination`
// index so filtering happens inside the DB query itself. This proves the
// filtered path returns real matches directly (not requiring multiple
// "Load more" calls) and that pending/rejected stories never leak through
// either path.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", { email: `user-${Math.random()}@example.com` }));
}

async function seedStory(
  t: ReturnType<typeof convexTest>,
  submittedByUserId: Id<"users">,
  status: "pending" | "approved" | "rejected",
  destination: string,
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("wall_of_fame_stories", {
      submittedByUserId,
      destination,
      visaType: "Student",
      refusalCount: 1,
      whatWentWrong: "Missing bank statement",
      whatFixedIt: "Added 6 months of statements",
      status,
      createdAt: new Date().toISOString(),
    }),
  );
}

describe("wallOfFame.listApprovedStories — destination filter uses the DB index, not an in-memory filter", () => {
  test("a destination filter returns real matches directly, even when many unrelated approved stories exist first", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);

    // Flood the "approved" set with a different, more common destination —
    // the old in-memory-filter version would have to page through these.
    for (let i = 0; i < 15; i++) {
      await seedStory(t, userId, "approved", "Canada");
    }
    await seedStory(t, userId, "approved", "Rare Destination");

    const result = await t.query(api.wallOfFame.listApprovedStories, {
      paginationOpts: { numItems: 5, cursor: null },
      destination: "Rare Destination",
    });

    expect(result.page.length).toBe(1);
    expect(result.page[0].destination).toBe("Rare Destination");
  });

  test("pending and rejected stories never appear, filtered or not", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await seedStory(t, userId, "pending", "France");
    await seedStory(t, userId, "rejected", "France");
    await seedStory(t, userId, "approved", "France");

    const filtered = await t.query(api.wallOfFame.listApprovedStories, {
      paginationOpts: { numItems: 10, cursor: null },
      destination: "France",
    });
    expect(filtered.page.length).toBe(1);

    const unfiltered = await t.query(api.wallOfFame.listApprovedStories, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(unfiltered.page.length).toBe(1);
  });

  test("no destination filter still returns every approved story, unchanged behavior", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await seedStory(t, userId, "approved", "Germany");
    await seedStory(t, userId, "approved", "Spain");

    const result = await t.query(api.wallOfFame.listApprovedStories, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(result.page.length).toBe(2);
  });

  test("returned rows never include the submitter's identity", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    await seedStory(t, userId, "approved", "Italy");

    const result = await t.query(api.wallOfFame.listApprovedStories, {
      paginationOpts: { numItems: 10, cursor: null },
      destination: "Italy",
    });
    expect(result.page[0]).not.toHaveProperty("submittedByUserId");
  });
});
