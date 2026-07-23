# BROKEN / MISLEADING / DEAD FEATURE INVENTORY — MK-ViralCanvas

**Date:** 2026-07-23. Every item cites a file/line or a production probe. Severity: P0 = user-visible breakage or false claim, P1 = misleading UX / drift, P2 = dead weight.

## P0 — Broken or false in production

1. **SPA deep-route fallback returns 404 on production.**
   `curl https://19-web-viral-creator.vercel.app/editor` → HTTP 404, `x-vercel-error: NOT_FOUND` (same for `/about`). `vercel.json` on `main` contains the rewrite `{"source": "/((?!api|assets|.*\\..*).*)", "destination": "/index.html"}` and the security headers from the same file ARE being served — so the deployed config/deployment does not apply the rewrite as intended. Today the app has only one route so user impact is limited, but any shared deep link, typo, or future route 404s hard. Fix: redeploy from current `main` and re-verify; if still failing, test the regex against Vercel's path-to-regexp matcher or switch to the simpler `"/((?!api/).*)"` + filesystem handle.

2. **"AI-Powered — Smart templates" feature card is a false claim.**
   `src/App.tsx:100` renders `{ icon: Sparkles, label: 'AI-Powered', desc: 'Smart templates' }` on the landing page. No AI code exists in the repo (README states this honestly). Remove or reword until V3 ships real AI.

3. **Missing OG/Twitter image while declaring `summary_large_image`.**
   `index.html:23` sets `twitter:card = summary_large_image`; there is no `og:image` / `twitter:image` tag and `/og-image.png` → 404. Social shares render with no preview image. (Already flagged in `docs/release-reports/SEO_AEO_ANALYTICS_REPORT.md`; still open.)

## P1 — Misleading UX / functional drift

4. **API failures are masked as "no results".** `src/utils/api.ts:24-34` — `fetchApi` catches all errors, logs `console.error`, returns `[]`. Downstream, `MemeGenerator` then toasts "No memes found. Try different keywords!" during outages; its own `catch`/error toasts are unreachable for network failures. Users can't distinguish outage from empty search.

5. **Search source status lies about missing keys.** Provider functions in `api/_lib/memes.mjs` return `[]` when their env key is unset, so `sourceStatus` reports `"empty"` (verified on prod: all 8 paid sources `"empty"`) instead of `"unconfigured"`. Ops/debug signal is wrong.

6. **Favorites stat counter drifts.** `MemeGenerator.tsx:1041` calls `removeFavorite(f.id)` (memeStore) but never `stats.removeFavorite()`; only add increments. The nav/settings "Favorites" count grows monotonically and diverges from the actual favorites list.

7. **Version drift.** UI footer "MK ViralCanvas v2.0" (`App.tsx:117`, `SettingsPanel.tsx:266`) vs `package.json` `2.1.0` vs CHANGELOG `[2.4.0] - unreleased`.

8. **Stale GitHub link + old product name.** Footer links to `github.com/mk-knight23/19-web-viral-creator` (`App.tsx:120`) — 301-redirects to `MK-ViralCanvas` today, breaks if the redirect ever lapses. `package.json` name is still `19-web-viral-creator`. localStorage namespaces are split between legacy `memelab-*` (settings/stats/favorites) and `viralcanvas:v1:*` (projects).

9. **Branding: footer byline reads "Kazi Musharraf — Kazi Developer"** (`App.tsx:127`). Canonical is **"Kazi Musharraf"**; drop the non-canonical "Kazi Developer" suffix. (No "Qazi Musharof"/"Qazi Musharraf" misspellings remain anywhere — verified by grep; only historical mentions inside release reports.)

10. **Clipboard copy can silently fail / lose user gesture.** `MemeGenerator.tsx:361-381` — `navigator.clipboard.write` is awaited inside the async `canvas.toBlob` callback; the surrounding try/catch cannot catch a rejection there (unhandled rejection, no error toast), and Safari may reject because the write happens outside the original user gesture.

11. **Canvas text layers are not keyboard-operable.** `CanvasStage.tsx:128-134` gives layers `role="button"` and `tabIndex={0}` but no `onKeyDown` — keyboard users can focus a layer but cannot move it (X/Y sliders exist as an indirect fallback).

## P2 — Dead code / placeholder / debris (safe deletions for V3)

| Item | Evidence |
|---|---|
| `src/utils/analytics.ts` | Never imported anywhere (grep) |
| `src/components/common/Button.jsx`, `Card.jsx`, `Input.jsx` | Never imported; only `.jsx` files in an otherwise-TS codebase; generic Tailwind boilerplate that doesn't match the design system |
| `src/types/index.ts` | `User`, `FormField`, `PaginationParams`, duplicate `ApiResponse` — never imported; scaffold leftovers |
| `constants.ts` → `DEFAULT_TEMPLATES`, `STORAGE_KEYS` | Never imported (only `KEYBOARD_SHORTCUTS` is used) |
| `stores/settings.ts` → `reducedMotion`, `autoSave`, `highQualityExport` + 3 setters | No UI reads or writes them |
| `hooks/useAudio.ts` → `playHover`, `playSuccess`, `playError` | Only `playClick` is used (SettingsPanel) |
| `utils/api.ts` → `getCategories()` and `api/categories.mjs` endpoint | Frontend never calls it (categories are hardcoded in `MemeGenerator.tsx:89`) |
| `public/css/premium-design.css` | Unreferenced by any HTML/TSX; still copied into `dist/css/` on every build |
| `app.json` | Heroku config **written as YAML with comments — invalid app.json**; Heroku not used |
| `firebase.json` | Firebase hosting config; Firebase not used (Vercel is the deploy target) |
| `package.json` → `heroku-postbuild`, `production` scripts | Heroku leftovers |
| `.cursorrules`, `.cursor/`, `.gemini/`, `.evolution/`, `attached_assets/` | Editor/agent config debris tracked in repo |
| `docs/post-*.md`, `linkedin-post.md`, `podcast-script.md`, `video-*-script.md`, `docs/replit.md`, `docs/feature_0*.md` | Marketing/scaffold noise inside the product repo |
| `docs/FEATURES.md`, `docs/Project-Brain/FEATURES_LIST.md` | Auto-generated claim sheets not grounded in the codebase |
