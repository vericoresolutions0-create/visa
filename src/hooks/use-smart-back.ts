import { useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { NavigationDepthContext } from "@/hooks/use-navigation-depth.tsx";

export function useSmartBack(defaultPath = "/") {
  const navigate = useNavigate();
  const depth = useContext(NavigationDepthContext);

  return useCallback(() => {
    if (depth > 0) {
      navigate(-1);
      return;
    }
    navigate(defaultPath);
  }, [defaultPath, navigate, depth]);
}
