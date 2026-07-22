# Architecture — MK ViralCanvas

## High-level

React SPA + Vercel Serverless Functions. Nothing is stored server-side; each request that needs external data is stateless. Local persistence lives in `localStorage`.

```
Browser (React + Zustand)
    │
    ├── fetch /api/memes/templates    ──▶ Imgflip API (free, always on)
    ├── fetch /api/memes/search       ──▶ Multi-source paid providers (env-gated)
    ├── fetch /api/memes/trending
    ├── fetch /api/memes/category/*
    ├── fetch /api/categories         (static list)
    └── fetch /api/sources            (advertises which providers are active)
```

## Serverless functions

Every `/api/*` endpoint is a Vercel Function under `api/` written as an ES module (`.mjs`). Shared logic lives in `api/_lib/memes.mjs` and is imported by both the Vercel Functions and the Express dev wrapper (`server/index.js`) so behavior is identical in dev and prod.

Every upstream call has an `AbortController` timeout (12s default, 45s for the Apify long-running actor) and is wrapped in `Promise.allSettled` so a single slow or broken provider cannot block the response.

## In-memory cache

`api/_lib/memes.mjs` maintains a per-function-instance `Map` cache with a 10-minute TTL and a 300-entry LRU cap. Vercel Fluid Compute reuses function instances, so warm invocations hit the cache. Cold invocations rebuild it, which is safe because the underlying APIs are idempotent.

If you need a durable cross-instance cache, Vercel KV is the drop-in target — swap the `getCached`/`setCache` implementation without touching call sites.

## Frontend state

- `src/stores/memeStore.ts` — meme project state
- `src/stores/settings.ts` — user preferences
- `src/stores/stats.ts` — anonymous local counters
- `src/stores/toastStore.ts` — transient UI state

Zustand was chosen over Redux for its minimal boilerplate; all mutations remain immutable via spread.

## Bundle strategy

`vite.config.ts` explicitly splits vendor code into named chunks so users only pay for what they render:

- `react`, `react-dom` — separate for browser caching
- `motion` — `framer-motion`
- `export-canvas` — `html2canvas`, `file-saver` (lazy-loaded before export)
- `icons` — `lucide-react`
- `store` — `zustand`

Latest build produces no chunk larger than the 700kB warning threshold; before the split it was one 582kB chunk.

## Security surface

- All `/api/*` endpoints validate and clamp query params before forwarding to upstream providers.
- Search query is length-capped to 200 chars.
- `num` and `page` params are clamped to safe ranges.
- Only known category slugs from a fixed allowlist are proxied.
- Provider keys are read from `process.env` only, never echoed back to the client.

## What is intentionally not built

- Auth. No user identity is required; the product loses value if signup is required.
- Server-side database. `localStorage` is enough for a stateless creation tool.
- Real-time collaboration. Adds complexity that is not justified by the current use case.
