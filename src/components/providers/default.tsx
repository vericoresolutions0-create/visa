import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { AuthProvider } from "./auth.tsx";
import { ConvexProvider } from "./convex.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { ThemeProvider } from "./theme.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";

// Convex Auth has no dedicated frontend callback page — sign-in (password or
// Google) resolves directly wherever the user started. This is the one place
// that applies VisaClear's first-time defaults (referral code, free plan,
// welcome email) the moment a session becomes real, replacing what the old
// /auth/callback page used to trigger.
function EnsureUserDefaults() {
  const { isAuthenticated } = useConvexAuth();
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);
  const applied = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !applied.current) {
      applied.current = true;
      void updateCurrentUser();
    }
    if (!isAuthenticated) {
      applied.current = false;
    }
  }, [isAuthenticated, updateCurrentUser]);

  return null;
}

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ConvexProvider>
        <QueryClientProvider>
          <TooltipProvider>
            <ThemeProvider>
              <Toaster />
              <EnsureUserDefaults />
              {children}
            </ThemeProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ConvexProvider>
    </AuthProvider>
  );
}
