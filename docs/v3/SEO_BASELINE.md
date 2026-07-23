# SEO BASELINE — MK-ViralCanvas

**Date:** 2026-07-23 · Production: https://19-web-viral-creator.vercel.app (curl-verified)

## What is correct today (verified on prod)

- `<title>` — "MK ViralCanvas — Social Image, Meme & Content Creator" (served on prod).
- Meta description present and sane; `meta robots: index, follow`; `meta author: Kazi Musharraf`.
- **Canonical** — `https://19-web-viral-creator.vercel.app/` (matches serving host, correct, self-referencing).
- Open Graph: `og:type`, `og:title`, `og:description`, `og:url`, `og:site_name` all present and consistent.
- JSON-LD: valid `WebApplication` block with `author`/`creator` = "Kazi Musharraf" + `sameAs` GitHub, price 0 offer.
- `robots.txt` → 200: `User-agent: * / Allow: / / Sitemap: https://19-web-viral-creator.vercel.app/sitemap.xml` (host matches).
- `sitemap.xml` → 200: single root URL, `lastmod 2026-07-22`. Appropriate for a one-route SPA.
- **No localhost references** in served or locally-built HTML (grep of `dist/` after fresh build: zero hits).
- No hardcoded analytics IDs: `var GTM_ID = "%VITE_GTM_ID%"` placeholder ships inert, guarded by `charAt(0) !== '%'` + format regex. No GTM-/G-/UA- IDs anywhere in src (grep-verified).
- `manifest.webmanifest` → 200; `theme-color` set.

## Gaps (ranked)

1. **Deep routes 404 (also an SEO problem).** `/editor`, `/about` → HTTP 404 with `x-vercel-error: NOT_FOUND`. Any inbound link with a path (UTM-less shares, typos, future routes) hits Vercel's plain-text 404 — no branded 404, no recovery. The SPA rewrite in `vercel.json` is not effective on the current production deployment.
2. **No `og:image` / `twitter:image`** while `twitter:card` declares `summary_large_image` (`index.html:23`); `/og-image.png` → 404. Social shares show no preview — worst single lever for a "viral content" product. (Flagged in the wave-2 SEO audit; still open.)
3. **Client-rendered empty shell.** Body is `<div id="root"></div>`; all copy (H1/H2, feature blurbs) renders via JS. Google handles it; other crawlers/AI answer engines get nothing. V3 option: prerender the landing shell or emit static hero content in `index.html`.
4. **Domain/brand mismatch.** Product is "MK ViralCanvas" but lives at `19-web-viral-creator.vercel.app`. No custom domain; brand equity accrues to a numbered subdomain. Sitemap/canonical would all need a coordinated swap when a domain is added.
5. **Single H1 is the logo text** (`MK_ViralCanvas` in nav, `h1`); the keyword-bearing "Create Memes that Go Viral" is an `h2`. Minor: swap heading levels.
6. **`meta keywords`** present (`index.html:10`) — obsolete, harmless; drop it.
7. **Google Fonts render-blocking** stylesheet in `<head>` (has `display=swap`, preconnects present). Consider self-hosting for LCP + the "no data collected" claim.
8. **Favicon/manifest icon is an emoji SVG data-URI** — no maskable PNG set, weak install/share surface.

## Recommended V3 baseline actions

1. Fix SPA fallback (redeploy/verify rewrite) + add a branded 404 route.
2. Generate a real 1200x630 `og-image.png`, add `og:image`, `og:image:width/height`, `twitter:image`.
3. Decide custom domain before V3 launch; update canonical/OG/robots/sitemap/JSON-LD together.
4. Prerender or inline static landing copy for non-Google crawlers.
