/// <reference types="vite/client" />
// Regression test: getInviteByToken used to return status "pending" for a
// link whose expiresAt had already passed — acceptInvite/declineInvite
// correctly rejected it, but only after the employee signed in and picked
// a checklist, with no forewarning. This proves expiry is now surfaced
// immediately, matching how invalid/revoked/declined links already are.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const FUTURE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

async function seedInvite(t: ReturnType<typeof convexTest>, expiresAt: string) {
  const adminUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "admin@employer.com" }));
  const organizationId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", { name: "Test Employer", type: "employer", createdByUserId: adminUserId, createdAt: new Date().toISOString() }),
  );
  const token = "test-token-" + Math.random();
  await t.run(async (ctx) =>
    ctx.db.insert("org_employee_links", {
      organizationId,
      invitedEmail: "employee@example.com",
      token,
      status: "pending",
      invitedByUserId: adminUserId,
      pipelineStage: "invited",
      createdAt: new Date().toISOString(),
      expiresAt,
    }),
  );
  return token;
}

describe("employerInvites.getInviteByToken — expiry surfaced up front", () => {
  test("a pending invite past its expiry date reports status \"expired\", not \"pending\"", async () => {
    const t = convexTest(schema, modules);
    const token = await seedInvite(t, PAST);

    const invite = await t.query(api.employerInvites.getInviteByToken, { token });
    expect(invite?.status).toBe("expired");
  });

  test("a pending invite still within its window reports status \"pending\"", async () => {
    const t = convexTest(schema, modules);
    const token = await seedInvite(t, FUTURE);

    const invite = await t.query(api.employerInvites.getInviteByToken, { token });
    expect(invite?.status).toBe("pending");
  });

  test("acceptInvite still rejects an expired invite outright, consistent with the surfaced status", async () => {
    const t = convexTest(schema, modules);
    const token = await seedInvite(t, PAST);
    const employeeUserId = await t.run(async (ctx) => ctx.db.insert("users", { email: "employee@example.com" }));

    await expect(
      t.withIdentity({ subject: employeeUserId }).mutation(api.employerInvites.acceptInvite, { token }),
    ).rejects.toThrow();
  });
});
