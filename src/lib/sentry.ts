import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export const isSentryConfigured = Boolean(dsn);

// Real error monitoring once VITE_SENTRY_DSN is set — until then this is a
// no-op, same "not configured yet" pattern used elsewhere in the app.
// Captures uncaught errors and unhandled promise rejections automatically;
// the ErrorBoundary below additionally reports React render errors, which
// Sentry's own browser SDK can't see on its own.
export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
