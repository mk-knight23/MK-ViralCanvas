/**
 * GTM / GA4 loaders. IDs are injected at build time via VITE_GTM_ID /
 * VITE_GA4_ID; nothing loads (and no network request fires) when they are
 * unset or malformed. This lives in the bundle instead of an inline
 * <script> in index.html so the Content-Security-Policy can stay at
 * script-src 'self' without 'unsafe-inline'. See docs/ANALYTICS.md and
 * docs/v3/CSP_NOTES.md.
 */

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;
const GA4_ID_PATTERN = /^G-[A-Z0-9]+$/;

function appendScript(src: string): void {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function loadAnalytics(): void {
  const w = window as AnalyticsWindow;

  const gtmId = import.meta.env.VITE_GTM_ID as string | undefined;
  if (gtmId && GTM_ID_PATTERN.test(gtmId)) {
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    appendScript(`https://www.googletagmanager.com/gtm.js?id=${gtmId}`);
  }

  const ga4Id = import.meta.env.VITE_GA4_ID as string | undefined;
  if (ga4Id && GA4_ID_PATTERN.test(ga4Id)) {
    appendScript(`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`);
    w.dataLayer = w.dataLayer || [];
    // gtag.js expects Arguments objects on the dataLayer, so this must
    // stay a classic function pushing `arguments` (not a rest array).
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      (w.dataLayer as unknown[]).push(arguments);
    };
    w.gtag('js', new Date());
    w.gtag('config', ga4Id, { anonymize_ip: true });
  }
}
