import { requireAdmin } from "./admin.ts";
import { query } from "./_generated/server";

// Capped rather than a full-table collect(): at large scale, organizations
// (employer accounts + households, both created by end users) can grow
// into the thousands, and this is an admin oversight list, not something
// that needs every row at once — most-recent-first with a real cap keeps
// this page fast regardless of how many users the platform has.
const MAX_ORGS = 200;

export const listOrganizations = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const orgs = await ctx.db.query("organizations").order("desc").take(MAX_ORGS);

    return await Promise.all(
      orgs.map(async (org) => {
        const [members, links] = await Promise.all([
          ctx.db.query("org_members").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
          ctx.db.query("org_employee_links").withIndex("by_org", (q) => q.eq("organizationId", org._id)).collect(),
        ]);
        return {
          _id: org._id,
          name: org.name,
          type: org.type ?? "employer",
          createdAt: org.createdAt,
          memberCount: members.length,
          pendingCount: links.filter((l) => l.status === "pending").length,
          acceptedCount: links.filter((l) => l.status === "accepted").length,
          declinedCount: links.filter((l) => l.status === "declined").length,
          revokedCount: links.filter((l) => l.status === "revoked").length,
        };
      }),
    );
  },
});
