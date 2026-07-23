# CURRENT STATE AUDIT — MK-ViralCanvas

**Date:** 2026-07-23 · **Branch:** `docs/release-reports` (uncommitted prettier-only edits to `MemeGenerator.tsx` / `SettingsPanel.tsx` left untouched) · **Production:** https://19-web-viral-creator.vercel.app · **Auditor:** Agent 1 (Phase 0 discovery, read-only)

## 1. Command results (exact, run locally)

| Command | Result | Notes |
|---|---|---|
| `npm ci` | **PASS** | Warning: install scripts blocked by local npm policy for `esbuild@0.25.12` and `fsevents@2.3.3` (`allowScripts`); build unaffected |
| `npm run lint` (`eslint .`) | **PASS** | 0 errors, 0 warnings |
| `npm run type-check` (`tsc --noEmit`) | **PASS** | 0 errors |
| `npm test` (`vitest run`) | **PASS** | 6 files, **50/50 tests pass** in 3.11s. Non-fatal React warnings: "An update to MemeGenerator inside a test was not wrapped in act(...)" (x2) |
| `npm run build` (`tsc -b && vite build`) | **PASS** | 2008 modules, built in 2.80s. Warnings: `(!) %VITE_GTM_ID% is not defined in env variables found in /index.html` and same for `%VITE_GA4_ID%` (expected — analytics off by default, placeholder guarded at runtime) |
| `npm audit --omit=dev` | **PASS** | 0 production vulnerabilities |
| `npm audit` (full) | 11 vulns | 1 critical (`vitest` UI server), 8 high, 1 moderate, 1 low — **all in devDependencies** (see SECURITY_BASELINE.md) |

## 2. Features: REAL and working (verified in code; core API verified on production)

- **Template browser** — Imgflip API via `/api/memes/templates` (prod verified: HTTP 200, real data).
- **Multi-layer text editor** — up to 30 text layers, per-layer font/size/weight/color/stroke/shadow/opacity/rotation, hide/lock/reorder/duplicate/delete (`src/utils/layers.ts` pure ops + `LayersPanel.tsx`).
- **Drag-to-reposition** on canvas via pointer events, mouse + touch (`CanvasStage.tsx`).
- **Undo/redo** — 50-snapshot history with debounced commits (`src/stores/projectStore.ts`), Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z.
- **Autosave** — 800ms debounce to `localStorage` under `viralcanvas:v1:project:*`, quota-failure toast (`MemeGenerator.tsx:235-253`).
- **Project management** — save/new/open/rename/duplicate/delete, JSON export, strictly validated JSON import (`ProjectsMenu.tsx`, `projectStorage.ts` with `validateProject`).
- **Artboard presets** — 8 platform presets + custom 16–4096px (`types/project.ts`).
- **Export** — PNG/JPEG/WebP via html2canvas + `canvas.toBlob`, quality slider, 1x/2x multiplier, format-fallback notice, copy-to-clipboard.
- **Image upload** (FileReader data URL), **favorites**, **local stats**, **dark/light/system theme**, **sound effects**, **share links** (Twitter/FB/Reddit/WhatsApp intent URLs), **toasts**, **settings dialog with focus trap**.

## 3. Advertised vs reality

| Claim | Where | Reality |
|---|---|---|
| "AI-Powered — Smart templates" | Landing feature card, `src/App.tsx:100` | **FALSE.** Zero AI code anywhere. README admits "no LLM calls wired". The marketing card ships to production |
| Multi-source web meme search (8 paid providers) | README, Browse tab | **Implemented but production-inactive.** `api/_lib/memes.mjs` has real Serper/Tavily/Brave/SerpApi/SearchApi/Exa/ScrapingDog/Apify integrations; prod `/api/health` returns `"activeSources":["imgflip"]` — **no keys configured**. UI honestly shows only active sources |
| "No data collected" | Footer `App.tsx:122` | Mostly true (no analytics configured, localStorage only), but the page loads Google Fonts from `fonts.googleapis.com` (third-party request) |
| SPA rewrites live in production | CHANGELOG 2.3.0 / P0 report | **BROKEN on prod** — `/editor`, `/about` return HTTP 404 `x-vercel-error: NOT_FOUND` (see SEO_BASELINE.md) despite the rewrite existing in `vercel.json` on `main` |
| `docs/FEATURES.md`, `docs/Project-Brain/FEATURES_LIST.md` | docs | Auto-generated boilerplate ("Feature implementation / Documentation / Tests" repeated; "WCAG 2.1 AA compliant", "CSRF tokens"); not evidence-based; should be deleted or rewritten |
| Footer "MK ViralCanvas v2.0" | `App.tsx:117`, `SettingsPanel.tsx:266` | Version drift: UI says 2.0, `package.json` says 2.1.0, CHANGELOG top entry is 2.4.0-unreleased |

## 4. Mocked / placeholder / dead (full list in BROKEN_FEATURE_INVENTORY.md)

- AI env vars are commented-out placeholders (`.env.example`), correctly labeled.
- Dead modules never imported: `src/utils/analytics.ts`, `src/components/common/{Button,Card,Input}.jsx`, `src/types/index.ts`, `public/css/premium-design.css` (ships to prod build output).
- Dead state: settings store `reducedMotion` / `autoSave` / `highQualityExport` and their setters have no UI and are never read.
- Dead deploy configs: `app.json` (Heroku — actually YAML, invalid as app.json), `firebase.json`, `heroku-postbuild` script.

## 5. Production spot-check (2026-07-23, curl)

- `GET /` → 200, 5,033 bytes, correct title/meta/canonical, no localhost refs, `%VITE_GTM_ID%` placeholder inert.
- `GET /editor` → **404** (SPA fallback broken). `GET /about` → **404**.
- `GET /robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` → 200.
- `GET /api/health` → 200 `{"status":"ok","activeSources":["imgflip"],"totalSources":1}`.
- `GET /api/memes/search?q=cat` → 200, imgflip results only; all 8 paid sources report `"empty"`.
- `GET /og-image.png` → 404 (no OG image exists; `twitter:card` declares `summary_large_image`).

## 6. Verdict

Core product (local-first meme/social-graphic editor) is **real, tested, and working**. Honest-by-default posture is unusually good for this portfolio. The deltas that matter: broken SPA fallback on prod, the false "AI-Powered" card, missing OG image, one 1,063-line god component, and a tail of dead code/config debris. Architecture verdict for V3: **incremental restructure, not rewrite** (see ARCHITECTURE_DEBT.md).
