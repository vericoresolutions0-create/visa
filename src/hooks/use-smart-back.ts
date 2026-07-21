import { useCallback, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavigationDepthContext } from "@/hooks/use-navigation-depth.tsx";

export function useSmartBack(defaultPath = "/") {
  const navigate = useNavigate();
  const location = useLocation();
  const { depth, previousPath } = useContext(NavigationDepthContext);

  return useCallback(() => {
    if (depth > 0) {
      // Browser history has real in-app entries — go back normally.
      navigate(-1);
      return;
    }
    // Guard against a stale/self-referential previousPath (e.g. one that
    // collapsed to the current page): navigating to where you already are
    // is a silent no-op that reads as a broken button, so fall through to
    // the page's own default instead.
    if (previousPath && previousPath !== location.pathname) {
      // After an iOS PWA reload, in-memory depth is 0 but sessionStorage
      // still knows where the user came from. Navigate there without adding
      // a new history entry so the user doesn't get into a back-loop.
      navigate(previousPath, { replace: true });
      return;
    }
    navigate(defaultPath, { replace: true });
  }, [depth, previousPath, defaultPath, navigate, location.pathname]);
}
