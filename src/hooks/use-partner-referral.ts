import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const STORAGE_KEY = "vc_referral_partner";

export function getStoredPartnerSlug(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredPartnerSlug(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Captures ?ref=<slug> exactly once, on whichever page it first appears on,
// regardless of which public page a partner's link happens to point at.
// Silent and side-effect-free for every visitor who isn't arriving via a
// partner link — this never touches the existing useAnalytics event log or
// any other tracking already in the app.
export function usePartnerReferralCapture() {
  const [searchParams] = useSearchParams();
  const logVisit = useMutation(api.partners.logReferralVisit);

  useEffect(() => {
    const slug = searchParams.get("ref");
    if (!slug) return;
    if (getStoredPartnerSlug() === slug) return; // already captured this one

    try {
      localStorage.setItem(STORAGE_KEY, slug);
    } catch {
      return;
    }
    void logVisit({ slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
}
