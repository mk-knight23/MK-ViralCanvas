# Content-Security-Policy Notes

Header shipped from `vercel.json` on every route (`/(.*)`), derived from
**actual code usage**, not a template. Verified locally by serving the
production `dist/` with this exact header and exercising the app (load,
browse, search, canvas render, PNG export, settings) with a clean console.

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none'
```

## Directive-by-directive rationale

| Directive | Value | Why (evidence in code) |
|---|---|---|
| `default-src` | `'self'` | Fallback for anything not listed (media, workers, manifest, frames). The app uses WebAudio oscillators (`src/hooks/useAudio.ts`) — no media files; no workers; `manifest.webmanifest` is same-origin. |
| `script-src` | `'self'` | All JS is bundled by Vite and served same-origin. The former inline GTM/GA4 bootstrap in `index.html` was moved into the bundle (`src/utils/loadAnalytics.ts`) precisely so no `'unsafe-inline'` is needed. The JSON-LD `<script type="application/ld+json">` block is data, never executed, and is not blocked. **No GTM/GA4 IDs are configured in production today**, so Google hosts are deliberately not allow-listed (`googletagmanager.com` is a known CSP-bypass gadget host — allow it only when actually used; see below). |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | `fonts.googleapis.com` serves the Inter/Outfit stylesheet linked in `index.html`. `'unsafe-inline'` is required by reality, not convenience: html2canvas (export flow) serializes the page into a same-origin iframe via `document.write`, and the re-parsed `style="..."` attributes on cloned nodes are subject to `style-src` — without `'unsafe-inline'` PNG/JPEG/WebP export renders unstyled. React/framer-motion styling via CSSOM would otherwise not need it. |
| `font-src` | `'self' https://fonts.gstatic.com` | Google Fonts woff2 files load from `fonts.gstatic.com` (preconnect + stylesheet in `index.html`). |
| `img-src` | `'self' data: blob: https:` | Meme templates and search results come from **arbitrary external hosts**: the fallback set is `i.imgflip.com` (`src/utils/constants.ts`), and `/api/memes/*` aggregates Serper/Tavily/Brave/SerpAPI/SearchAPI/Exa/Scrapingdog/Apify/Imgflip results whose image URLs can be any https host — a fixed host list is impossible for this product. `data:` is required for user-uploaded images (`FileReader.readAsDataURL` in `MemeGenerator.handleImageUpload`) and html2canvas intermediary images; `blob:` covers object-URL previews in the export path. Plain `http:` images are intentionally excluded (mixed content is blocked on HTTPS anyway). |
| `connect-src` | `'self'` | The frontend only fetches same-origin `/api/*` (`src/utils/api.ts` — `BASE = '/api'`); external meme providers are called server-side in the Vercel functions. Vercel Web Analytics/Speed Insights, when enabled from the dashboard, beacon to same-origin `/_vercel/*` paths — covered by `'self'`. |
| `object-src` | `'none'` | No plugins/embeds anywhere. |
| `base-uri` | `'self'` | No `<base>` tag; prevents base-hijack of relative URLs. |
| `form-action` | `'self'` | No form submissions exist (file input + buttons only); locks down injected forms. |
| `frame-ancestors` | `'none'` | Clickjacking protection; matches the existing `X-Frame-Options: DENY` (kept for older browsers). Note html2canvas's internal cloning iframe is an initial `about:blank` document and is not affected by this or by `frame-src`. |

## Share links

Twitter/Facebook/Reddit/WhatsApp share URLs in `MemeGenerator` are plain
`<a target="_blank">` navigations — CSP does not restrict outbound link
navigation, so no directive is needed for them.

## If GTM / GA4 is ever enabled

`src/utils/loadAnalytics.ts` only activates when `VITE_GTM_ID` / `VITE_GA4_ID`
are set at build time. Enabling them **also requires** widening the CSP in
`vercel.json`, or the injected loader will be blocked:

- `script-src`: add `https://www.googletagmanager.com`
- `connect-src`: add `https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com`

## Local verification procedure

1. `npm run build`
2. Serve `dist/` with the exact CSP header (any static server; a Node
   one-liner was used) and open the app.
3. Exercise: initial load, fonts render, Browse tab (external template
   images load), search, canvas edit, PNG export, project JSON export,
   Settings dialog.
4. Check DevTools console for `Refused to ...` CSP violations — must be none
   (the `/api/*` 404s under a static server are expected and unrelated).
