import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const NavigationDepthContext = createContext(0);

// Tracks how many real, in-app PUSH navigations are "underneath" the
// current page, net of POPs (back/forward) — this is the one reliable
// signal for "is there something to go back to". Neither
// window.history.length (counts the whole tab's history, including pages
// from before this app loaded) nor location.key !== "default" (a replace()
// navigation gets a fresh key too, even though it adds no real depth) are
// safe on their own. REPLACE intentionally leaves depth unchanged, since it
// swaps the current entry instead of adding one (e.g. the auth-gate "sign
// in then reveal the same page" flow).
export function NavigationDepthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();
  const depthRef = useRef(0);
  const [depth, setDepth] = useState(0);

  useEffect(() => {
    if (navType === "PUSH") depthRef.current += 1;
    else if (navType === "POP") depthRef.current = Math.max(0, depthRef.current - 1);
    setDepth(depthRef.current);
  }, [location.key, navType]);

  return <NavigationDepthContext.Provider value={depth}>{children}</NavigationDepthContext.Provider>;
}
