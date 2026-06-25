import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled || !visible) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[min(92vw,380px)] rounded-3xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-4">
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-accent font-semibold">Install VisaClear</p>
        <h3 className="mt-1 text-base font-semibold text-foreground">Use it like a native app.</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Save the checklist, reminders, and agent tools on your home screen for faster access.
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={handleInstall} className="flex-1 cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          Install app
        </Button>
        <Button variant="secondary" onClick={() => setVisible(false)} className="cursor-pointer">
          Later
        </Button>
      </div>
    </div>
  );
}
