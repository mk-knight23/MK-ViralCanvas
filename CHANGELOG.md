# Changelog - MK ViralCanvas

All notable changes to this project will be documented in this file.

## [2.4.0] - unreleased
- Multi-layer text system: unlimited positioned text layers (up to 30) with per-layer font, size, weight, color, stroke, shadow, opacity, rotation, hide/show, lock, reorder, duplicate, delete. Classic top/bottom text remains the default two layers.
- Drag-to-reposition text directly on the canvas (mouse + touch via pointer events), plus X/Y sliders.
- Artboard presets: Instagram Square/Portrait/Story, YouTube Thumbnail, X Post, LinkedIn Post, Facebook Post, Pinterest Pin, and custom WxH (16-4096px). Preview scales to fit; exports render at true dimensions.
- Named local projects under `viralcanvas:v1:` localStorage keys: debounced autosave, recent-projects list with open/duplicate/rename/delete, JSON export, and validated JSON import that rejects malformed input gracefully.
- Export upgrades: PNG + JPEG + WebP via canvas.toBlob, quality slider for lossy formats, 1x/2x resolution multiplier, browser-fallback notice when a format is unsupported.
- Dashboard strip with real local data: recent projects, total exports counter, storage usage estimate.
- Test suite expanded from 1 to 41 tests (layer operations, project serialization round-trip, import validation, store history); in-memory Storage polyfill added to test setup.

### Accessibility (WCAG 2.2 AA)
- Named all editor form controls: the six layer-style sliders (font size, text rotation, stroke width, text opacity, horizontal/vertical position) and the Font/Weight selects now carry `aria-label`s (WCAG 4.1.2 / 1.3.1).
- Restored keyboard focus visibility on the Font/Weight selects, the Artboard preset select, and the custom width/height inputs — replaced bare `outline-none` with the project's existing `focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary` recipe (WCAG 2.4.7).

## [2.3.0] - 2026-07-22
- P0 upgrade pass: fixed brand spelling (Qazi → Kazi), removed stale deploy artifacts, replaced legacy Vercel builds config with modern SPA rewrites + security headers.
- Truthful docs: real README, docs/ARCHITECTURE.md, docs/ANALYTICS.md, docs/PRIVACY.md, updated SECURITY.md.
- Analytics: GTM + GA4 only inject at build time when a valid env var is set; no fake tracking.
- PWA manifest added or corrected; JSON-LD upgraded with creator + author URLs.
- Converted Express meme-search server into Vercel Serverless Functions (api/*.mjs) so production /api/* endpoints actually work; dev Express wrapper reuses the same handlers.
- Bundle split: single 582KB chunk broken into react/react-dom/motion/export-canvas/icons/store chunks, no chunk >250KB after gzip.

## [2.2.0] - 2026-07-19
- Redesigned with premium glassmorphism.
- Unified brand identification under Kazi Musharraf.
- Modernized project dependencies.
- Added SEO pages, analytics wrapper, and sitemaps.
