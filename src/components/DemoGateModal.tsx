import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";

function GateModalContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="demo-gate-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          key="demo-gate-card"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -mr-1 -mt-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-serif text-xl font-semibold text-primary mb-2">
            Ready to make it yours?
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            You're on the demo. Create a free account or choose a plan to start saving real data, uploading documents, and using everything VisaClear has to offer.
          </p>

          <div className="flex flex-col gap-2.5">
            <Button
              className="cursor-pointer w-full font-semibold"
              onClick={() => go("/login")}
            >
              Create Free Account
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer w-full"
              onClick={() => go("/pricing")}
            >
              See Plans &amp; Pricing
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useDemoGate() {
  const { isDemoAuthenticated } = useDemoAuth();
  const [open, setOpen] = useState(false);

  const gate = useCallback((): boolean => {
    if (!isDemoAuthenticated) return false;
    setOpen(true);
    return true;
  }, [isDemoAuthenticated]);

  const GateModal = open ? (
    <GateModalContent onClose={() => setOpen(false)} />
  ) : null;

  return { gate, GateModal };
}
