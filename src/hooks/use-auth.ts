import {
  useAuth as herculesUseAuth,
  useUser as herculesUseUser,
} from "@usehercules/auth/react";
import { hasHerculesAuthConfig } from "@/lib/auth-config.ts";

type HerculesAuth = ReturnType<typeof herculesUseAuth>;
type HerculesUser = ReturnType<typeof herculesUseUser>;

async function authUnavailable() {
  throw new Error("Hercules auth is not configured for this workspace.");
}

const fallbackAuth = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  signin: authUnavailable,
  signout: authUnavailable,
  signinRedirect: authUnavailable,
  removeUser: async () => undefined,
} as unknown as HerculesAuth;

const fallbackUser = null as unknown as HerculesUser;

export function useAuth() {
  if (!hasHerculesAuthConfig) {
    return fallbackAuth;
  }

  return herculesUseAuth();
}

export function useUser() {
  if (!hasHerculesAuthConfig) {
    return fallbackUser;
  }

  return herculesUseUser();
}
