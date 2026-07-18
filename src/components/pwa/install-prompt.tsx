import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    // Already installed — show nothing
    if (isInStandaloneMode()) return;

    // iOS Safari: beforeinstallprompt never fires; show manual instructions
    if (isIos()) {
      const dismissed = sessionStorage.getItem("vc_ios_prompt_dismissed");
      if (!dismissed) setShowIos(true);
      return;
    }

    // Android / Chrome: capture the browser's install prompt. Respect a
    // prior dismissal the same way the iOS branch does — without this, the
    // prompt reappeared on every reload/new tab after being dismissed,
    // since "Later"/X only ever cleared component state, never persisted.
    const handler = (e: Event) => {
      e.preventDefault();
      if (sessionStorage.getItem("vc_android_prompt_dismissed")) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setShowAndroid(false);
      setDeferredPrompt(null);
    });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setShowAndroid(false);
    setDeferredPrompt(null);
  };

  const dismissIos = () => {
    sessionStorage.setItem("vc_ios_prompt_dismissed", "1");
    setShowIos(false);
  };

  const dismissAndroid = () => {
    sessionStorage.setItem("vc_android_prompt_dismissed", "1");
    setShowAndroid(false);
  };

  // ── Android Chrome prompt ──────────────────────────────────────────────────
  if (showAndroid) {
    return (
      <div className="fixed bottom-20 right-4 z-50 w-[min(92vw,380px)] rounded-3xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-4">
        <button
          type="button"
          onClick={dismissAndroid}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="pr-8">
          <p className="eyebrow">Install VisaClear</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Use it like a native app.</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Save checklists, reminders and agent tools on your home screen for faster access.
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleAndroidInstall} className="flex-1 cursor-pointer">
            <Download className="mr-2 h-4 w-4" />
            Install app
          </Button>
          <Button variant="secondary" onClick={dismissAndroid} className="cursor-pointer">
            Later
          </Button>
        </div>
      </div>
    );
  }

  // ── iOS Safari instructions ────────────────────────────────────────────────
  if (showIos) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,380px)] rounded-3xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={dismissIos}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="pr-8">
          <p className="eyebrow">Install VisaClear</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Add to your Home Screen</h3>
        </div>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">1</span>
            Tap the <Share className="inline w-4 h-4 mx-1 text-accent" /> Share button in Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">2</span>
            Scroll down and tap <strong className="text-foreground ml-1">Add to Home Screen</strong>
          </li>
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">3</span>
            Tap <strong className="text-foreground ml-1">Add</strong> — done!
          </li>
        </ol>
        <Button variant="secondary" onClick={dismissIos} className="mt-4 w-full cursor-pointer">
          Got it
        </Button>
      </div>
    );
  }

  return null;
}
