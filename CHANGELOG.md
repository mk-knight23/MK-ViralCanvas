# Changelog - MK ViralCanvas

All notable changes to this project will be documented in this file.

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
