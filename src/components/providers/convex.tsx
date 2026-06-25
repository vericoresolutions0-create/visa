import { ConvexProviderWithHerculesAuth } from "@usehercules/auth/convex-react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { hasHerculesAuthConfig } from "@/lib/auth-config.ts";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://localhost:3000";
const convex = new ConvexReactClient(convexUrl);
const fetchDemoAccessToken = async () => null;

function useDemoConvexAuth() {
  return {
    isLoading: false,
    isAuthenticated: false,
    fetchAccessToken: fetchDemoAccessToken,
  };
}

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  if (!hasHerculesAuthConfig) {
    return (
      <ConvexProviderWithAuth client={convex} useAuth={useDemoConvexAuth}>
        {children}
      </ConvexProviderWithAuth>
    );
  }

  return (
    <ConvexProviderWithHerculesAuth client={convex}>
      {children}
    </ConvexProviderWithHerculesAuth>
  );
}
