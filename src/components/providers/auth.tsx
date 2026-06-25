import { HerculesAuthProvider } from "@usehercules/auth/react";
import {
  hasHerculesAuthConfig,
  herculesAuthority,
  herculesClientId,
} from "@/lib/auth-config.ts";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!hasHerculesAuthConfig) {
    return <>{children}</>;
  }

  return (
    <HerculesAuthProvider
      authority={herculesAuthority!}
      client_id={herculesClientId!}
      userManagerSettings={{
        prompt: import.meta.env.VITE_HERCULES_OIDC_PROMPT ?? "select_account",
        response_type:
          import.meta.env.VITE_HERCULES_OIDC_RESPONSE_TYPE ?? "code",
        scope:
          import.meta.env.VITE_HERCULES_OIDC_SCOPE ??
          "openid profile email offline_access",
        redirect_uri:
          import.meta.env.VITE_HERCULES_OIDC_REDIRECT_URI ??
          `${window.location.origin}/auth/callback`,
      }}
    >
      {children}
    </HerculesAuthProvider>
  );
}
