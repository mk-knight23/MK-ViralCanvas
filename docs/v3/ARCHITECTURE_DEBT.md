# ARCHITECTURE DEBT & V3 READINESS — MK-ViralCanvas

**Date:** 2026-07-23. Stack: React 19 + TS 5.9 + Vite 6 + Tailwind 4 + Zustand 5, Vercel serverless `api/*.mjs`, dev Express wrapper.

## What is already sound (keep)

- **Domain model** — `src/types/project.ts`: versioned `Project` schema (`schemaVersion: 1`), `TextLayer`, `Artboard` + presets, factory functions. Clean and extensible.
- **Pure layer operations** — `src/utils/layers.ts`: immutable add/remove/update/move/duplicate, unit-tested.
- **History** — `src/stores/projectStore.ts`: snapshot-array undo/redo, 50-entry cap, debounced commits (300ms). Works; snapshot granularity is fine at current project sizes.
- **Persistence** — `src/utils/projectStorage.ts`: namespaced keys (`viralcanvas:v1:*`), defensive `validateProject` sanitizer (clamps ranges, rejects unsafe URLs, de-dupes layer ids), JSON import/export round-trip, all tested.
- **API layer shape** — `api/_lib/memes.mjs` shared logic + thin `api/*.mjs` handlers, reused by `server/index.js` for dev. Timeouts, in-memory TTL cache, dedup. This is the right template for a future AI gateway.
- **Test harness** — Vitest + Testing Library, 50 passing tests covering the store, storage, layers, keyboard guard, dialog focus.

## Debt items (ranked)

### D1 — `MemeGenerator.tsx` is a 1,063-line god component (only file >400 lines)
Line counts: `MemeGenerator.tsx` 1063 · `ProjectsMenu.tsx` 315 · `projectStorage.ts` 307 · `SettingsPanel.tsx` 274 (rest <220).
It owns, inside one visual component:
- **Export pipeline** (html2canvas capture, scale math, blob/MIME fallback, `extensionForBlobType`) — business logic in the view.
- **Autosave engine** (debounce timer, quota-warning latch, `bumpDashboard` refresh signaling).
- **Search/browse data layer** (category fetching, 500ms debounce timer, source badges).
- **Share URL construction**, favorites logic, upload decoding, global keyboard binding via a `handlersRef` mutation pattern (`handlersRef.current = { undo, redo }` assigned mid-render, line 396).
Split targets: `utils/export.ts` (capture+blob), `hooks/useAutosave.ts`, `hooks/useUndoRedoShortcuts.ts`, `components/browse/TemplateBrowser.tsx`, `components/editor/LayerStylePanel.tsx`, `components/ShareMenu.tsx`.

### D2 — Render/export duality is the V3 ceiling
Preview is DOM (`CanvasStage.tsx` absolutely-positioned divs, `WebkitTextStroke`); export rasterizes the DOM with **html2canvas** (205KB chunk, approximates CSS, stroke/shadow fidelity varies per browser, statically imported so it loads on first paint). A professional V3 editor (image layers, filters, blend modes, precise export) needs **one render model shared by preview and export** — either a canvas engine (Konva/Fabric/custom 2D) or a `src/renderer/` abstraction that draws a `Project` to `CanvasRenderingContext2D`. The existing `Project`/`TextLayer` model maps almost 1:1 onto such a renderer, which is why this is a refactor, not a rewrite.

### D3 — Layer model is text-only
`Project.template` is a single background image; layers are `TextLayer` only. V3 needs `Layer = TextLayer | ImageLayer | ShapeLayer` (discriminated union), `schemaVersion: 2`, and a migration path inside `validateProject` (the sanitizer is already structured to absorb this).

### D4 — Autosave and history live in the wrong layer
Autosave is a component effect in `MemeGenerator`; history commit scheduling uses a module-level `commitTimer` in `projectStore.ts` (untestable global, single-store assumption). Move both into store middleware/subscriptions so any future editor surface gets them for free.

### D5 — Error handling swallows failures
`utils/api.ts` returns `[]` on any failure (masks outages, `console.error` in prod code — violates house rules); `getActiveSources().catch(() => {})`; clipboard write rejection unhandled inside `toBlob` callback; `ErrorBoundary` has no `componentDidCatch` logging. Introduce a `Result<T>`-style return or thrown typed errors + toast mapping at the caller.

### D6 — Per-second global re-render
`App.tsx:11` and `MemeGenerator.tsx:135` subscribe to the whole stats store (`useStatsStore()`); `MemeGenerator.tsx:175-178` runs `setInterval(() => stats.addTimeSpent(1), 1000)` with `[stats]` deps — the interval is torn down/recreated every second and the entire tree re-renders every second. Use selector subscriptions and a store-internal ticker.

### D7 — Duplication
- Two `ApiResponse` definitions (`src/types/index.ts` — dead — vs `src/utils/api.ts`).
- Toggle-switch UI hand-rolled twice (`SettingsPanel.tsx:143-159` sound, `MemeGenerator.tsx:701-719` shadow) — no shared primitive, while dead `common/Button.jsx` sits unused.
- `openProject` logic duplicated (`MemeGenerator.openProject` vs `ProjectsMenu.handleOpen`).
- Button class-string recipes repeated dozens of times; no variant component.

### D8 — Config/deploy debris
Three deployment targets tracked (Vercel real; Heroku `app.json` — invalid YAML-as-json — and `firebase.json` dead), agent/editor config noise (`.cursorrules`, `.gemini/`, `.evolution/`, `attached_assets/`). Confuses tooling and future agents.

## V3 capability verdict

| V3 requirement | Current support | Work needed |
|---|---|---|
| Multi-layer canvas | Text layers only, solid model | Extend union (D3), renderer (D2) |
| Undo/redo | Working, 50 snapshots | Move scheduling into middleware (D4); optional command-pattern later |
| Autosave | Working, debounced, quota-aware | Relocate to store layer (D4) |
| Export pipeline | html2canvas, format/quality/scale UI done | Replace rasterizer with shared renderer (D2); make export chunk lazy |
| AI gateway | Nothing wired (honest) | New `api/ai/*.mjs` following existing `_lib` pattern; keys server-side; provider routing |

**Verdict: INCREMENTAL restructure.** Types, stores, storage, tests, and the serverless API pattern carry forward unchanged. Exactly two modules need real surgery — `MemeGenerator.tsx` (decompose, D1) and `CanvasStage`/export (renderer abstraction, D2) — plus mechanical deletions from BROKEN_FEATURE_INVENTORY.md. No framework, state, or hosting change is justified.
