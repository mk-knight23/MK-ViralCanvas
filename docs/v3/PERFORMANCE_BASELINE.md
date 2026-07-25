# PERFORMANCE BASELINE — MK-ViralCanvas

**Date:** 2026-07-23 · From `npm run build` (vite 6.4.1, 2008 modules, 2.80s) on this machine.

## Bundle output (exact, from build log)

| Asset | Raw | Gzip | Contents |
|---|---|---|---|
| `assets/export-canvas-*.js` | 205.00 kB | 49.14 kB | html2canvas + file-saver (manual chunk) |
| `assets/react-dom-*.js` | 184.92 kB | 57.83 kB | react-dom |
| `assets/motion-*.js` | 119.09 kB | 39.27 kB | framer-motion |
| `assets/index-*.js` | 66.27 kB | 18.40 kB | app code |
| `assets/index-*.css` | 43.79 kB | 8.31 kB | Tailwind 4 output |
| `assets/icons-*.js` | 25.46 kB | 5.78 kB | lucide-react (tree-shaken) |
| `assets/react-*.js` | 8.83 kB | 3.34 kB | react |
| `assets/store-*.js` | 2.69 kB | 1.33 kB | zustand |
| `index.html` | 5.03 kB | 1.73 kB | |
| **Total JS** | **~612 kB** | **~175 kB** | |

Production HTML response: 5,033 bytes. `/assets/*` served with `Cache-Control: public, max-age=31536000, immutable` (vercel.json).

## Findings (ranked by payoff)

1. **html2canvas (205 kB raw / 49 kB gzip) loads on first paint despite being export-only.** It is chunked separately but statically imported by `MemeGenerator.tsx:29`, so it's in the critical import graph. `import('html2canvas')` at export time cuts initial JS ~28% for zero UX cost. Same for `file-saver`.
2. **Whole-app re-render every second.** `MemeGenerator.tsx:175-178` — `setInterval(stats.addTimeSpent(1), 1000)` with `[stats]` dependency recreates the interval each tick, and both `App.tsx:11` and `MemeGenerator.tsx:135` subscribe to the entire stats store, so nav + editor tree re-render 1x/sec while idle. Fix: zustand selectors + move the ticker into the store.
3. **framer-motion costs 119 kB raw for modest use** (fade/slide on cards, menus, toasts). V3 options: `LazyMotion`/`domAnimation` subset (~30 kB), or CSS transitions for the simple cases.
4. **Google Fonts render-blocking stylesheet** (2 families, 7 weights). Self-host with `font-display: swap` retained; also removes a third-party connection.
5. **History snapshots are full deep-ish copies of `Project`** per edit commit (max 50). Fine now (text layers are tiny); will matter if V3 adds image layers as data URLs — never store raster data in history entries.
6. **Browse grid renders up to 50 imgflip images + unbounded category results** with `loading="lazy"` (good) inside `aspect-square` cells (no CLS). No virtualization — acceptable at 50, revisit if page size grows.
7. **Dead CSS shipped:** `dist/css/premium-design.css` copied from `public/` every build, referenced by nothing.
8. **Serverless cache is per-instance in-memory** (`api/_lib/memes.mjs` Map) — cold starts miss; `s-maxage=600, stale-while-revalidate=1800` on responses mitigates via Vercel CDN. Adequate.

## Not measured (out of scope for this pass)

Lighthouse/CWV field metrics, real-device TTI, export latency at 2x on large artboards. Recommend a Lighthouse run against prod as the first V3 QA action; budgets to adopt: LCP < 2.5s, initial JS < 120 kB gzip (achievable via items 1 + 3).
