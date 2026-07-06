import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ONE-TIME bootstrap — delete this file after use.
export const listUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({ id: u._id, email: u.email, role: u.role }));
  },
});

export const setAdminById = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const target = users.find((u) => u._id === args.id);
    if (!target) throw new Error("User not found: " + args.id);
    await ctx.db.patch(target._id, { role: "admin" });
    return "Done — " + target._id;
  },
});
