# Security, Storage & Performance Audit — MK-ViralCanvas / MK-MealScout / MK-TypeSprint

**Auditor:** Agent 6 — Security, Storage & Performance Engineer
**Date:** 2026-07-22
**Scope:** Serverless surface, client storage & import validation, XSS, dependency audit, headers/CSP, performance, privacy conformance.
**Method:** Read-only review of the working trees at `/Users/mkazi/3 Repos/`; fresh `git clone` of each public repo into scratchpad for `npm install`, `npm audit --omit=dev`, and production builds. No secret values are included. No files in the three repos were modified.

**Repo heads audited (working tree):** ViralCanvas `main` (P1 + dashboard, local mods present), MealScout `main` `7c82d5f`, TypeSprint `master` `8365198`.
**Repo heads built/audited (fresh clone):** ViralCanvas `36deb27`, MealScout `f310966`, TypeSprint `8365198` (the P1 merge commits — dependency manifests are identical to the working tree).

---

## Verdict — severity counts by product

| Product | Critical | High | Medium | Low | Notes |
|---|---|---|---|---|---|
| **MK-ViralCanvas** | 0 | 0 | 4 | 3 | No prod-reachable code vuln; findings are hygiene/hardening. |
| **MK-MealScout** | 0 | 0 | 2 | 2 | `axios` is dead weight; Vue auto-escapes. |
| **MK-TypeSprint** | 0 | 1 | 2 | 2 | One genuine stored-XSS chain via malicious import. |

**Portfolio-wide reachable-severity peak: 1 High (TypeSprint stored XSS via import).** The scary-looking `npm audit` "critical/high" entries (ViralCanvas `shell-quote`/`concurrently`, MealScout `axios`) are **not reachable in the shipped product** — evidence below.

---

## 1. Serverless surface — MK-ViralCanvas `api/`

Files reviewed: `api/health.mjs`, `api/sources.mjs`, `api/categories.mjs`, `api/memes/search.mjs`, `api/memes/trending.mjs`, `api/memes/templates.mjs`, `api/memes/category/[category].mjs`, `api/_lib/memes.mjs`, `server/index.js`.

### Cleared (tested and found safe)

- **SSRF — CLEARED.** No user-supplied URL is ever fetched server-side. Every upstream endpoint is a hardcoded literal (`api.imgflip.com`, `google.serper.dev`, `api.search.brave.com`, `serpapi.com`, `searchapi.io`, `api.exa.ai`, `api.scrapingdog.com`, `api.apify.com`, `api.tavily.com` in `api/_lib/memes.mjs`). The only user input reaching upstreams is the search *term* (`q`, clamped to 200 chars — `search.mjs:20`) sent as a query/body param, and `category` which is whitelisted against `CATEGORY_QUERIES` (`category/[category].mjs:13-14`). No URL, host, port, or scheme is user-controllable.
- **Input validation / clamping — GOOD.** `clampInt` bounds `num` to 1–50 and `page` to 1–20 (`search.mjs:11-15`, `category/[category].mjs:3-7`); `q` sliced to 200, `source` sliced to 40; empty `q` → 400 (`search.mjs:23`); unknown category → 400.
- **Timeout coverage — GOOD.** `safeFetch` uses `AbortController` with a 15 s default (`_lib/memes.mjs:49-58`); `withTimeout` adds a 15 s race guard around each source (`:42-47`); Apify override 45 s. `Promise.allSettled` isolates per-source failure (`:319`).
- **Cache poisoning — CLEARED.** Cache keys are built from already-clamped inputs (`search-${q}-${source}-${num}`, `category-${category}-${page}`). The cache is an in-process `Map`, TTL 10 min, max 300 entries with FIFO eviction (`_lib/memes.mjs:1-21`). Values are always the correctly-keyed fetch result; there is no cross-key contamination. Worst case is per-instance cache *thrash* (an attacker sending 300+ distinct queries evicts warm entries) — ephemeral and self-healing. **Low.**

### Findings

- **[Medium] No rate limiting on any `api/*` route (cost-amplification risk).** `search.mjs` / `trending.mjs` / `category` fan out to **all** configured providers per request via `multiSourceSearch` (`_lib/memes.mjs:300-322`). Today the risk is **low** (Imgflip is keyless + cached; the 8 paid providers are env-gated and none are configured). The risk becomes **High the moment any paid provider key is added**: one unauthenticated request triggers up to 8 upstream paid calls, with no per-IP throttle and Vercel invocation cost on top. **Fix:** add a lightweight per-IP limiter (e.g. `@upstash/ratelimit` or an in-memory token bucket per instance) *before* enabling any paid `*_API_KEY`. Document this as a launch gate in `docs/ANALYTICS.md`/`SECURITY.md`.
- **[Low] Error-message information disclosure.** 500 responses return `error.message` verbatim (`search.mjs:65`, `trending.mjs:16`, `templates.mjs:9`, `category:29`). Messages are constructed (`Serper: ${res.status}`, `upstream_timeout`) and contain **no secrets or stack traces**, but they leak which upstream failed and its status. **Fix:** return a generic `{ success:false, error:'search_failed' }` and `console.error` the detail server-side.
- **[Low] Search-result image URLs are third-party-influenced and rendered without an allowlist.** Provider results flow into `<img src={m.url}>` (`MemeGenerator.tsx:918`) with no scheme filter. Not script-executing (`javascript:` in `<img src>` does not run in modern browsers), but a CSP `img-src` bound (Section 5) is the correct mitigation.

### Dev Express wrapper — prod leakage check (CLEARED)

`server/index.js` (Express 5 + cors) is **dev-only and not deployable by accident**:

- It is imported **nowhere** in `src/` or `api/` (`grep` confirmed — only `server/index.js` references `express`/`cors`).
- `vercel.json` uses `framework: vite`, `outputDirectory: dist`; Vercel serves the static build + auto-detects `api/*.mjs` as functions. `server/` is not an API route and is never bundled.
- The `production` npm script is `npm run build && npm start`, but **there is no `start` script** (verified: `scripts.start` is undefined) — so that path is inert and cannot silently boot the Express server in prod.

Consequence: the Express dependency chain (`body-parser`, `path-to-regexp`, `qs`, `shell-quote`) is present but **never executed in production**. See Section 4 for the dependency-hygiene fix.

---

## 2. Client storage & import/restore validation

### MK-ViralCanvas — `src/utils/projectStorage.ts` (STRONG)

- Import path: `parseProjectJson` → `validateProject` builds a **brand-new object with explicit fields only**; it never spread-merges untrusted input (`:150-160`). Layers capped at `MAX_LAYERS` (`:120`), text clamped to 500 chars, all numerics clamped (`clampNumber`), duplicate IDs regenerated (`:130-135`).
- **Prototype pollution — CLEARED.** No recursive merge; a literal `"__proto__"` key in the JSON is ignored because only named fields are copied onto a fresh literal.
- **`javascript:` image URL — CLEARED.** `isSafeImageUrl` (`:49-59`) allows only `https:`, `http:`, `data:image/`, `blob:`, or root-relative; a `data:text/html`/`javascript:` template URL is rejected with "unsafe" (`:87`).
- **Oversized payload — bounded.** Template URL length capped at 10 MB (`:50`); `saveProject` returns `false` on quota exceed (`:202-209`). See the quota finding in Section 6.

### MK-MealScout — `src/utils/backup.ts` + `pantry.ts` + `grocery.ts` (STRONG)

- `parseBackup` requires `app:'mealscout'` + `version:1` markers (`backup.ts:54`), requires all three arrays, and routes every entry through `sanitizePantryEntry` / `sanitizeGroceryItem`, which rebuild fresh objects and drop anything missing `id`/`name` (`pantry.ts:34-47`, `grocery.ts:36-49`). Duplicate IDs de-duped. Invalid entries dropped, never thrown.
- **Prototype pollution / oversized — CLEARED** (fresh-object construction, no merge).

### MK-TypeSprint — `src/lib/storage.js` `importAll` + `src/data-controls.js` (WEAK — feeds the XSS below)

- `validateImportPayload` (`data-controls.js:24-51`) checks only *coarse shape*: object, `version===1`, `data` is an object, `history` is an array (if present), `stats` is an object (if present). It performs **no per-field validation** and **does not inspect `perKey` at all**.
- `importAll` (`storage.js:102-114`) then writes **every** `data[name]` verbatim into namespaced localStorage.
- **Prototype pollution — CLEARED** (values are written to distinct localStorage string keys, not merged into a live object; a `"__proto__"` name just becomes an inert key `typesprint:v1:__proto__`).
- **Stored-XSS — NOT CLEARED.** The unvalidated values later reach `innerHTML`. See Section 3, Finding TS-1.

---

## 3. XSS review — `innerHTML` / `v-html` / `dangerouslySetInnerHTML` / `insertAdjacentHTML`

`grep` across all three (`src`, `index.html`, `api`, `server`) found **zero** `dangerouslySetInnerHTML`, `v-html`, `insertAdjacentHTML`, `document.write`, `eval`, or `new Function`. React (ViralCanvas) and Vue (MealScout) auto-escape all interpolated text, including TheMealDB strings, Imgflip names, and imported JSON — **cleared for those two products** (remote/imported strings render as text; images render as `src`/`alt` which do not execute script).

The only `innerHTML` sinks are in TypeSprint (vanilla JS):

### [HIGH] TS-1 — Stored XSS via malicious import file (three sinks, one root cause)

**Root cause:** `data-controls.js` import path writes attacker-controlled fields into localStorage without validation (Section 2), and three renderers interpolate those fields **raw** into `innerHTML`:

| Sink | File:line | Raw-interpolated attacker fields |
|---|---|---|
| History table | `src/history.js:140` (`el.historyList.innerHTML = ...`, template `:129-143`) | `e.wpm`, `e.accuracy`, `e.mode`, `e.time`, `e.date` |
| Keyboard heatmap | `src/heatmap.js:106` (`el.keyboardHeatmap.innerHTML = rowsHtml`, `:100`) | `stat.hits`, `stat.misses` inside a `title="…"` / `aria-label="…"` attribute (breakout via `">`) |
| Progress dashboard | `src/dashboard.js:78` (`el.progressDashboard.innerHTML = ...`, `:85-88`) | `stats.bestWPM`, `stats.tests` |

**Confirmed attack path (conceptual PoC):** a user is socially engineered into importing a crafted `typesprint-data-*.json` backup (the app explicitly offers Import, and backups are shareable files):

```json
{ "version": 1, "data": {
  "history": [ { "wpm": "<img src=x onerror=/*exfil localStorage*/>", "accuracy": 0, "mode": "word", "date": "2024-01-01" } ],
  "stats":   { "tests": "<img src=x onerror=alert(document.domain)>", "bestWPM": 0 },
  "perKey":  { "a": { "accuracy": 0, "hits": 0, "misses": "\"><img src=x onerror=alert(1)>" } }
} }
```

On import, `validateImportPayload` passes it (shape is valid), `importAll` stores it, `refreshAfterDataChange()` reloads, and each renderer injects the payload into the live DOM → arbitrary script execution in the app origin.

**Impact:** no login/cookies/tokens exist to steal, so this is not account takeover; but the injected script can read/exfiltrate all localStorage, keylog typed practice text, deface, or redirect. Delivery via a shared backup file makes it a genuine *stored* XSS (attacker-authored, victim-imported), not mere self-XSS. **Rated High** (clear exploitability + realistic delivery), capped below Critical by the no-auth/no-secret threat model.

**Fix (do both):**
1. **Escape at the sink.** Replace raw interpolation with HTML-escaping (a 5-line `escapeHtml`) or, better, build rows with `document.createElement` + `textContent`. For numeric fields, coerce with `Number(...) || 0` before rendering.
2. **Validate at import.** In `validateImportPayload`, deep-validate: each `history` entry's `wpm`/`accuracy`/`time` are finite numbers, `mode`/`date` are constrained strings; `stats.tests`/`bestWPM` are numbers; add a `perKey` branch requiring numeric `hits`/`misses`/`accuracy`. Drop anything else. (This mirrors what ViralCanvas/MealScout already do.)

### Cleared XSS

- **TS — `ui.js:116` `displayWord`** renders bundled practice content only (not user/remote data) and **escapes `<`, `>`, `&`** per character (`:105-113`). Cleared.
- **TS — heatmap `style="background:${heatColor(stat.accuracy)}"`** — `heatColor` runs `stat.accuracy` through `Math` and returns a fixed `hsl(...)` string; not injectable. (The `title` attribute beside it *is* the vector — see TS-1.)
- **ViralCanvas — social-share `<a href={s.url}>`** (`MemeGenerator.tsx:813-815`) — hrefs are hardcoded `https://` bases (Reddit/WhatsApp/etc.) with encoded share text, not user-schemed. Cleared.

---

## 4. Dependency audit (`npm audit --omit=dev`, fresh clones)

Production-only results. **Reachability** column is the load-bearing judgment.

### MK-ViralCanvas — 5 prod advisories (2 critical / 1 high / 1 mod / 1 low) — **0 reachable**

| Package | Sev | Via | Reachable in prod? |
|---|---|---|---|
| `concurrently@9.2.1` (direct) | critical | `shell-quote` | **No** — used only in `npm run dev`. |
| `shell-quote` | critical/high | quote()/parse() DoS | **No** — transitive of concurrently (dev). |
| `path-to-regexp` | high | ReDoS | **No** — transitive of Express (dev wrapper only). |
| `qs` | moderate | stringify DoS | **No** — Express only. |
| `body-parser` | low | limit-bypass DoS | **No** — Express only. |

Root cause: `express`, `cors`, `concurrently` are miscategorised under `dependencies` in `package.json`. **Fix ([Medium] VC-DEP):** move all three to `devDependencies`. This removes every "critical/high" line from the production audit and correctly reflects that they never ship. (The full-tree audit — 14 findings — is entirely Vite/Vitest/Express dev-chain and is not shipped.)

### MK-MealScout — 4 prod advisories (2 high / 2 mod) — **0 reachable**

| Package | Sev | Reachable in prod? |
|---|---|---|
| `axios@1.x` (direct) | high (29 advisories: SSRF, proto-pollution, CRLF, ReDoS…) | **No** — `axios` is imported **nowhere** in `src` (verified). `mealdb.ts` uses native `fetch`. Dead dependency. |
| `form-data` | high | **No** — transitive of axios (unused). |
| `follow-redirects` | moderate | **No** — transitive of axios (unused). |
| `postcss` | moderate | Build-time only (Tailwind/Vite); the `</style>` stringify XSS affects generated CSS at build, not runtime user input. |

**Fix ([Medium] MS-DEP):** `npm uninstall axios` — removes 29 advisories (incl. 2 high) plus the `form-data`/`follow-redirects` transitives in one move. Bump `postcss` (`npm audit fix`) as build hygiene.

### MK-TypeSprint — **0 production advisories.** Clean. (Full-tree dev advisories are Vite/Vitest chain only — not shipped.)

---

## 5. Headers / CSP

Current `vercel.json` (identical across all three) sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(),microphone=(),geolocation=(),interest-cohort=()`, plus sane cache headers. **Solid baseline. The one material gap is the absence of a `Content-Security-Policy`.** Adding CSP is feasible for all three and is especially valuable for TypeSprint, where a `script-src` without `'unsafe-inline'` **blocks the `onerror=` payload from TS-1 as defense-in-depth**.

The only friction is the inline analytics bootstrap `<script>` in each `index.html`. Two clean options: **(A) externalize** the bootstrap to `/analytics.js` (served from `'self'`) — recommended, avoids hash churn; or **(B)** keep it inline and add its `'sha256-…'` to `script-src` (regenerate the hash whenever `VITE_GTM_ID`/`VITE_GA4_ID` are baked in, since that changes the script body). `<script type="application/ld+json">` blocks are data, not executable, and need no allowance. Inline `<style>` and element `style=""` attributes require `style-src 'unsafe-inline'` (style injection is low risk; script injection is the one to lock down).

Add as another entry in the `headers` array for `source: "/(.*)"`:

**MK-TypeSprint**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com;
  base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'
```
(Requires option A, or add the bootstrap hash to `script-src`.)

**MK-ViralCanvas** — `img-src` must be broad (`https:`) because meme search returns images from arbitrary hosts; `blob:` for html2canvas export; `data:` for pasted images. `connect-src 'self'` covers the same-origin `api/*`.
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data: blob: https:;
  connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com;
  base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'
```

**MK-MealScout** — browser calls TheMealDB directly, so allow it in `connect-src` and its image CDN in `img-src`.
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data: https://www.themealdb.com https://*.themealdb.com;
  connect-src 'self' https://www.themealdb.com https://www.google-analytics.com https://region1.google-analytics.com;
  base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'
```

Roll out first as `Content-Security-Policy-Report-Only` to confirm no legitimate resource is blocked, then promote. Self-hosting fonts (Section 6) would let you drop the `fonts.googleapis.com`/`fonts.gstatic.com` allowances.

---

## 6. Performance (measured — no Lighthouse score fabricated)

**Method:** production `vite build` on fresh clones; sizes below are Vite's own raw / gzip report. A live Lighthouse run was **not** executed (would require headless navigation to the external prod URLs in a non-interactive session); the assessment below is from measured bundle sizes + static render-blocking analysis. No numeric Lighthouse scores are claimed.

| Product | JS (raw / gzip) | CSS (raw / gzip) | HTML (raw / gzip) | Notes |
|---|---|---|---|---|
| **ViralCanvas** | ~815 KB / ~215 KB across 8 chunks | 41 KB / 7.9 KB | 5 KB / 1.7 KB | Largest: `export-canvas` (html2canvas) 205 KB / 49 KB gzip; `react-dom` 185 KB / 58 KB; `motion` (framer-motion) 119 KB / 39 KB. Good manual chunking. |
| **MealScout** | 143 KB / 48.7 KB (single) | 39 KB / 7.4 KB | 4.5 KB / 1.6 KB | Lean; no splitting needed at this size. |
| **TypeSprint** | 29 KB / 10.7 KB (single) | inlined | 62 KB / 13.6 KB | HTML is large because the ~900-line design system + 2 ld+json + analytics bootstrap are inlined. |

Findings:

- **[Medium] VC-PERF-1 — html2canvas loads eagerly.** `MemeGenerator.tsx:29` statically imports `html2canvas`, so the 205 KB / **49 KB gzip** `export-canvas` chunk is in the initial component's import graph and downloads on first paint, even though it is only used when the user exports (`:321`). **Fix:** dynamic-import inside the export handler — `const { default: html2canvas } = await import('html2canvas')` — deferring ~49 KB gzip off the critical path.
- **[Medium] PERF-FONTS (all three) — render-blocking third-party fonts + privacy.** All three load Google Fonts via `<link rel="stylesheet" href="fonts.googleapis.com/css2?...">`. `preconnect` and `display=swap` are correctly present (no FOIT), but the stylesheet is still render-blocking on a third-party origin, and Google Fonts sees every visitor's IP (a minor GDPR angle for a no-login product). **Fix:** self-host the two families (Inter + JetBrains Mono / Outfit / Playfair). Removes render-blocking third-party CSS, cuts two connections, and simplifies the CSP.
- **[Info] TypeSprint inline 900-line CSS is fine.** Inlining critical CSS avoids a round-trip and paints instantly; 13.6 KB gzip HTML is well within norms. No change needed.
- **[Info] ViralCanvas data-URL image quota (known).** `isSafeImageUrl` allows `data:image/` up to 10 MB per template (`projectStorage.ts:50`). localStorage is ~5–10 MB total per origin, so one large pasted image can exhaust it; `saveProject` already returns `false` on failure (`:202-209`). **Fix ([Medium] VC-STORAGE):** enforce a smaller per-image cap (e.g. 2 MB) on upload/paste and surface an explicit "storage full" toast instead of a silent save failure. `estimateStorageBytes` (UTF-16 × 2) is correct.

---

## 7. Privacy conformance (post-P1)

`docs/PRIVACY.md` is a **shared, product-neutral document, byte-identical across all three repos**, and it remains **accurate after P1**:

- "No account / no server-side profile" — holds (all three are no-login).
- "localStorage stays on device; Delete-my-data where implemented" — holds; TypeSprint added the Delete-all control (`data-controls.js:98-113`), MealScout has backup/restore, ViralCanvas has per-project delete. The "(where implemented)" hedge covers the variation.
- Third-party disclosures (TheMealDB, Imgflip, env-gated paid providers, Vercel, opt-in analytics) — all present and correct.
- "Content typed inside the editor/test/pantry is never sent" — **verified**: TypeSprint's new per-key heatmap, weak-key, dashboard, and backup features are **entirely local** (no network). MealScout pantry/grocery are local. **No new network calls were introduced in P1.**
- Analytics guard verified: the inline bootstrap loads GTM/GA4 **only** when the env var is both replaced (`charAt(0)!=='%'`) and matches `^GTM-…$` / `^G-…$` (`index.html:110,119`), with `anonymize_ip:true`. Unconfigured → zero network calls, matching the doc.

**Drift: none material.** The new `viralcanvas:v1:*`, `mealscout:v1:*`, `typesprint:v1:*` keys (incl. per-key stats, export-count) are all covered by the doc's generic "session data / history / preferences" language. **[Low] PRIV-1 (optional polish):** the shared doc doesn't mention that Export writes a JSON file to the user's device via a local `Blob`/`createObjectURL` download (`data-controls.js:60-73`) — this is local and user-initiated (not a privacy issue), but a one-line note would make the doc exhaustive.

## AI surface

Confirmed **no AI/LLM routes, SDKs, or keys** exist in any of the three (grep for `openai|anthropic|claude|gpt-|gemini|*_API` across `src`/`api` returned nothing). The "AI" scope item is **N/A / cleared** — nothing to threat-model (no prompt-injection surface, no model keys).

---

## Explicit "cleared" list (tested and found safe)

1. ViralCanvas serverless **SSRF** — no user-controlled URL fetched; all upstreams hardcoded.
2. ViralCanvas serverless **cache poisoning** — keys derived from clamped inputs; ephemeral in-memory Map.
3. ViralCanvas serverless **input validation** — `q`/`source`/`num`/`page`/`category` all clamped or whitelisted.
4. ViralCanvas serverless **timeout coverage** — AbortController + race guard on every upstream.
5. ViralCanvas **Express dev wrapper** — not imported by app/api, no `start` script, not deployable by accident; its CVE chain is unreachable in prod.
6. ViralCanvas **project import** — fresh-object construction, clamping, `isSafeImageUrl` blocks `javascript:`/`data:text/html`; no prototype pollution.
7. ViralCanvas **React XSS** — remote/imported strings auto-escaped; social-share hrefs hardcoded `https:`.
8. MealScout **axios CVEs** — package unused (native fetch); not reachable.
9. MealScout **import validation** (backup/pantry/grocery) — marker-gated, per-entry sanitizers, fresh objects; no prototype pollution.
10. MealScout **SSRF / injection** — `encodeURIComponent` on every MealDB param; hardcoded API base.
11. MealScout **Vue XSS** — no `v-html`; templates auto-escape TheMealDB strings.
12. TypeSprint **prototype pollution via import** — values written to distinct localStorage keys, not merged.
13. TypeSprint **`displayWord`** — escapes `<`/`>`/`&`; renders bundled content only.
14. TypeSprint **production dependencies** — zero advisories.
15. All three **analytics** — no network calls unless a real GTM/GA4 id is configured; `anonymize_ip` set.
16. All three **AI surface** — none exists.

---

## Top-10 prioritized portfolio fix list

| # | Prio | Product | Fix | Evidence |
|---|---|---|---|---|
| 1 | **High** | TypeSprint | Kill stored XSS: HTML-escape (or `textContent`) all interpolated fields in the 3 sinks **and** deep-validate `history`/`stats`/`perKey` in `validateImportPayload`. | `history.js:140`, `heatmap.js:106`, `dashboard.js:78`; `data-controls.js:24-51` |
| 2 | Med | MealScout | `npm uninstall axios` — clears 29 advisories (2 high) + `form-data`/`follow-redirects`. Package is unused. | audit §4; no `axios` import in `src` |
| 3 | Med | ViralCanvas | Move `express`, `cors`, `concurrently` → `devDependencies`; clears 2 critical + 1 high + 2 from the prod audit (all dev-only). | `package.json`; `server/index.js` isolation |
| 4 | Med | ViralCanvas | Add per-IP rate limiting to `api/*` **before** enabling any paid provider key (8× fan-out cost amplification). | `_lib/memes.mjs:300-322` |
| 5 | Med | All three | Add the per-product CSP from Section 5 (Report-Only → enforce). For TypeSprint this also blocks the TS-1 `onerror` payload. | `vercel.json` |
| 6 | Med | ViralCanvas | Lazy-load html2canvas via dynamic `import()` in the export handler (defers ~49 KB gzip). | `MemeGenerator.tsx:29,321` |
| 7 | Med | All three | Self-host Google Fonts — removes render-blocking third-party CSS + IP leak; simplifies CSP. | `index.html` font `<link>`s |
| 8 | Med | ViralCanvas | Cap per-image data-URL size (~2 MB) on upload/paste; show explicit "storage full" toast. | `projectStorage.ts:50,202-209` |
| 9 | Low | ViralCanvas | Return generic `error` strings from `api/*` 500s; log detail server-side. | `search.mjs:65` et al. |
| 10 | Low | TypeSprint | Prune the dozens of duplicated `docs/*_1_1_…` files (repo hygiene / portfolio polish); optionally bump `postcss` in MealScout via `npm audit fix`. | `docs/` listing |

---

*All findings verified against source at the stated file:line. Fresh-clone builds and `npm audit --omit=dev` were executed in scratchpad; the three working repos were not modified and no `npm` command was run inside them. No secret values are reproduced anywhere in this report.*
