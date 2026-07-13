import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const SESSION_KEY = "vc_nav_stack";

function loadStack(): string[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveStack(stack: string[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(stack));
  } catch {}
}

type NavState = {
  // How many PUSHes are "beneath" this page in the current JS session.
  // > 0 means navigate(-1) is safe to call.
  depth: number;
  // The path we came FROM (survives page reload via sessionStorage).
  // Used as a fallback when depth === 0 but the session stack has context.
  previousPath: string | null;
};

export const NavigationDepthContext = createContext<NavState>({
  depth: 0,
  previousPath: null,
});

// Tracks in-app navigation depth AND persists a "came from" path stack in
// sessionStorage so the correct back target survives iOS PWA reloads.
//
// depth > 0  →  navigate(-1) is safe (browser history has entries)
// depth = 0 + previousPath  →  use navigate(previousPath, replace) instead
// depth = 0 + no previousPath  →  fall back to the page's own defaultPath
export function NavigationDepthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();
  const depthRef = useRef(0);
  const stackRef = useRef<string[]>(loadStack());
  const prevPathnameRef = useRef<string | null>(null);

  const [navState, setNavState] = useState<NavState>(() => ({
    depth: 0,
    previousPath: stackRef.current[stackRef.current.length - 1] ?? null,
  }));

  useEffect(() => {
    const stack = [...stackRef.current];

    if (navType === "PUSH") {
      depthRef.current += 1;
      // Record WHERE we came from (the pathname before this push).
      if (prevPathnameRef.current !== null) {
        stack.push(prevPathnameRef.current);
      }
    } else if (navType === "POP") {
      depthRef.current = Math.max(0, depthRef.current - 1);
      stack.pop();
    }
    // REPLACE: depth unchanged, stack top updated to current path.
    if (navType === "REPLACE" && stack.length > 0) {
      stack[stack.length - 1] = location.pathname;
    }

    stackRef.current = stack;
    saveStack(stack);
    prevPathnameRef.current = location.pathname;

    setNavState({
      depth: depthRef.current,
      previousPath: stack[stack.length - 1] ?? null,
    });
  }, [location.key, navType, location.pathname]);

  return (
    <NavigationDepthContext.Provider value={navState}>
      {children}
    </NavigationDepthContext.Provider>
  );
}
