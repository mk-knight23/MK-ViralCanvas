# SECURITY BASELINE — MK-ViralCanvas

**Date:** 2026-07-23. No secret values appear in this report.

## Posture summary

Local-first SPA with no auth, no payments, no server-side user data. Attack surface = public read-only search API proxy + localStorage/JSON-import parsing on the client. Overall posture: **good**, with a short hardening list.

## Verified clean (evidence)

- **No client-exposed secrets.** All 8 search-provider keys are read exclusively from `process.env` inside serverless code (`api/_lib/memes.mjs`); only `VITE_GTM_ID`/`VITE_GA4_ID` are client-visible by design (IDs, not secrets), and neither is set. Grep for key/token/secret literals across `src/`, `index.html`, `public/`: zero hits. Built `dist/` contains only the inert `%VITE_GTM_ID%` placeholder.
- **No hardcoded analytics IDs** (grep `GTM-|G-|UA-` across src/api/server/index.html: zero).
- **No XSS sinks.** Zero `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` in `src/`, `api/`, `server/` (grep-verified). All user text renders through React text nodes.
- **Hardened JSON import.** `projectStorage.ts` `validateProject`: type-checks every field, clamps numeric ranges, bounds string lengths (text 500, name 80), regenerates duplicate ids, and `isSafeImageUrl` rejects `javascript:`/other script-capable schemes (allows https/http/data:image/blob:/root-relative). Import file size capped at 8MB (`ProjectsMenu.tsx`). Covered by tests.
- **`npm audit --omit=dev`: 0 vulnerabilities.** Production dependency tree is clean (express/cors/concurrently were moved to devDependencies in PR #4).
- **Upstream fetch hygiene** — `api/_lib/memes.mjs`: AbortController timeout (15s; Apify 45s), `Promise.allSettled` isolation per source, response dedup, bounded in-memory cache (300 entries / 10min TTL).
- **Input clamping on API** — `search.mjs`/`[category].mjs`: query sliced to 200 chars, `num` clamped 1–50, `page` 1–20, category whitelisted against `CATEGORY_QUERIES`.
- **Security headers live on prod** (curl-verified): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo/FLoC off), `Strict-Transport-Security` (Vercel).

## Findings (ranked)

| # | Severity | Finding | Detail / fix |
|---|---|---|---|
| S1 | Medium | **No Content-Security-Policy** | No CSP header or meta. With no XSS sinks the risk is latent, but a CSP (script-src 'self' + GTM hosts when enabled; img-src https: data: blob:) is cheap insurance for a V3 that will add AI endpoints. Note: current inline GTM bootstrap in `index.html` would need a nonce or extraction |
| S2 | Medium | **No rate limiting on `/api/*`** | Serverless search endpoints are unauthenticated and uncached per-instance only. Harmless today (imgflip free), but the moment paid provider keys are added, anyone can burn quota/dollars via `/api/memes/search`. Add per-IP limiting (Vercel WAF rule / KV counter) before configuring any paid key |
| S3 | Low | `isSafeImageUrl` allows `http://` | Mixed-content image loads (browsers block or warn) and `data:` URLs up to 10MB stored in localStorage. Consider https-only + size cap alignment |
| S4 | Low | Dev-only npm vulns: 11 (1 critical, 8 high) | All in devDependencies: `vitest` UI arbitrary-file-read (critical, only when `--ui` server listening), `vite` dev-server path traversal, `ws`, `js-yaml`, `picomatch`, `brace-expansion`, `flatted`, `shell-quote` (via `concurrently`), `postcss`, `@babel/core`. None reachable in production build. Fix opportunistically via `npm audit fix` in a dedicated PR |
| S5 | Low | Dev Express wrapper uses permissive `cors()` and no error handler | `server/index.js` — dev-only (never deployed; Vercel functions serve prod). Accepted risk; keep it out of any prod path |
| S6 | Info | Google Fonts third-party request | Slightly weakens the "No data collected" footer claim (IP disclosure to Google). Self-host fonts in V3 |
| S7 | Info | `console.error` ships in prod bundle (`utils/api.ts:31`) | Violates house style; replace with silent structured handling when D5 (error handling) is fixed |

## V3 security prerequisites (for AI gateway work)

1. AI keys server-side only, following the existing `api/_lib` pattern; never `VITE_`-prefixed.
2. Rate limiting + request budget per IP **before** any paid provider or LLM key is configured (S2).
3. Add CSP alongside the V3 shell rework (S1).
4. Prompt-injection surface: any AI feature that fetches remote template/text content must treat it as untrusted data.
