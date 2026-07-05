import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cookie, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useNavigate } from "react-router-dom";
import { initSentry, isSentryConfigured } from "@/lib/sentry.ts";

const STORAGE_KEY = "vc_cookie_consent";

type ConsentState = "accepted" | "declined" | null;

export default function CookieBanner() {
  const navigate = useNavigate();
  const [consent, setConsent] = useState<ConsentState>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "accepted" || stored === "declined") {
      setConsent(stored);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setConsent("accepted");
    if (isSentryConfigured) initSentry();
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, "declined");
    setConsent("declined");
  };

  const visible = consent === null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-[100]"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                <Cookie className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">We value your privacy</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  We use essential cookies for the app to work. No tracking without your consent.
                </p>
              </div>
              <button
                onClick={decline}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                aria-label="Decline"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Expandable details */}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-accent hover:underline cursor-pointer mb-3"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Hide details" : "What cookies do we use?"}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden mb-3"
                >
                  <ul className="text-xs text-muted-foreground space-y-1.5 bg-muted/40 rounded-lg p-3">
                    <li><span className="font-medium text-foreground">Essential:</span> Session state, onboarding progress, checklist saves. Always active.</li>
                    <li><span className="font-medium text-foreground">Analytics:</span> Anonymous page views to help us improve. Only with consent.</li>
                    <li><span className="font-medium text-foreground">No third-party ads.</span> We never sell your data.</li>
                  </ul>
                  <button
                    onClick={() => navigate("/privacy")}
                    className="text-xs text-accent hover:underline cursor-pointer mt-2 block"
                  >
                    Read our full Privacy Policy
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 cursor-pointer text-xs"
                onClick={decline}
              >
                Decline
              </Button>
              <Button
                size="sm"
                className="flex-1 cursor-pointer text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={accept}
              >
                Accept All
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
