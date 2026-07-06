/**
 * Lightweight drop-off analytics hook.
 * Tracks page views and feature interactions using localStorage.
 * Data is available in the admin panel for weekly review.
 * No personal data is stored — only anonymous event counts.
 */

export type AnalyticsEvent =
  | "page_view"
  | "checklist_started"
  | "checklist_completed"
  | "checklist_pdf_download"
  | "ai_assistant_opened"
  | "upgrade_prompt_clicked"
  | "share_link_copied"
  | "pricing_page_viewed"
  | "agents_page_viewed"
  | "blog_article_opened"
  | "risk_score_completed"
  | "agent_link_clicked";

type EventRecord = {
  event: AnalyticsEvent;
  page?: string;
  timestamp: string;
  metadata?: Record<string, string>;
};

const STORAGE_KEY = "vc_analytics";
const MAX_EVENTS = 500; // keep last 500 events

function getEvents(): EventRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EventRecord[];
  } catch {
    return [];
  }
}

function saveEvents(events: EventRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // localStorage may be unavailable in some environments
  }
}

export function trackEvent(
  event: AnalyticsEvent,
  metadata?: Record<string, string>
): void {
  const events = getEvents();
  events.push({
    event,
    page: typeof window !== "undefined" ? window.location.pathname : undefined,
    timestamp: new Date().toISOString(),
    ...(metadata ? { metadata } : {}),
  });
  saveEvents(events);
}

/** Returns a summary of event counts for admin review */
export function getAnalyticsSummary(): Record<string, number> {
  const events = getEvents();
  const summary: Record<string, number> = {};
  for (const e of events) {
    summary[e.event] = (summary[e.event] ?? 0) + 1;
  }
  return summary;
}

/** Returns the last N events for drop-off debugging */
export function getRecentEvents(n = 50): EventRecord[] {
  return getEvents().slice(-n);
}

/** Clears all analytics data */
export function clearAnalytics(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** React hook — no-op at app level; analytics are tracked via trackEvent() at feature points */
export function useAnalytics(): void {
  // intentionally empty
}
