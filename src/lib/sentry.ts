import * as Sentry from "@sentry/react";

const DSN = "https://125c7bec1bbcc90586d396c0fd499408@o4511659934285824.ingest.de.sentry.io/4511659957747792";

export const isSentryConfigured = true;

export function initSentry() {
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
