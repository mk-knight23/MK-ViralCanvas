# DESIGN BASELINE — MK-ViralCanvas

**Date:** 2026-07-23. Sources: `src/index.css`, `src/App.tsx`, all components, WCAG changelog entries (v2.4.0-unreleased), a11y audit in `docs/release-reports/DESIGN_ACCESSIBILITY_AUDIT.md`.

## Current design language

- **Aesthetic:** purple-forward glassmorphism. Radial glow blobs on `body::before/::after`, translucent elevated cards (`card-elevated`, `glass` utilities), rounded-xl/2xl geometry, uppercase display headings.
- **Fonts:** Outfit (display, 600–800) + Inter (body, 400–700) via Google Fonts.
- **Tokens** — defined as Tailwind 4 `@theme` CSS variables in `src/index.css` (single source of truth, light + `.dark` override):
  - Brand: `--color-brand-primary` #a855f7 / dark #c084fc · `--color-brand-accent` #ec4899/#f472b6 · `--color-brand-glow` · `--color-brand-cta` #7e22ce/#9333ea (dedicated AA-compliant white-on-purple CTA token).
  - Surfaces: `surface`, `surface-secondary`, `surface-elevated` (rgba glass) · Text: `text-primary/secondary/muted` (muted retuned for AA: 4.64:1+ light, 5.40:1+ dark) · Borders: `border`, `border-hover`.
- **Theming state:** dark/light/system via settings store; default **dark**. Applied by toggling `dark`/`light` classes on `documentElement` (`stores/settings.ts:applyTheme`) plus a `dark` class on the App root div (redundant dual application — pick one in V3). System preference only read when theme = "system"; **no live `matchMedia` change listener** (OS theme flips are not tracked until reload/toggle).
- **Motion:** framer-motion fades/slides/springs on hero, cards, menus, dialog, toasts. `prefers-reduced-motion` is **not respected** (settings store has an unused `reducedMotion` flag; no `useReducedMotion()` usage).
- **Iconography:** lucide-react throughout. Favicon + PWA icon are an emoji (🎨) SVG data-URI — no branded mark, no maskable PNG.

## Component inventory (working set)

| Component | Role | Notes |
|---|---|---|
| `App.tsx` | Shell: nav, hero, feature cards, footer | Contains false "AI-Powered" card; `role="application"` on root |
| `MemeGenerator.tsx` | Entire editor workspace (1,063 lines) | Tabs (Editor/Browse), layer style panel, share menu, favorites, export — needs decomposition |
| `editor/CanvasStage.tsx` | Artboard preview, drag-to-move layers | DOM-rendered text, selection outline, scale-to-fit |
| `editor/LayersPanel.tsx` | Layer list: select/hide/lock/reorder/duplicate/delete | |
| `editor/ArtboardPicker.tsx` | 8 presets + custom WxH | |
| `editor/ExportControls.tsx` | Format/quality/multiplier + Download/Copy | |
| `editor/ProjectsMenu.tsx` | Save/New/Open/Import/Export + list w/ rename/duplicate/delete | |
| `editor/DashboardStrip.tsx` | Recents, export count, storage used (real local data) | |
| `SettingsPanel.tsx` | Modal: audio, theme, stats, shortcuts | Proper dialog semantics + focus trap |
| `Toast.tsx` | Toast stack | `aria-live="polite"` even for errors |
| `ErrorBoundary.tsx` | Crash screen | Uses raw slate-* colors, not tokens |
| `common/Button|Card|Input.jsx` | **Dead** | Off-system Tailwind boilerplate, never imported |

## Strengths (verified)

- Real token system in one file; both themes covered; recent AA contrast remediation is documented with measured ratios (CHANGELOG 2.4.0).
- Dialog focus management (focus in, Tab trap, Escape, focus restore) implemented and tested.
- All editor form controls labeled (`aria-label` on sliders/selects/color inputs); honest keyboard-shortcut listing; favorites overlay is focus-visible (`group-focus-within`).
- Responsive: 12-col grid collapses to single column, nav stats hidden `sm:`, canvas scales via `aspect-ratio` + `68vh` clamp.

## Design debt

1. **No shared primitives.** Button/toggle/select recipes are re-typed as long class strings dozens of times; the toggle switch is hand-rolled twice (SettingsPanel sound, MemeGenerator shadow). V3 needs a small primitive set (Button, Toggle, Select, Slider, Card, Dialog) on the existing tokens.
2. **`role="application"` on the root** (`App.tsx:16`) suppresses screen-reader browse mode across the whole app — remove.
3. **Canvas layers unreachable by keyboard** — `role="button"` + `tabIndex` with no key handler (no arrow-nudge). X/Y sliders are the only non-pointer path.
4. **Share menu**: no `aria-expanded`, no Escape/outside-click close.
5. **Reduced motion not honored** despite dead store flag.
6. **Brand assets missing:** emoji favicon/manifest icon, no OG image, no logo mark beyond styled text `MK_ViralCanvas`.
7. **ErrorBoundary off-system** (hardcoded slate palette, doesn't fully react to theme).
8. **Landing copy vs product truth:** "AI-Powered" card (false), "Professional Meme Maker" badge vs single-artboard text-only editor — V3 messaging should track shipped capability.

## V3 design starting point

Keep: token architecture, purple brand, dark-default, lucide icons, dialog/focus patterns. Add: primitive component layer, editor-grade layout (dockable panels for layers/properties as layer types grow), real brand mark + OG/social kit, reduced-motion support, keyboard layer manipulation.
