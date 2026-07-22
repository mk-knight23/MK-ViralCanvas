# SEO / AEO / Content / Analytics Audit — MK Portfolio (3 Products)

**Agent 5 — SEO, AEO, Content & Analytics Engineer**
**Date:** 2026-07-22 (audit performed ~16:30–17:00 UTC)
**Scope:** MK ViralCanvas, MK MealScout, MK TypeSprint — source (read-only) + live production on `*.vercel.app`
**Constraint honored:** No custom domains proposed; all recommendations keep the existing `*.vercel.app` URLs.

---

## Executive Verdict

The P0/P1 SEO baseline is genuinely solid: valid robots.txt, valid single-URL sitemaps with fresh lastmod, correct canonicals, parseable JSON-LD with all required WebApplication properties, and a correctly engineered env-gated analytics layer that verifiably loads **zero** third-party requests in production today.

The **feared #1 finding did not materialize**: at audit time, ViralCanvas serves HTTP 200 to curl on `/`, `/robots.txt`, and `/sitemap.xml` (the challenge observed in P0/P1 is not currently active), and Vercel's official documentation confirms Attack Challenge Mode **exempts verified search crawlers** (Googlebot, Bingbot) by design since April 2025. Details and citations in Section 5.

The real top problems are: (1) **no OG image on any product** — every social/chat share renders a blank card while all three declare `summary_large_image`; (2) **all three GitHub repos point their "homepage" field at wrong/dead URLs** (two 404/NXDOMAIN, one to a live *stale duplicate* of TypeSprint); (3) **ViralCanvas and MealScout are 100% client-rendered with zero crawlable body content** — Google can render them, but most AI/answer-engine crawlers (which do not execute JS) see an empty `<div>`; (4) the documented Vercel Web Analytics activation steps are **incorrect for plain Vite apps** — the dashboard toggle alone will silently collect nothing.

---

## 1. Product Audit — MK TypeSprint

**Live:** https://11-web-keyboard-practice.vercel.app · **Repo:** `mk-knight23/MK-TypeSprint`
**Overall grade: A-** — the SEO/AEO model the other two products should copy.

### 1.1 What is verified good

| Check | Result | Evidence |
|---|---|---|
| Title | "MK TypeSprint — Typing Speed Test & Practice Platform" (53 chars) | `index.html:6`; live HTML matches |
| Meta description | 122 chars, benefit-led | `index.html:7` |
| Canonical | `https://11-web-keyboard-practice.vercel.app/` — correct, matches live URL | `index.html:11` |
| robots.txt | Valid; `Allow: /` + sitemap reference; live 200 | `public/robots.txt`; curl 200 |
| Sitemap | Single URL, `lastmod 2026-07-22` (fresh); live 200 | `public/sitemap.xml` |
| JSON-LD WebApplication | Parses; has name, url, description, applicationCategory (EducationalApplication), operatingSystem, offers, author/creator Person with sameAs | `index.html:38-65`; validated with Node JSON.parse |
| JSON-LD FAQPage | Parses; 3 questions | `index.html:66-97` |
| **FAQPage visibility rule** | **PASS — not a violation.** All 3 schema questions AND answers are visibly rendered in the "Frequently Asked Questions" section of the default-active main page. Verified in the live rendered DOM via browser (`get_page_text` shows all Q&As). | `index.html:1330-1352` + live browser check |
| SPA crawlability | **Excellent** — hero, stats, benchmarks, FAQ, guide, and about content are static HTML in `index.html` (62 KB served). A no-JS crawler sees the full content. | curl of live `/` returns 62,302 bytes incl. all text |
| Analytics gating | Placeholder `%VITE_GTM_ID%` confirmed unreplaced in production; regex guard prevents load; zero analytics network requests in browser session | curl grep + browser network log |

### 1.2 Findings

**TS-1 (High) — No og:image / twitter:image.**
`twitter:card` is `summary_large_image` (`index.html:21`) but no image tag or file exists (no PNG/JPG in `public/`). Shares to X, LinkedIn, Facebook, Slack, Discord, iMessage render a blank/text-only card. This suppresses CTR on the exact channels an open-source tool gets shared in.
**Fix:** create `public/og-typesprint.png` (1200×630, <300 KB — screenshot of the test UI with WPM stats works well), then add to `index.html` head:
`<meta property="og:image" content="https://11-web-keyboard-practice.vercel.app/og-typesprint.png" />`, `<meta property="og:image:width" content="1200" />`, `<meta property="og:image:height" content="630" />`, `<meta name="twitter:image" content="...same URL..." />`.

**TS-2 (Medium) — Live stale duplicate on GitHub Pages, and it is the repo's declared homepage.**
`https://mk-knight23.github.io/MK-TypeSprint/` returns HTTP 200 with an **old version** titled "Keyboard Practice Pro" (40 KB, no canonical to the vercel.app URL). The GitHub repo's `homepage` field points there. This splits discovery traffic, confuses brand naming, and is an indexable duplicate competing with production.
**Fix:** disable GitHub Pages for the repo (Settings → Pages), or replace it with a redirect page; set repo homepage to `https://11-web-keyboard-practice.vercel.app` (`gh api -X PATCH repos/mk-knight23/MK-TypeSprint -f homepage=...`).

**TS-3 (Medium) — `track()` events invisible to GA4-only setups.**
`src/analytics.js:5-14` only does `window.dataLayer.push({event, ...})`. That works when **GTM** is configured (GTM listens to dataLayer), but if only `VITE_GA4_ID` is set (gtag-only), gtag.js does **not** treat arbitrary `dataLayer.push({event:...})` objects as GA4 events — the 6 wired events (`test_started`, `test_completed`, `personal_best_achieved`, `mode_changed`, `theme_changed`, `weak_key_toggle`) would never appear in GA4. ViralCanvas's util (`src/utils/analytics.ts`) already handles this correctly by also calling `gtag("event", ...)`.
**Fix (file-level):** in `src/analytics.js`, after the dataLayer push add: `if (typeof window.gtag === 'function') window.gtag('event', event, params);`

**TS-4 (Low) — FAQPage schema covers 3 of 5 visible FAQs.**
The page visibly renders 5 Q&As (`index.html:1330-1352`); the schema (`index.html:66-97`) includes only 3. Since all are visible, extending the schema to include "What is the difference between WPM and Raw WPM?" and "Why practice coding typing?" is free rich-result surface.

**TS-5 (Low) — Hygiene.**
(a) Search-engine verification metas are commented placeholders (`index.html:26-27`) — Search Console/Bing Webmaster not yet set up; sitemap has never been submitted. (b) `theme-color` meta is `#3b82f6` (`index.html:133`) but manifest `theme_color` is `#0d9488` — pick one. (c) Guide/About content is inside `display:none` page-sections toggled by JS; it IS in the HTML source so it is crawlable, but hidden-by-default content can be weighted lower. Optional improvement: serve `/guide` and `/about` as real paths (the `vercel.json` SPA rewrite already routes any path to `index.html`; a tiny path-based `showSection()` call on load would make them linkable and sitemap-able). (d) `meta keywords` is obsolete; harmless, can drop.

### 1.3 AEO readiness — TypeSprint

| Question query | Answer visible on page today? |
|---|---|
| "what is a good typing speed" | **Yes** — FAQ + benchmark grid |
| "what is WPM in typing" | **Yes** — FAQ |
| "average typing speed / by profession" | **Yes** — benchmarks + guide section |
| "how to improve typing speed / type faster" | **Yes** — FAQ + full 6-step guide |
| "typing practice for programmers" | **Partial** — guide §5 covers it; could be a titled visible heading |

**Content plan (already ~90% done):** (1) extend FAQPage schema to all 5 FAQs; (2) make Guide/About real URL paths and add them to the sitemap; (3) add one visible section targeting "typing test for programmers" (the code-mode feature is genuinely differentiating — honest to promote). No new pages needed.

---

## 2. Product Audit — MK MealScout

**Live:** https://17-web-culinary-discovery.vercel.app · **Repo:** `mk-knight23/MK-MealScout`
**Overall grade: C+** — metadata is clean, but a crawler without JS sees an empty page.

### 2.1 What is verified good

- Title 53 chars, description 116 chars, canonical correct (`index.html:8-13`).
- robots.txt / sitemap.xml valid and live (curl 200); lastmod fresh (2026-07-22).
- JSON-LD WebApplication parses with all required props (`index.html:30-57`), LifestyleApplication category, author Person + sameAs.
- Manifest present and coherent; security headers via `vercel.json`.
- Analytics gate verified: placeholders unreplaced in production, regex guard, zero analytics requests in live browser session (only `/`, one JS bundle, one CSS file loaded).

### 2.2 Findings

**MS-1 (High) — Zero crawlable content; entirely client-rendered.**
Raw served HTML body is `<div id="app"></div>` (4,474 bytes total). All visible content ("Discover Your Next Masterpiece", recipe grid from TheMealDB) exists only after JS execution + a runtime API call to TheMealDB. Googlebot renders JS (delayed indexing tier), but Bing renders less consistently and **most AI/answer-engine crawlers (GPTBot, ClaudeBot, PerplexityBot) do not execute JavaScript** — they index effectively nothing beyond the meta description. For a product whose queries are AEO-shaped ("what can I cook with X"), this is the biggest gap.
**Fix (no SSR needed):** add static, honest HTML sections inside `index.html` before/around `<div id="app">` (or a pre-rendered footer block): a "How it works" explainer, a visible FAQ, and TheMealDB attribution. Roughly 300 lines of plain HTML — TypeSprint's `index.html` is the in-house template for exactly this.

**MS-2 (High) — No og:image / twitter:image.** Same as TS-1. `summary_large_image` declared (`index.html:23`) with no image → blank share cards. Fix: `public/og-mealscout.png` (1200×630) + 4 meta tags in `index.html`.

**MS-3 (Medium) — GitHub repo homepage is a dead URL.**
`homepage` = `http://17-web-culinary-discovery.openclaw.dev/` — **DNS does not resolve** (curl: could not resolve host), and it's `http://`. Anyone clicking the website link on the GitHub repo page gets an error. Description ("Recipe and culinary discovery app.") and topics (`food, recipes, vite, web-app`) are thin.
**Fix:** set homepage to `https://17-web-culinary-discovery.vercel.app`; description: "Find recipes by ingredients you have — free, no signup, powered by TheMealDB. Vue 3 + Vite."; topics: add `recipe-finder`, `meal-planner`, `ingredient-search`, `themealdb`, `vue3`, `no-login`, `open-source`.

**MS-4 (Low) — Default Vite favicon.**
`index.html:5` links `/vite.svg` (the stock Vite logo). Browser tabs and bookmarks show the Vite brand, not MealScout's. The manifest already has a 🍳 emoji SVG icon — reuse that approach for the favicon.

**MS-5 (Low) — Zero analytics event instrumentation.**
No `track`/`dataLayer` call sites exist in `src/`. If GA4 is enabled tomorrow, only default page_views arrive. See taxonomy in Section 6.3.

### 2.3 AEO readiness — MealScout

| Question query | Answer visible today? |
|---|---|
| "what can I cook with chicken and rice" | **No** (feature answers it interactively; nothing crawlable) |
| "how to find recipes by ingredients I have" | **No** |
| "how to scale a recipe / convert recipe units" | **No** (scaling engine exists in `src/utils/scaling.ts` with 23 tests — completely invisible to crawlers) |
| "what to cook from my pantry" | **No** |
| "free recipe finder without signup" | **No** (only meta description hints) |

**Content plan (max 5 sections, honest, in `index.html` as static HTML):**
1. "How ingredient search works" — 2 paragraphs: you type ingredients, MealScout queries TheMealDB, matches are ranked by pantry coverage.
2. Visible FAQ (4-5 Qs): Where do recipes come from? (TheMealDB — attribution required anyway) / Is it free, do I need an account? / How does recipe scaling work? / Is my pantry data stored anywhere? (localStorage only — reuse PRIVACY.md language). Add FAQPage JSON-LD **only** for these visible Q&As.
3. "Example: cooking with chicken and rice" — one honest worked example describing what the tool returns (no fake recipe counts).
4. Recipe scaling & unit conversion explainer — surfaces the genuinely differentiated `scaling.ts` feature.
5. About/privacy footer block mirroring TypeSprint's (author, GitHub link, privacy promise).

---

## 3. Product Audit — MK ViralCanvas

**Live:** https://19-web-viral-creator.vercel.app · **Repo:** `mk-knight23/MK-ViralCanvas`
**Overall grade: C+** — same pattern as MealScout: clean head, empty body; plus the bot-challenge question (resolved in Section 5).

### 3.1 What is verified good

- Title 53 chars, description 125 chars, canonical correct (`index.html:8-13`).
- robots.txt / sitemap valid and **live-verified 200 via curl at audit time** (see Section 5); lastmod fresh.
- JSON-LD WebApplication parses with all required props (`index.html:30-58`), MultimediaApplication, `browserRequirements` bonus prop, author Person + sameAs.
- Branded `favicon.svg` exists; manifest coherent.
- Analytics gate verified in production (placeholders intact, zero analytics requests; live network log shows only same-origin assets + `/api/memes/templates` + `/api/sources`).

### 3.2 Findings

**VC-1 (High) — Zero crawlable content; entirely client-rendered.**
Raw HTML body is `<div id="root"></div>` (5,033 bytes). The full editor (template browser, artboard picker with every social size preset, export controls) renders client-side only. Same crawler/AI-visibility consequence as MS-1 — and more painful here, because the app literally contains the data that answers high-volume queries ("YouTube thumbnail size 1280×720", "Instagram story size 1080×1920") as JS-only UI strings (verified in rendered DOM: artboard list includes Instagram Square/Portrait/Story, YouTube Thumbnail, X Post, LinkedIn, Facebook, Pinterest with exact pixel dimensions).
**Fix:** add a static "Social media image size cheat sheet" section to `index.html` — a plain HTML table of the exact 8 presets the app already ships. It is honest (the data is the product's own artboard list), high-AEO-value, and ~40 lines of HTML.

**VC-2 (High) — No og:image / twitter:image.** Identical to TS-1/MS-2 — and most ironic here: the product *makes* social images but shares as a blank card. `index.html:23` declares `summary_large_image`, no image exists. Fix: `public/og-viralcanvas.png` (1200×630 — export one from the product itself) + 4 meta tags.

**VC-3 (Medium) — GitHub repo homepage 404s.**
`homepage` = `https://mk-knight23.github.io/meme-generator/` → **HTTP 404**. Description ("Viral content creator studio.") and topics (`content, social, vite, web-app`) are thin and miss every high-intent keyword.
**Fix:** homepage → `https://19-web-viral-creator.vercel.app`; description: "Free browser meme generator & social graphics editor — templates, text layers, exact-size export for every platform. No signup."; topics: add `meme-generator`, `image-editor`, `social-media-graphics`, `canvas`, `react`, `no-login`, `open-source`.

**VC-4 (Low) — robots.txt allows `/api/`.**
`/api/memes/templates` and `/api/sources` return crawlable JSON. Not harmful, but wasted crawl budget and JSON can land in the index. Fix: add `Disallow: /api/` to `public/robots.txt` (keep `Allow: /`).

**VC-5 (Low) — Metadata drift.**
JSON-LD `description` ("Free online meme generator…") differs from the meta description ("Create memes, social media graphics…") — harmless but sloppy; align them. The analytics util `src/utils/analytics.ts` is well-built (sanitizing blocklist) but **never imported anywhere** — zero events are wired (verified: no imports outside the file itself).

### 3.3 AEO readiness — ViralCanvas

| Question query | Answer visible today? |
|---|---|
| "YouTube thumbnail size" | **No** (data exists in-app, JS-only) |
| "Instagram story / post dimensions" | **No** (same) |
| "how to make a meme online free without watermark/signup" | **No** |
| "best font for memes" | **No** (Impact/Comic Sans etc. are in the font picker, JS-only) |
| "X/Twitter post image size" | **No** (in-app) |

**Content plan (max 5 sections, honest):**
1. Static social image size cheat-sheet table (the 8 artboard presets with exact px) — the single highest-value addition.
2. Visible FAQ: Is it free? Do my images get uploaded? (README says local-only unless opted-in sharing — strong, honest privacy answer) / What export formats? (PNG/JPEG/WebP, 1x/2x) / Where do templates come from? (Imgflip API).
3. "How to make a meme in 3 steps" — matches the actual flow (pick template → add text → export).
4. Meme font mini-guide (the 6 fonts actually shipped).
5. About/privacy footer block with author attribution.

---

## 4. Cross-Product: Sitemap, Canonical, robots Summary

| Item | ViralCanvas | MealScout | TypeSprint |
|---|---|---|---|
| Canonical matches live URL | Yes | Yes | Yes |
| robots.txt live (curl) | 200, valid | 200, valid | 200, valid |
| sitemap.xml live (curl) | 200 | 200 | 200 |
| Sitemap vs actual routes | **Accurate** — no client router exists (verified: no react-router/vue-router in src); single URL is the truth | Same | Accurate today; if `/guide` `/about` become real paths (TS-5c), add them |
| lastmod | 2026-07-22 (fresh) | 2026-07-22 | 2026-07-22 |
| Sitemap submitted to GSC/Bing | No (no verification meta active anywhere) | No | No (placeholders commented, `index.html:26-27`) |

**Note on lastmod:** it is hardcoded in committed XML. It is fresh today but will silently go stale. Either update it in the release checklist or generate it at build time; a stale lastmod is worse than none.

---

## 5. Critical Investigation — Vercel Bot Challenge (BotID / Attack Challenge Mode) vs. Search Crawlers

### 5.1 Live evidence at audit time (2026-07-22 ~16:36 UTC)

- `curl https://19-web-viral-creator.vercel.app/` → **HTTP 200**, full correct HTML (title, meta, JSON-LD all present), headers `server: Vercel`, `x-vercel-cache: HIT`, `age: 12839`.
- `/robots.txt` → 200. `/sitemap.xml` → 200.
- Browser session: page loads and renders the full editor with no challenge interstitial.

**Conclusion 1:** the 403 challenge reported by P0/P1 for curl is **not active right now**. Either Attack/Challenge mode was disabled after P1, or the protection is intermittent (e.g., enabled only during an attack window). Non-browser agents can currently fetch everything.

### 5.2 What Vercel's documentation says (for when/if the challenge is re-enabled)

- **Attack Mode exempts verified crawlers.** Vercel docs ("Attack Mode", last updated 2026-05-08): visitors must complete a security challenge, "while known bots (like search engines and webhook providers) are automatically allowed through," and under "Search indexing": "Search engine crawlers like Googlebot are automatically allowed through Attack Mode without being challenged… enabling Attack Mode will not negatively impact your site's SEO or search engine indexing, even when used for extended periods."
- **This exemption dates to April 1, 2025** (Vercel changelog "Attack Challenge Mode now allows verified bots and Vercel cron jobs"): "well-behaved bots from major search engines, such as Googlebot… are also supported," and "Known bots are validated to be authentic and cannot be spoofed."
- **Verification is IP-range + reverse-DNS + cryptographic (Web Bot Auth)**, not User-Agent string (Vercel "Bot Management" docs, last updated 2026-07-09) — which is exactly why curl gets challenged while real Googlebot passes: the Bot Protection ruleset "prevents requests that falsely claim to be from a browser such as a curl request identifying as Chrome" and "automatically excludes verified bots, such as Google's crawler, from evaluation."
- **Vercel's verified-bot directory (bots.fyi) includes:** Googlebot, Bingbot, FacebookExternalHit, Twitterbot, LinkedInBot, Slackbot, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, AhrefsBot. **Notably absent: WhatsApp's link-preview fetcher.**

**Sources:**
- https://vercel.com/docs/vercel-firewall/attack-mode
- https://vercel.com/changelog/attack-challenge-mode-now-allows-verified-bots-and-vercel-cron-jobs
- https://vercel.com/docs/bot-management
- https://bots.fyi/

### 5.3 SEO consequence — final assessment

1. **Googlebot/Bingbot indexing: NOT at risk**, even with the challenge enabled — verified-bot exemption is IP/rDNS-based and documented as safe "for extended periods." This is therefore **not** the #1 SEO finding.
2. **Residual real risks if the challenge is re-enabled:** (a) **WhatsApp link previews** would likely break (not in the verified directory) — relevant for an India-based audience where WhatsApp sharing dominates; (b) unverified/smaller crawlers, SEO diagnostic tools, and any curl-based monitoring will see 403s and report false "site down/blocked" signals; (c) some listed bots appear in the directory as *unverified* entries — treat non-Google/Bing crawler access as unguaranteed under challenge mode.
3. **Recommendations:** keep Attack Mode **off** except during actual attacks (Vercel's own recommendation); if bot filtering is wanted permanently, use the **Bot Protection managed ruleset** (also excludes verified bots) rather than Attack Mode; after enabling anything, verify with **Google Search Console → Settings → Crawl stats** (response-code breakdown) and the **URL Inspection live test** — that is the ground truth for "does Googlebot get 200."

---

## 6. Analytics

### 6.1 Injection code review (source, all three `index.html`)

The GTM/GA4 gate is **correct and identical** across the three products (ViralCanvas `index.html:65-88`, MealScout `index.html:64-87`, TypeSprint `index.html:107-130`):

- Vite replaces `%VITE_GTM_ID%` at build only when the env var is defined; when unset, the literal placeholder remains and the guard `GTM_ID.charAt(0) !== '%'` short-circuits.
- Format regexes (`/^GTM-[A-Z0-9]+$/`, `/^G-[A-Z0-9]+$/`) block garbage values.
- GA4 config sets `anonymize_ip: true`.

### 6.2 Production verification (live, this audit)

- All three live pages still contain `var GTM_ID = "%VITE_GTM_ID%"` / `var GA4_ID = "%VITE_GA4_ID%"` → env vars are unset in the Vercel builds.
- Browser network logs for all three sites: only same-origin document/JS/CSS (+ ViralCanvas's own `/api/*`). **Zero requests** to googletagmanager.com, google-analytics.com, or `/_vercel/insights/*`. **Confirmed: no analytics of any kind load in production today.**

### 6.3 Finding — documented Vercel Web Analytics activation steps are wrong (Medium)

All three `index.html` comments and `docs/ANALYTICS.md` claim Vercel Web Analytics/Speed Insights are "injected server-side. No repo change needed" after the dashboard toggle. **For plain Vite (non-Next.js) apps this is incorrect.** Per Vercel's quickstart for HTML/other frameworks, enabling in the dashboard only provisions the `/_vercel/insights/*` routes; the page must include the snippet or the `@vercel/analytics` package, otherwise nothing is ever collected:

```html
<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
<script defer src="/_vercel/insights/script.js"></script>
```

Sources: https://vercel.com/docs/analytics/quickstart · https://github.com/vercel/analytics/issues/65 (404 on script.js when enabled/deployed out of order, Vite specifically)

**Fix:** correct `docs/ANALYTICS.md` in all three repos; when enabling, add the two-line snippet to each `index.html` (Speed Insights analogously via `/_vercel/speed-insights/script.js` or the package).

### 6.4 Exact activation runbook

1. **GA4 (or GTM) per product:** Vercel Dashboard → Project → Settings → Environment Variables → add `VITE_GA4_ID = G-XXXXXXX` (Production) → **redeploy** (build-time injection; a redeploy is mandatory). Choose GTM **or** GA4-direct per product, not both (a GTM container that also loads GA4 alongside the direct gtag would double-count).
2. **Verify:** view-source shows the real ID; Network tab shows `gtag/js?id=G-…`; GA4 Realtime shows the visit. TypeSprint additionally: `localStorage.setItem('analytics_debug','true')` logs events to console.
3. **Vercel Web Analytics:** Dashboard → Project → Analytics → Enable → **then** add the snippet from 6.3 → deploy → verify a `POST /_vercel/insights/view` request.
4. **Speed Insights:** Dashboard → Project → Speed Insights → Enable → add its script/package → deploy.
5. Fix TS-3 (TypeSprint gtag mirroring) before relying on GA4-only event data.

### 6.5 Event taxonomy proposal (names only — no payload PII, consistent with docs/ANALYTICS.md promises: no typed content, no search text, no uploads)

**Instrumentation status today:** TypeSprint 6 events wired; ViralCanvas util exists but 0 call sites; MealScout none.

| Product | Events (existing → keep; * = proposed new) |
|---|---|
| TypeSprint | `test_started`, `test_completed`, `personal_best_achieved`, `mode_changed`, `theme_changed`, `weak_key_toggle`, *`history_exported`, *`history_cleared`, *`duration_changed`, *`code_language_changed` |
| ViralCanvas | *`template_selected` (template id only), *`image_upload_used` (boolean occurrence, never file data — util's BLOCKED list already strips `uploaded`), *`text_layer_added`, *`artboard_changed` (preset name), *`export_completed` (format + scale), *`export_copied`, *`project_saved`, *`project_imported` |
| MealScout | *`search_performed` (search **type** only: name/category/ingredient — never the query string), *`recipe_viewed` (TheMealDB public id), *`favorite_added`, *`favorite_removed`, *`pantry_updated` (item **count** only), *`recipe_scaled` (factor), *`grocery_list_generated` |

Allowed param types: enumerated strings, counts, booleans. Never: free text, ingredient names typed by the user, meme text, filenames.

---

## 7. Discovery Extras

### 7.1 GitHub repo metadata (via `gh api repos/mk-knight23/<repo>`)

| Repo | Homepage (current) | Status | Description | Topics |
|---|---|---|---|---|
| MK-ViralCanvas | `https://mk-knight23.github.io/meme-generator/` | **404** | "Viral content creator studio." (thin) | 4 generic |
| MK-MealScout | `http://17-web-culinary-discovery.openclaw.dev/` | **DNS fail** + http | "Recipe and culinary discovery app." (thin) | 4 generic |
| MK-TypeSprint | `https://mk-knight23.github.io/MK-TypeSprint/` | 200 — **stale duplicate** ("Keyboard Practice Pro") | "Typing-speed practice trainer." (thin) | 4 generic |

Also: MK-TypeSprint's license is detected as `NOASSERTION` although `LICENSE` is standard MIT text — likely a non-standard header ordering; verify the file matches the canonical MIT template so GitHub badges it correctly. GitHub is the primary referrer surface for no-login open-source tools; all three homepage fields are currently harmful. Fixes are one-line `gh api -X PATCH` calls per repo (Section 2.2/3.2 have suggested copy).

### 7.2 llms.txt — assessment: worth adding (Low effort, honest expectations)

- **For:** these are exactly the products AI assistants recommend ("free typing test no signup", "free meme maker"); an `/llms.txt` (llmstxt.org convention) gives non-JS-executing AI crawlers a clean, factual summary — especially valuable for ViralCanvas/MealScout whose HTML is otherwise empty (VC-1/MS-1). Cost: one static markdown file in `public/` per repo.
- **Against (honest):** adoption by major providers is uneven and Google has said it does not use llms.txt for Search; treat it as a cheap supplement, never a substitute for fixing VC-1/MS-1.
- **Recommended content per file:** one-paragraph product summary, feature list, privacy stance (no accounts, localStorage-only), author + GitHub link, and the FAQ answers in plain markdown. Keep it in sync with the visible on-page FAQ so it never claims more than the page shows.

---

## 8. Top-10 Prioritized Portfolio Fix List

| # | Fix | Products | Severity | Effort |
|---|---|---|---|---|
| 1 | Create OG images (1200×630 PNG in `public/`) + add `og:image`/`twitter:image(+width/height)` meta tags | All 3 | High | ~1h total |
| 2 | Fix GitHub `homepage` fields to the production vercel.app URLs; rewrite descriptions; add 6-8 intent topics per repo | All 3 | High | 15 min |
| 3 | Add static crawlable content to ViralCanvas `index.html`: social-image-size cheat-sheet table + visible FAQ + 3-step how-to | ViralCanvas | High | 2-3h |
| 4 | Add static crawlable content to MealScout `index.html`: how-it-works + visible FAQ (with TheMealDB attribution) + scaling explainer | MealScout | High | 2-3h |
| 5 | Disable (or redirect) the stale TypeSprint GitHub Pages deployment competing with production | TypeSprint | Medium | 10 min |
| 6 | Set up Google Search Console + Bing Webmaster (uncomment/populate verification metas in TypeSprint `index.html:26-27`, add to other two), submit all three sitemaps; use URL Inspection to confirm Googlebot gets 200 | All 3 | Medium | 1h |
| 7 | Correct `docs/ANALYTICS.md` (Web Analytics needs the `/_vercel/insights/script.js` snippet on plain Vite — dashboard toggle alone collects nothing); add snippet when enabling | All 3 | Medium | 30 min |
| 8 | Fix TypeSprint `src/analytics.js` to mirror events to `gtag('event',…)` (GA4-only setups currently lose all 6 events); then wire ViralCanvas's existing-but-unused `src/utils/analytics.ts` and add MealScout events per the Section 6.5 taxonomy | All 3 | Medium | 2-4h (blocked on GA4 IDs for verification) |
| 9 | Extend TypeSprint FAQPage schema to all 5 visible FAQs; add FAQPage schema to the NEW visible FAQs from #3/#4 (only after they are visibly rendered) | All 3 | Low-Med | 30 min |
| 10 | Hygiene batch: `public/llms.txt` for all three; `Disallow: /api/` in ViralCanvas robots.txt; replace MealScout's stock `vite.svg` favicon; align TypeSprint theme-color with manifest; align ViralCanvas JSON-LD description with meta description; sitemap lastmod added to release checklist | All 3 | Low | 1-2h |

**Explicitly NOT recommended:** custom domains (owner decision honored); prerendering/SSR frameworks (static HTML sections achieve the goal with zero infra); thin programmatic article farms; fake review/usage-count schema.

---

## 9. Tools Actually Used (honest log)

- **Read/Grep/Bash (read-only)** on the three repos: `index.html`, `public/robots.txt|sitemap.xml|manifest.webmanifest`, `vercel.json`, `docs/ANALYTICS.md`, `src/analytics.js` (TypeSprint), `src/utils/analytics.ts` (ViralCanvas), src trees, git remotes, README files. No repo file was modified.
- **Node.js one-off script** (in session scratchpad) to parse and validate all JSON-LD blocks and measure title/description lengths.
- **curl** against all three production sites (`/`, `/robots.txt`, `/sitemap.xml`, headers, placeholder greps) and against the three GitHub-metadata homepage URLs.
- **Browser pane (Claude in Chrome)**: rendered-DOM extraction and network-request logs for all three products (SPA render check, FAQ visibility check, zero-analytics confirmation).
- **gh api** for repo metadata (`repos/mk-knight23/<repo>`).
- **Web search + fetch** of Vercel official docs/changelog and bots.fyi for the bot-challenge investigation (citations in Section 5.2 and 6.3).
- **Not used:** Lighthouse/PageSpeed (no run — page-speed claims are therefore not made in this report), Google Rich Results Test (JSON-LD validated by parse + schema.org required-property review only), Firecrawl, code-review-graph, Repomix.

*Report status: research only — no repository changes were made. Single deliverable file: `/Users/mkazi/3 Repos/SEO_AEO_ANALYTICS_REPORT.md`.*
