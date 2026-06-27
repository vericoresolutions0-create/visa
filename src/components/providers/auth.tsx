// Convex Auth's ConvexAuthProvider (wired in convex.tsx) is both the Convex
// client provider and the auth provider in one — there's no separate OIDC
// redirect wrapper needed the way Hercules required. This file stays only so
// DefaultProviders' composition doesn't need to change.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
