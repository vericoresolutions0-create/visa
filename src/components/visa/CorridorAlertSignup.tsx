import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Bell, CheckCircle, Loader2, X } from "lucide-react";

interface Props {
  origin: string;
  destination: string;
  visaType: string;
  corridorLabel: string;
}

export function CorridorAlertSignup({ origin, destination, visaType, corridorLabel }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "already" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const subscribe = useMutation(api.visaCorridors.subscribeToCorridorAlerts);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return;
    setState("loading");
    try {
      const result = await subscribe({ email: trimmed, origin, destination, visaType });
      setState(result.alreadySubscribed ? "already" : "done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("rate limit") || msg.includes("Too many")) {
        setErrorMsg("Too many requests today. Try again tomorrow.");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">You're on the list</p>
          <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
            We'll email <span className="font-medium">{email.trim()}</span> if policy changes for {corridorLabel}.
          </p>
        </div>
      </div>
    );
  }

  if (state === "already") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
        <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Already subscribed</p>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
            {email.trim()} is already receiving alerts for {corridorLabel}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-amber-500 shrink-0" />
        <h3 className="text-sm font-semibold text-foreground">Policy Change Alerts</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Get notified when visa rules, processing times, or fees change for {corridorLabel}.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
          placeholder="your@email.com"
          required
          disabled={state === "loading"}
          className="flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={state === "loading" || !email.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {state === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Alert me
        </button>
      </form>
      {state === "error" && (
        <div className="flex items-center gap-1.5 text-sm text-destructive">
          <X className="h-3.5 w-3.5 shrink-0" />
          {errorMsg}
        </div>
      )}
      <p className="text-xs text-muted-foreground">No spam. Unsubscribe any time. One email per policy change.</p>
    </div>
  );
}
