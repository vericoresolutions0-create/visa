import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, Home, LayoutDashboard, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { captureException } from "@/lib/sentry.ts";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidMount() {
    // Clear the chunk-reload counter once the app loads successfully.
    if (!this.state.hasError) {
      sessionStorage.removeItem("vc_chunk_reload");
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App runtime error:", error, info.componentStack);
    captureException(error, { componentStack: info.componentStack });

    // A stale chunk reference after a new deploy causes a dynamic-import
    // failure. Force a single hard reload to pick up the new asset hashes.
    const isChunkError =
      error.message.includes("dynamically imported module") ||
      error.message.includes("Failed to fetch dynamically imported") ||
      (error as Error & { name: string }).name === "ChunkLoadError";

    if (isChunkError) {
      const count = Number(sessionStorage.getItem("vc_chunk_reload") ?? "0");
      if (count < 2) {
        sessionStorage.setItem("vc_chunk_reload", String(count + 1));
        window.location.reload();
      }
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-primary mb-2">
            Something needs a refresh
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            The page hit an unexpected error and could not load. You can try
            reloading, go back to the dashboard, or return home.
          </p>
          {this.state.message ? (
            <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-destructive mb-1">
                Error
              </p>
              <p className="text-xs text-destructive break-words">
                {this.state.message}
              </p>
            </div>
          ) : null}
          <div className="grid gap-3">
            <Button
              className="cursor-pointer font-semibold"
              onClick={() => window.location.assign("/dashboard")}
            >
              <LayoutDashboard className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <Button
              variant="secondary"
              className="cursor-pointer font-semibold"
              onClick={() => window.location.reload()}
            >
              <RotateCw className="w-4 h-4" />
              Reload Page
            </Button>
            <Button
              variant="ghost"
              className="cursor-pointer font-semibold"
              onClick={() => window.location.assign("/")}
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
