import { getFunctionName } from "convex/server";

// api.x.y (Convex's generated function references) are Proxy objects — two
// separate accesses of the exact same function are never `===` equal, so
// comparing raw identity in a mock silently never matches and every query
// looks permanently "loading". getFunctionName gives the stable
// "module:function" string Convex itself uses internally over the wire,
// which is what a mock should actually compare on.
export function matchesQuery(queryRef: unknown, target: unknown): boolean {
  try {
    return getFunctionName(queryRef as never) === getFunctionName(target as never);
  } catch {
    return false;
  }
}
