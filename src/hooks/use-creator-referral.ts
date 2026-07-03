import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const STORAGE_KEY = "vc_creator_ref";
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

interface StoredRef {
  slug: string;
  expiresAt: number;
}

export function storeCreatorSlug(slug: string) {
  const payload: StoredRef = { slug, expiresAt: Date.now() + TTL_MS };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
}

function readCreatorSlug(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as StoredRef;
    if (Date.now() > payload.expiresAt) { localStorage.removeItem(STORAGE_KEY); return null; }
    return payload.slug;
  } catch { return null; }
}

function clearCreatorSlug() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// Call this once at the app root (e.g. inside AppRoutes). It fires once per
// authentication and never overwrites an already-attributed user.
export function useCreatorReferralCapture() {
  const { isAuthenticated } = useConvexAuth();
  const trackSignup = useMutation(api.creators.trackSignup);

  useEffect(() => {
    if (!isAuthenticated) return;
    const slug = readCreatorSlug();
    if (!slug) return;
    clearCreatorSlug();
    void trackSignup({ slug }).catch(() => { /* silent — server deduplicates */ });
  }, [isAuthenticated, trackSignup]);
}
