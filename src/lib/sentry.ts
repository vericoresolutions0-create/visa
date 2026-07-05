import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN ?? "";

export const isSentryConfigured = DSN.length > 0;

function scrubSensitiveUrls(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  // Client portal URLs contain a 32-char hex intake token in the path
  // (e.g. /client-portal/abc123…). Strip the token so it never reaches
  // Sentry, since possessing it grants access to client documents.
  const scrub = (url: string | undefined) =>
    url?.replace(/\/client-portal\/[a-f0-9]{32,}/gi, "/client-portal/[token]");

  if (event.request?.url) {
    event.request.url = scrub(event.request.url) ?? event.request.url;
  }
  if (event.request?.headers?.Referer) {
    event.request.headers.Referer = scrub(event.request.headers.Referer) ?? event.request.headers.Referer;
  }
  return event;
}

export function initSentry() {
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    beforeSend: scrubSensitiveUrls,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
