import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Scrolls to top ONLY on forward navigation (PUSH or REPLACE).
 * On browser back/forward (POP), the browser restores the previous scroll
 * position naturally — we must NOT override it.
 */
export function useScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType(); // "POP" | "PUSH" | "REPLACE"

  useEffect(() => {
    if (navType !== "POP") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, navType]);
}
