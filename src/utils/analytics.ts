/**
 * MK Suite — Privacy-Safe Analytics
 */

type EventParams = Record<string, string | number | boolean>;

interface AnalyticsWindow extends Window {
  dataLayer?: Array<Record<string, unknown>>;
  gtag?: (command: string, event: string, params: EventParams) => void;
}

const BLOCKED = ["payee", "amount", "password", "email", "prompt", "custom_text", "uploaded"];

function sanitize(params: EventParams): EventParams {
  const safe: EventParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (!BLOCKED.some(b => k.toLowerCase().includes(b))) safe[k] = v;
  }
  return safe;
}

export const analytics = {
  track(event: string, params: EventParams = {}) {
    const safe = sanitize(params);
    const w = window as AnalyticsWindow;
    try {
      if (w.dataLayer) w.dataLayer.push({ event, ...safe });
      if (w.gtag) w.gtag("event", event, safe);
    } catch { /* analytics unavailable */ }
  },
  pageView(path: string, title: string) {
    this.track("page_view", { page_path: path, page_title: title });
  }
};
