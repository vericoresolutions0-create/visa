import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts the user-visible message from a Convex backend error.
 * Returns null if the error is not a structured Convex error.
 *
 * Use this everywhere instead of `instanceof ConvexError` — the instanceof
 * check is unreliable across module version boundaries in bundled apps because
 * the ConvexError class identity can differ between the component's import and
 * the Convex client's internal version. Duck-typing on .data.message is stable.
 */
export function convexErrMsg(err: unknown): string | null {
  return (err as { data?: { message?: string } }).data?.message ?? null;
}
