import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const STORAGE_KEY = "vc_agent_ref";
const STORAGE_EXPIRY_KEY = "vc_agent_ref_expiry";
const ATTRIBUTION_WINDOW_DAYS = 30;

export function getStoredAgentCode(): string | null {
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

export function clearStoredAgentCode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_EXPIRY_KEY);
  } catch {
    // ignore
  }
}

// Captures ?ac=<code> on any page and stores it for 30 days.
// The payment page reads it back to pre-fill the referral field so
// agents can share plain checklist links and still get attributed.
export function useAgentReferralCapture() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("ac");
    if (!code) return;
    const normalised = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalised) return;
    if (getStoredAgentCode() === normalised) return;

    try {
      const expiryMs = Date.now() + ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, normalised);
      localStorage.setItem(STORAGE_EXPIRY_KEY, String(expiryMs));
    } catch {
      // localStorage unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
}
