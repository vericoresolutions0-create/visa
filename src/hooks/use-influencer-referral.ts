import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const STORAGE_KEY = "vc_influencer_ref";
const STORAGE_EXPIRY_KEY = "vc_influencer_ref_expiry";
const ATTRIBUTION_WINDOW_DAYS = 90;

export function getStoredInfluencerCode(): string | null {
  try {
    const expiry = localStorage.getItem(STORAGE_EXPIRY_KEY);
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_EXPIRY_KEY);
      return null;
    }
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Captures ?af=<code> on any page, stores it for 90 days, then records it on
// the user's account once they sign in. Completely separate from the
// ?ref=<partner_slug> partner system — different param, different table.
export function useInfluencerReferralCapture() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useConvexAuth();
  const trackSignup = useMutation(api.influencers.trackSignup);

  // Step 1: capture the code from the URL into localStorage
  useEffect(() => {
    const code = searchParams.get("af");
    if (!code) return;
    const normalised = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalised) return;
    if (getStoredInfluencerCode() === normalised) return; // already stored

    try {
      const expiryMs = Date.now() + ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, normalised);
      localStorage.setItem(STORAGE_EXPIRY_KEY, String(expiryMs));
    } catch {
      // localStorage unavailable — ignore silently
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Step 2: once the user is signed in, record the stored code on their account
  useEffect(() => {
    if (!isAuthenticated) return;
    const code = getStoredInfluencerCode();
    if (!code) return;

    void trackSignup({ code }).then(() => {
      // Clear after recording so it doesn't fire again on every page load
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_EXPIRY_KEY);
      } catch {
        // ignore
      }
    }).catch(() => {
      // Silently ignore — the mutation is a no-op if the code is invalid
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
