import { useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export function LiveDataDisclaimer({ className }: { className?: string }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("vc_disclaimer_dismissed") === "1";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("vc_disclaimer_dismissed", "1");
    } catch {
      // ignore
    }
  };

  if (dismissed) return null;

  return (
    <div className={cn(
      "flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800",
      className
    )}>
      <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed flex-1">
        <span className="font-semibold">Data notice:</span> Visa requirements, fees, and processing times change frequently. Our checklists are regularly reviewed but may not reflect the latest updates. Always verify requirements directly on the official embassy or government immigration website before submitting your application.
      </p>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-amber-400 hover:text-amber-600 cursor-pointer transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
