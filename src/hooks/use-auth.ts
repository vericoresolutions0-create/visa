import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

// Single chokepoint for real (non-demo) auth state on the frontend, mirroring
// convex/authHelpers.ts on the backend. signIn/signOut here are Convex
// Auth's real primitives — there's no separate "redirect" step the way the
// old Hercules/OIDC integration needed.
export function useAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  return { isAuthenticated, isLoading, signIn, signOut };
}
