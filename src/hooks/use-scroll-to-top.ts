import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// We manage scroll ourselves so mobile browsers don't fight us on PUSH
// navigations, but we DO restore position on POP (back/forward).
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function scrollKey(pathname: string) {
  return `vc_scroll_${pathname}`;
}

export function useScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  // Save the current page's scroll position continuously (debounced 100ms)
  // so it's available when the user comes back via the back button.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          sessionStorage.setItem(scrollKey(pathname), String(Math.round(window.scrollY)));
        } catch {}
      }, 100);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      window.removeEventListener("scroll", save);
      clearTimeout(timer);
    };
  }, [pathname]);

  // On PUSH/REPLACE: scroll to top. On POP: restore saved position.
  useEffect(() => {
    if (navType === "POP") {
      const saved = sessionStorage.getItem(scrollKey(pathname));
      const pos = saved ? parseInt(saved, 10) : 0;
      requestAnimationFrame(() => {
        window.scrollTo({ top: pos, behavior: "instant" });
      });
    } else {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
      });
    }
  }, [pathname, navType]);
}
