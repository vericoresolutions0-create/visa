import { useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner.tsx";
import { convexErrMsg } from "@/lib/utils.ts";

type UpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the free trial actually starts, so the caller can retry whatever action triggered the limit. */
  onTrialStarted?: () => void;
};

/**
 * The free-to-pro conversion moment: one clear offer, no pricing table, no
 * feature comparison. Copy is exact per the product spec.
 */
export function UpgradeModal({ open, onOpenChange, onTrialStarted }: UpgradeModalProps) {
  const startTrial = useMutation(api.users.startTrial);
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const handleStartTrial = async () => {
    setStarting(true);
    try {
      await startTrial({ plan: "pro" });
      toast.success("Your 7-day Pro trial has started.");
      onOpenChange(false);
      onTrialStarted?.();
      navigate("/dashboard");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not start your trial. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <DialogTitle className="font-serif text-xl text-primary">
            You have used your 3 free checklists this month
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
            Upgrade to Pro to save unlimited checklists, unlock your document vault, and
            never miss a deadline again. 7-day free trial. Cancel anytime.
          </DialogDescription>
        </DialogHeader>
        <EmailVerificationBanner />
        <Button
          size="lg"
          className="w-full font-semibold cursor-pointer mt-2"
          disabled={starting}
          onClick={() => void handleStartTrial()}
        >
          {starting ? "Starting your trial…" : "Start My Free Trial — $9/month after trial"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
