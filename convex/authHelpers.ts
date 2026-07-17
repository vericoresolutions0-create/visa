import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel.js";
import type { QueryCtx, MutationCtx } from "./_generated/server.js";

// Single chokepoint for "who is the current real user" — every backend
// function should go through here instead of reading ctx.auth directly, so
// swapping the underlying auth provider only ever requires changing this
// file. Convex Auth manages the users table itself (via getAuthUserId),
// unlike the old Hercules/OIDC tokenIdentifier lookup pattern.
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

export async function getCurrentUserOrThrow(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  }
  return user;
}

// Throws if a user has been suspended by an admin (Security Intelligence
// Centre → "Suspend actor"). Deliberately NOT folded into
// getCurrentUser/getCurrentUserOrThrow above, which are called from ~120
// sites across the app including plain read queries (e.g. a suspended user
// loading their own dashboard to see why they're suspended) — throwing
// there indiscriminately risked breaking pages that should still be
// viewable. Call this explicitly at the specific write actions where
// suspension should actually have teeth: checkout/billing and marketplace
// lead access today.
export function assertNotSuspended(user: Doc<"users">): void {
  if (user.isSuspended) {
    throw new ConvexError({
      code: "ACCOUNT_SUSPENDED",
      message: "Your account has been suspended. Contact support@visaclear.app if you believe this is a mistake.",
    });
  }
}
