import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, Home, RotateCw, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { signInDemoUser } from "@/hooks/use-demo-auth.ts";

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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App runtime error:", error, info.componentStack);
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
            The demo hit a runtime error instead of loading the next screen. You
            can reopen the demo dashboard or return home.
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
              onClick={() => {
                signInDemoUser();
                window.location.assign("/dashboard");
              }}
            >
              <UserRoundCheck className="w-4 h-4" />
              Open Demo Dashboard
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
