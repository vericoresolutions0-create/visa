import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Disable browser's automatic scroll restoration so mobile browsers don't
// override our programmatic scroll-to-top on SPA navigation.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

export function useScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType(); // "POP" | "PUSH" | "REPLACE"

  useEffect(() => {
    if (navType !== "POP") {
      // requestAnimationFrame ensures the DOM has painted before scrolling,
      // which prevents mobile browsers from ignoring an early scrollTo call.
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
      });
    }
  }, [pathname, navType]);
}
