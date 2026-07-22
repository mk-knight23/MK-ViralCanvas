# Design & Accessibility Audit — MK ViralCanvas · MK MealScout · MK TypeSprint

**Auditor:** Agent 4 — Design & Accessibility Reviewer (read-only)
**Date:** 2026-07-22
**Scope:** WCAG 2.2 AA lens + design-direction conformance + theme audit, against the live production deployments and local source.

| Product | Live URL | Stack | Source root |
|---|---|---|---|
| MK ViralCanvas | https://19-web-viral-creator.vercel.app | React 19.2.3, Tailwind v4, framer-motion | `/Users/mkazi/3 Repos/MK-ViralCanvas` |
| MK MealScout | https://17-web-culinary-discovery.vercel.app | Vue 3.5.24, Pinia, Tailwind v4 | `/Users/mkazi/3 Repos/MK-MealScout` |
| MK TypeSprint | https://11-web-keyboard-practice.vercel.app | Vanilla JS ES modules, hand-written CSS | `/Users/mkazi/3 Repos/MK-TypeSprint` |

**Tooling honesty statement:** The `ui-ux-pro-max` skill **was genuinely available in this session and was loaded**; its priority checklist (accessibility → touch/interaction → style/theming → layout → forms) was used as the audit methodology. Its `search.py` design-system generator CLI was **not** executed — this task is measurement/review, not design generation. All contrast ratios below were **measured live** via `getComputedStyle` + the WCAG relative-luminance formula executed in the real browser (Vercel bot challenge passed in the Browser pane); keyboard behavior was verified with real key presses and DOM-dispatched events. No axe/Lighthouse automated scanner was run; findings are manual + scripted measurements. Severity counts are of *distinct findings*, not instances.

**Contrast math used everywhere below** (WCAG 2.x):
`L = 0.2126·R' + 0.7152·G' + 0.0722·B'` where `c' = (c/255 ≤ 0.03928) ? c/12.92 : ((c/255+0.055)/1.055)^2.4`, and `ratio = (Lmax+0.05)/(Lmin+0.05)`. Translucent (glass) backgrounds were alpha-composited over their ancestors before computing.
Worked example (MealScout primary): white `#ffffff` (L=1.0) on amber `#f59e0b` (R'=0.923, G'=0.345, B'=0.0033 → L=0.4444) → `(1.0+0.05)/(0.4444+0.05)` = **2.15:1** (needs 4.5:1). Verified identical to the live computed measurement.

Severity legend — **Critical**: blocks a class of users from using the product · **High**: WCAG 2.2 AA failure · **Medium**: real usability defect · **Low**: polish.

---

## 1. MK ViralCanvas

### Findings

| # | Severity | Location | Evidence | Proposed fix |
|---|---|---|---|---|
| VC-1 | **High** | `src/components/MemeGenerator.tsx:597-619, 672-698, 728-751` (Size, Rotation, Stroke, Opacity, X, Y sliders) | Live check: all **6** `input[type=range]` have `aria-label: null`, `labels: 0`. Labels are bare `<span>`s. WCAG 4.1.2 / 1.3.1. (The Quality slider in `ExportControls.tsx:83` *is* labeled — the pattern exists, it just wasn't applied here.) | Add `aria-label="Font size"` etc. to each slider, or convert the `<span>`s to `<label htmlFor>` with ids. |
| VC-2 | **High** | `src/components/MemeGenerator.tsx:562-573, 577-589` (Font, Weight selects) | Live check: both `<select>`s have no accessible name (`aria: null, labels: 0`). | Same fix as VC-1: `aria-label="Font family"` / `"Font weight"`. |
| VC-3 | **High** | `src/components/MemeGenerator.tsx:566, 581`; `src/components/editor/ArtboardPicker.tsx:45, 66, 78` | Focus invisible: these selects/number inputs carry Tailwind `outline-none` with **no** replacement `focus:` style. Live: focused select computes `outline: none`, `box-shadow: none`. WCAG 2.4.7. (Text inputs are fine — they have `focus:ring-2`.) | Replace `outline-none` with `focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary` (the ring already used on text inputs). |
| VC-4 | **Critical** | `src/components/SettingsPanel.tsx:56-73`; root cause `src/hooks/useKeyboardControls.ts` (never imported by any component — dead code) | Live: opened Settings, pressed Esc → `dialogStillOpen: true`; `focusInsideDialog: false` (focus stayed on the trigger button behind the `aria-modal="true"` overlay). No focus trap, no initial focus, no return focus. The panel itself *advertises* "Escape — Close Settings", "H — Toggle Help", "? — Show Shortcuts" (`src/utils/constants.ts:7-14`) — none of which work. | Mount an Esc handler + focus management in `SettingsPanel` (focus dialog on open, trap Tab, restore focus on close); delete or fix `useKeyboardControls.ts` (its `actionMap` keys `KeyD/KeyR/Slash/QuestionMark` are `e.code` names compared against `e.key`, so they can never match); make the shortcuts list match reality. |
| VC-5 | **High** | `src/components/MemeGenerator.tsx:187-210` | `Ctrl/Cmd+R`, `Ctrl/Cmd+D`, `Ctrl/Cmd+S` are `preventDefault()`ed globally — page reload, bookmark and save are hijacked (WCAG 2.1.4 character-key concerns don't apply, but seizing browser-reserved combos is hostile; Ctrl+R → "random template" destroys the reload muscle-memory). | Drop Ctrl+R at minimum; prefer single-key or Alt-based app shortcuts, and never `preventDefault` when the event target is an editable field. |
| VC-6 | **High** | `src/components/MemeGenerator.tsx:1023-1049` (favorites card overlay) | "Use"/"Delete" buttons live inside `opacity-0 group-hover:opacity-100` overlay. They remain in tab order, so a keyboard user focuses **invisible** buttons (no `group-focus-within` variant). WCAG 2.4.7. | Add `group-focus-within:opacity-100 focus-visible:opacity-100` to the overlay container. |
| VC-7 | **High** | `src/index.css:12` (`--color-text-muted: #9590ad` light), `:28` (`#6b6587` dark) | Measured live: light **2.73:1** (12px/600 on `rgb(246,240,250)`), dark **3.4:1**. Used for every control label ("Font", "Size: 80px"), tips, nav stats, stat captions. Needs 4.5:1. | Darken tokens: light ≈ `#6d6689` (≥4.5:1 on `#f0e6f6`), dark ≈ `#8f89ab`. One-line token change each. |
| VC-8 | **High** | `src/components/editor/ExportControls.tsx:92` (Download), `MemeGenerator.tsx:894` (active category chips) + all white-on-`brand-primary` fills | White on `#a855f7` = **3.96:1** (14px bold ⇒ needs 4.5:1). Dark mode is worse: white on `#c084fc` ≈ **2.6:1**. | Darken the button fill (e.g. `#7e22ce`, 6.0:1 with white) or use dark text on the light-purple dark-mode fill. |
| VC-9 | **Medium** | `src/App.tsx:79-81` hero gradient text; `:76` badge | Badge `#a855f7` at 12px/700 on `#f0e6f6` = **3.27:1** (fail). Gradient heading's pink stop `#ec4899` on `#f0e6f6` ≈ **2.9:1** — heading is 48px/800 (large text, needs 3:1) so it *marginally fails* at the pink stop in light mode. | Deepen badge/gradient stops in light mode (e.g. `#9333ea` / `#db2777`). |
| VC-10 | **Medium** | `src/App.tsx:16` | `role="application"` on the page root switches screen readers out of browse mode for the whole app — heading/landmark navigation is lost. Nothing here needs application mode. | Remove `role="application"` (keep the `aria-label` on `<main>`). |
| VC-11 | **Medium** | `src/components/editor/CanvasStage.tsx:126-160` | Canvas text layers are `role="button" tabIndex={0}` but have **no** `onKeyDown` — Enter/Space do nothing, and drag-to-move has no arrow-key equivalent. Mitigation exists (X/Y sliders) but they're unlabeled (VC-1). WCAG 2.1.1. | Add arrow-key nudging (±1%, Shift = ±5%) in `onKeyDown`, or drop `role="button"` and rely on labeled X/Y sliders. |
| VC-12 | **Medium** | `src/components/MemeGenerator.tsx:497-519` | Editor/Browse "tabs" are plain buttons; selected state is conveyed by color only, no `aria-selected`/`aria-pressed`/tablist semantics. | Add `role="tablist"`/`role="tab"` + `aria-selected`, or minimally `aria-pressed`. |
| VC-13 | **Medium** | `src/index.css:190-195` covers only 2 CSS animations; **no** `useReducedMotion`/`MotionConfig` anywhere (`grep` verified) | All framer-motion entrances (`App.tsx:71-97`, `MemeGenerator.tsx` AnimatePresence, `SettingsPanel.tsx` spring) ignore `prefers-reduced-motion`. | Wrap the app in `<MotionConfig reducedMotion="user">` — one-line fix. |
| VC-14 | **Medium** | `src/index.css` + component markup (`dark:` utilities, e.g. `MemeGenerator.tsx:769`, `SettingsPanel.tsx:194`) | No `@custom-variant dark` is defined, so Tailwind v4 `dark:*` utilities follow the **OS** scheme while the app toggles a `.dark` *class* (tokens). Most of VC themes via `.dark` tokens, so damage is limited to scattered `dark:` utilities desyncing (pink Save tint, red hovers) when OS ≠ chosen theme. | Add `@custom-variant dark (&:where(.dark, .dark *));` to `src/index.css` (must also apply the class to `<html>`, since `body::before/after` orbs sit outside the root div). |
| VC-15 | **Low** | `src/components/MemeGenerator.tsx:856-862` | Browse search input is placeholder-named only (placeholder does compute as a fallback name, but disappears on input). | Add `aria-label="Search memes"`. |
| VC-16 | **Low** | `MemeGenerator.tsx:872-878, 936` | 8–9px source badges; 10px labels widespread — below the 12px readability floor. | Raise micro-text to ≥11–12px. |
| VC-17 | **Low** | `MemeGenerator.tsx:477-484, 904-907` | Loading spinners not announced (`role="status"` missing). | Add `role="status"` + `aria-live="polite"`. |
| VC-18 | **Low** | `index.html` (all three products) | No skip-to-content link. | Add a visually-hidden skip link before the nav. |

**Positives worth keeping:** LayersPanel/ArtboardPicker/ExportControls icon buttons are consistently `aria-label`ed; export format/multiplier buttons use `aria-pressed`; shadow toggle uses `role="switch"`; toasts exist for every async outcome; `lang="en"`; sound-effects opt-out; no horizontal scroll at 375px (verified).

### Design-direction conformance — stated: “creator studio (charcoal + energetic accents, canvas-centered)”
- **Verdict: drifted.** The actual palette is lavender surface `#f0e6f6` / purple-black `#0f0a1a` with purple→pink gradients (`#a855f7`→`#ec4899`), gradient-orb `body::before/after` blobs, glass on nav *and* cards *and* dialogs — i.e., exactly the "generic AI dashboard" territory (purple gradients + pill overload + glass on everything) the direction was supposed to avoid. There is no charcoal anywhere in the tokens.
- Canvas-centered layout ✔ (8/12 columns to preview) — the strongest on-direction aspect.
- Glass restraint ✘: `card-elevated`/`glass` applied to essentially every panel; long-form settings text sits on translucent `--color-surface-elevated` rather than a solid surface.

### Theme audit (real state)
- **Exists today:** light / dark / system (3-way control in Settings via `stores/settings.ts`; nav button toggles binary). Two visual themes total.
- **Defect:** `dark:` utilities keyed to OS, tokens keyed to class (VC-14) → mixed styling possible.
- **Gap to the 8-preset ambition:** 6 presets missing; no preset infrastructure (single hard-coded token block per mode). Do **not** claim multi-theme support anywhere yet.

---

## 2. MK MealScout

### Findings

| # | Severity | Location | Evidence | Proposed fix |
|---|---|---|---|---|
| MS-1 | **Critical** | `src/style.css` (no `@custom-variant dark`), theme class applied at `src/App.vue:102` + `stores/settings.ts` | **Broken theme switching.** Tailwind v4's default `dark:` variant is the OS media query; the app toggles `.dark`/`.light` classes. With OS-dark + app-light (verified live, screenshot): hero heading renders `oklch(0.968…)` ≈ slate-100 at 72px on lavender `#ece4f0` — **≈1.1:1, illegible**; search bar and category chips stay dark-navy on the light page. The inverse (OS-light + app-dark) leaves slate-900 text on the dark background. The toggle only works when it agrees with the OS. | Add `@custom-variant dark (&:where(.dark, .dark *));` to `src/style.css`; apply the class on `<html>` (settings store) so `body` and teleported modals are covered. One commit. |
| MS-2 | **Critical** | `--color-culinary-primary: #f59e0b` (`src/style.css:4`) used with white text: `App.vue:132` (active nav), `:240` (Find), `PantryManager.vue:141-147` (Add), `RecipeDetailModal.vue:219-227` (grocery CTA), `CookMatches.vue:62-70` (Find recipes), `:136-139` (match badges) | Measured live: white on `#f59e0b` = **2.15:1** — fails 4.5:1 and even the 3:1 large-text bar. This is the product's *primary action color*: every CTA fails AA. | Either darken the fill for white text (`#b45309` amber-700 = 4.5:1) or switch to `text-slate-900` on the existing amber. Token-level change + audit of the six call sites. |
| MS-3 | **High** | `src/App.vue:170` | `aria-label="{{ store.favorites.length }} saved recipes"` — Vue does **not** interpolate moustaches inside attributes. Verified in production DOM: screen readers are told literally "`{{ store.favorites.length }} saved recipes`". | Change to `:aria-label="`${store.favorites.length} saved recipes`"`. One line. |
| MS-4 | **High** | `src/components/pantry/CookMatches.vue:123-127` | "What can I cook?" result cards are `<article @click>` with **no focusable element** — the pantry→recipe flow (a named primary flow) is mouse-only. Contrast with the Discover grid, which has a proper "View recipe details" button. WCAG 2.1.1. | Wrap the card (or its title) in a `<button>`/`<a>` that emits `open-recipe`; add `:aria-label` naming the recipe. |
| MS-5 | **High** | `src/components/pantry/PantryManager.vue:107-126` | Ingredient autocomplete: `@blur="suggestionsOpen = false"` closes the list the instant focus leaves the input, and there is no ArrowDown handling — verified live (`suggestionsAfterTabAway: false`). Keyboard users can never select a suggestion. Also no `aria-expanded`/`aria-controls` combobox wiring. | Implement combobox keyboard support: ArrowDown/Up + Enter selection, `aria-activedescendant`, close on Esc, and delay/`relatedTarget`-check the blur close. |
| MS-6 | **High** | `src/composables/useKeyboardControls.ts:38-43` | No editable-target guard: typing `?` or `/` **inside the recipe search input** opens the Settings modal and swallows the character — verified live (`defaultPrevented: true`, modal opened). | First line of `handleKeyDown`: `if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return`. |
| MS-7 | **High** | `src/components/ui/SettingsPanel.vue:44-62` | Settings modal has **no** `role="dialog"`, no `aria-modal`, no `aria-labelledby` (verified live: `role: null`), close button's only name is the "✕" glyph, focus is never moved/trapped. | Add dialog semantics + `aria-label="Close settings"`; share one focus-trap utility with the recipe modal. |
| MS-8 | **Medium** | `src/components/recipe/RecipeDetailModal.vue:106-129` | Dialog semantics ✔, Esc ✔ (verified), but focus never moves into the dialog (verified: stayed on trigger) and background remains tabbable behind `aria-modal="true"`. | On open: focus the close button; trap Tab; restore on close. |
| MS-9 | **Medium** | `src/composables/useKeyboardControls.ts:11-18` vs `src/utils/constants.ts:7-11` | `'KeyS'/'KeyF'/'KeyH'` are `e.code` names compared against `e.key` → the advertised "Ctrl+S Save Recipe", "Ctrl+F Focus Search", "H Toggle Help" **do not work** (dead code); only Esc/`/`/`?` function. The Settings panel presents these to users as features. | Fix the map to `e.key` values (`'s','f','h'`) *and* implement the actions, or remove them from the shortcuts list. |
| MS-10 | **Medium** | `src/App.vue:423-435` | Footer "Newsletter" form is decorative: placeholder-only email input (no label), icon-only submit button with **no accessible name**, and no submit handler — a fake feature on a no-login product. | Remove the block, or wire it up + `aria-label` the button and label the input. |
| MS-11 | **Medium** | `src/App.vue:395-421` | Footer link lists ("Trending Recipes", "Meal Planner"…) are `<li>` with hover cursors — not links, not focusable, lead nowhere. | Remove or convert to real links/buttons that trigger the corresponding views. |
| MS-12 | **Medium** | `src/App.vue:103` | `role="application"` on the root — same problem as VC-10. | Remove. |
| MS-13 | **Medium** | whole repo (`grep` verified: zero matches) | No `prefers-reduced-motion` handling anywhere; recipe images zoom `scale-110 duration-700` on hover, spinners, 500ms color transitions. | Add a global `@media (prefers-reduced-motion: reduce)` kill-switch like TypeSprint's (`index.html:1041-1047` there). |
| MS-14 | **Medium** | `src/App.vue:151-177` header actions cluster | At 375px the header cluster measures to x=385px (10px clipped; verified live — `overflow-x:hidden` masks it, `scrollWidth 385 > clientWidth 375`). | Reduce `space-x-4`/padding at `max-sm`, or hide the settings label spacing tier. |
| MS-15 | **Medium** | `src/App.vue:230-244` | Absolute "FIND" button overlaps the input's placeholder/text at mobile widths (screenshot: "Search by ingredi…FIND"). Input padding `pr-8` ≪ button width. | Give the input `pr-28`+ or move the button below on `max-sm`. |
| MS-16 | **Low** | `App.vue:301`, `CookMatches.vue:137`, footer `:441-448` | 10px uppercase micro-text for badges/footer. | Raise to ≥11–12px. |
| MS-17 | **Low** | `src/App.vue:334-341` | Discover loading spinner not announced (`role="status"` missing here; the modal's has it). | Add `role="status"`. |

**Positives worth keeping:** Pantry/grocery forms are properly `aria-label`ed with real `<form @submit.prevent>`; recipe modal has allergen/approximation disclaimers; grocery items have per-item labeled checkboxes/edit/delete; servings stepper uses `aria-live="polite"`; error/empty/loading states exist for every fetch (`CookMatches.vue:74-115`); `aria-pressed` used on nav/category chips.

### Design-direction conformance — stated: “warm culinary editorial (cream / charcoal / herb green / coral)”
- **Partial.** Playfair Display serif display type ✔ (genuinely editorial, the best direction-match in the portfolio). Generous editorial spacing ✔.
- Palette drift: background is **lavender-tinted** `#ece4f0`, not cream; primary is amber/orange, not coral; the herb-green token (`--color-culinary-accent: #10b981`) is defined but almost unused (only edit-save checkmarks); dark surface `#0f0a1a` is the identical purple-black used by ViralCanvas — template bleed-through, including the same `body::before/after` gradient orbs (`style.css:31-55`).
- Glass restraint ✘: `glass`/`recipe-card` translucency under long-form modal instructions (`RecipeDetailModal.vue:120` — the whole dialog is `glass`); spec calls for solid surfaces under long-form text.

### Theme audit (real state)
- **Exists today:** light / dark / system (3-way in Settings; header button cycles dark→light→system). Two visual themes.
- **Defect:** MS-1 — the toggle is **structurally broken** whenever the choice disagrees with the OS. Until fixed, MealScout effectively has *one reliable theme* (the one matching the viewer's OS).
- **Gap to 8 presets:** 6+ missing; no infrastructure. Do not claim otherwise.

---

## 3. MK TypeSprint

### Findings

| # | Severity | Location | Evidence | Proposed fix |
|---|---|---|---|---|
| TS-1 | **Critical** | `src/main.js:133-140` | Global Space hijack: whenever the Start button is enabled (the default idle state), pressing Space **anywhere** calls `preventDefault()` + `startTest()`. Verified live: with focus on the theme toggle, Space did not activate the button — it started a test and yanked focus into the input. Every button/link on the page loses Space activation; page-scroll via Space is also blocked. | Only trigger when nothing interactive is focused: `if (e.key===' ' && document.activeElement === document.body && !el.startBtn.disabled)`. |
| TS-2 | **High** | `src/session.js` `handleWordInputKeydown` (Tab → `preventDefault` + skip word) + no abort key | **Keyboard trap during a running test** (WCAG 2.1.2): Tab inside the input is consumed as "skip word", Esc does nothing mid-test, so there is no keyboard path out of the input until the test ends. | Make Esc end/reset the running test (call `resetGame()`), and document Tab-to-skip in the UI. |
| TS-3 | **High** | `src/results.js:61-71` + `index.html:1471` | Results modal (`role="dialog" aria-modal="true"`) opens without moving focus (verified live: `activeElement: BODY` because the input is disabled while focused), no trap, background fully tabbable. Esc ✔ and overlay-click ✔ do close it (verified). | On `.show`: `el.modalRestartBtn.focus()`; trap Tab within `.modal`; return focus to Start on close. ~15 lines. |
| TS-4 | **High** | `index.html:155` (`--text-muted: #94a3b8` light), `:199` (`#64748b` dark) | Measured live — light: stat labels **2.41:1**, setting labels **2.35:1**, inactive nav links **2.44:1**, heatmap hint **2.18:1**; dark: **3.24–3.92:1**. All normal-size text (10–13px). | Darken light `--text-muted` to ≈`#5b6b80` (≥4.5:1 on `#e8edf5`) and dark to ≈`#94a3b8`. Two token edits. |
| TS-5 | **High** | `src/heatmap.js` `heatColor()` + key renderer (`style="background:hsl(…);color:#fff"`) | White 12px key labels on the accuracy hue scale: **2.12:1** at the 50%-accuracy hue `hsl(60,72%,42%)`, **2.65:1** even on full green (computed; formula above). Good: each key *does* carry `title` + `aria-label` + focusability, so the data isn't color-only — but the labels themselves are illegible. | Pick label color by luminance (dark text on light/mid hues), or lighten the scale (`hsl(h,72%,62%)`) with dark text. |
| TS-6 | **Medium** | `.btn-primary` / `.hero-cta` gradients (`index.html:397, 675`) | White 14px/600 text on `linear-gradient(135deg,#8b5cf6,#ec4899)`: **4.23:1** at the purple end, **3.53:1** at the pink end (needs 4.5:1); dark theme endpoint `#a78bfa` ≈ 3.1:1. | Darken gradient stops (`#7c3aed→#db2777`) or bump button text to 700/16px (still safest to darken). |
| TS-7 | **Medium** | `index.html:1204-1208`, `src/main.js:68-88` | Mode buttons (Words/Timer/Code/Quotes/Weak Keys): selected state is `.active` color only — no `aria-pressed` (verified live: all `null`). WCAG 4.1.2. | Set `aria-pressed` in the click handler alongside `.active`. |
| TS-8 | **Medium** | `index.html` body structure | No `<main>` landmark (verified live); page sections toggle via `href="#"` links with inline `onclick` — no deep links, Back button doesn't work for Guide/About; the `<label class="setting-label">Mode</label>` (`:1202`) is associated with nothing. | Wrap sections in `<main>`; use hash routes (`#guide`) with a `hashchange` listener; make "Mode" a `<span role="group" aria-label>` or fieldset legend. |
| TS-9 | **Low** | `src/heatmap.js` key renderer | 41 heatmap keys with `tabindex="0"` inject 41 tab stops into the page for read-only data. | Drop `tabindex`, keep `title`/`aria-label`, and add a visually-hidden text summary of the 5 weakest keys. |
| TS-10 | **Low** | `src/history.js:135` | History delete is a bare 16px "×" button — below the 24×24 CSS-px WCAG 2.5.8 minimum target. | Add `padding:8px` (or min 24px box) to the delete button. |
| TS-11 | **Low** | `.stat-label`, `.dash-label` (10–11px uppercase) | Micro-text below 12px floor. | Raise to 11–12px. |
| TS-12 | **Low** | `index.html:1155` | "⚡" emoji as decorative icon in hero badge (screen readers announce it; icon-consistency rule says SVG-only). | `aria-hidden="true"` span or replace with the existing inline-SVG style. |

**Positives worth keeping (best a11y baseline of the three):** global `:focus-visible { outline: 3px solid var(--primary) }` (`index.html:255-258`); global `prefers-reduced-motion` kill-switch (`:1041-1047`); incorrect chars get a **wavy underline**, not color alone (`:625`); `role="alert" aria-live="polite"` message region; real `<label for>` on selects; monospace `--font-mono` word display; print stylesheet; theme toggle works correctly in **both** directions (attribute + variables, no media-query trap); no horizontal scroll at 375px (verified); confirm() guards on destructive data actions; heatmap keys carry full text equivalents.

### Design-direction conformance — stated: “performance lab (legible typography, restrained effects, minimal distraction)”
- **Drifted at the skin level, on-direction at the core.** The typing surface itself is right: JetBrains Mono word display, tabular stats, per-char feedback. But the chrome is the same glassmorphism template as the other two — the stylesheet literally opens with *"MK TypeSprint — Glassmorphism Design System, Inspired by dash06 (Fitness Activity Tracker)"* (`index.html:136-139`) — with purple→pink gradient CTAs, gradient stat numbers, and two fixed gradient orbs (`:229-253`). A performance lab wants flat, high-contrast surfaces and zero decorative blur behind the test area; the long-form Guide/FAQ text also sits on translucent `--bg-surface` cards rather than solid surfaces.

### Theme audit (real state)
- **Exists today:** light + dark via `data-theme` attribute (`src/theme.js`), initialized from `prefers-color-scheme`, persisted through the versioned storage layer. **Both themes verified working live.** No "system" live-tracking after first visit (change of OS theme is not observed).
- **Gap to 8 presets:** 6 missing. The CSS-variable architecture here is actually the most preset-ready of the three (a new preset = one `[data-theme='x']` block), but nothing beyond light/dark exists today.

---

## 4. Cross-product consistency notes

1. **One template, three "directions".** All three ship the same skin: fixed `body::before/after` radial gradient orbs, 20px-blur glass surfaces, purple/pink gradient accents, near-identical dark backgrounds (`#0f0a1a` VC & MS, `#0c1222` TS), identical footer formulas ("© 2026 … No data collected … Free & open-source"). Individually pleasant; portfolio-wide it *is* the generic-AI-dashboard look, and it directly contradicts two of the three stated directions (charcoal studio, performance lab). If differentiation matters, the cheapest levers are: kill the orbs per product, keep glass only on sticky nav, and give each product its own accent system (VC charcoal+electric accent, MS cream+coral/herb, TS flat high-contrast).
2. **Shared muted-token failure.** Every product's "muted" text token fails AA in light mode (VC 2.73, MS n/a-slate but amber CTAs 2.15, TS 2.18–2.44). The habit is "muted = pretty gray"; muted must still clear 4.5:1.
3. **Shared modal pattern, shared bug.** All three declare `aria-modal="true"` and none implements focus behavior (initial focus / trap / return). One shared ~20-line focus-trap utility fixes nine findings across the portfolio. Esc coverage today: TS ✔, MS recipe ✔ / settings ✔ (global), VC ✘.
4. **Shared broken-shortcut pattern.** Both SPA apps ship a `useKeyboardControls` with `e.code` names matched against `e.key` (dead shortcuts), advertise those shortcuts in their Settings UI, and lack editable-target guards. TypeSprint's equivalent sin is the global Space hijack. Rule: shortcut handlers must (a) use real `e.key` values, (b) bail on editable targets, (c) never claim shortcuts that aren't wired.
5. **`role="application"` anti-pattern** on both React and Vue roots — copy-pasted between products; remove in both.
6. **Reduced motion:** TS has the model implementation (global kill-switch); VC covers only 2 of its animations (framer-motion untouched); MS has none. Portfolio rule: adopt TS's block + `MotionConfig reducedMotion="user"` where framer-motion is used.
7. **Tailwind v4 dark-variant trap:** both Tailwind apps toggle classes while `dark:` utilities follow the OS media query. MealScout is critically broken by it; ViralCanvas mildly. `@custom-variant dark` belongs in both css entrypoints.
8. **Micro-typography:** 8–11px uppercase micro-labels are endemic in all three. Floor at 12px (11px only for true captions).
9. **Honest-feature discipline** (per the operator's production-truthfulness standard): MealScout's dead newsletter form + fake footer links, and both apps' advertised-but-dead keyboard shortcuts, present non-features as features. Remove or implement.

---

## 5. Top-10 prioritized fixes (each sized for one commit)

| # | Product | Fix | Files | Why first |
|---|---|---|---|---|
| 1 | MealScout | Add `@custom-variant dark (&:where(.dark, .dark *));` and apply the theme class on `<html>` | `src/style.css`, `src/stores/settings.ts` | Light theme is illegible (~1.1:1 hero) for every OS-dark visitor — Critical, ~3 lines |
| 2 | TypeSprint | Scope the Space shortcut to `document.activeElement === document.body` | `src/main.js:133-140` | Space activation of every control is broken — Critical, 1 line |
| 3 | MealScout | Fix primary-action contrast: amber-700 fill or slate-900 text on amber | `src/style.css:4` + 6 call sites | Every CTA in the product is 2.15:1 — Critical |
| 4 | ViralCanvas | `aria-label`s on 6 sliders + Font/Weight selects | `src/components/MemeGenerator.tsx` | 8 unnamed controls in the core editor flow — High, mechanical |
| 5 | ViralCanvas | Settings dialog: Esc close + focus in/trap/return; reconcile the advertised shortcut list | `src/components/SettingsPanel.tsx`, delete/fix `src/hooks/useKeyboardControls.ts`, `src/utils/constants.ts` | Verified-live WCAG failure + honesty issue |
| 6 | MealScout | Make CookMatches cards keyboard-operable (`<button>` wrapper + label) | `src/components/pantry/CookMatches.vue:123-127` | Primary pantry→recipe flow is mouse-only |
| 7 | TypeSprint | Results-modal focus management (focus Try-Again on open, trap, restore) + Esc aborts a running test | `src/results.js`, `src/main.js`, `src/session.js` | Fixes TS-2 keyboard trap and TS-3 together |
| 8 | ViralCanvas | Restore focus visibility: replace `outline-none` with the existing `focus:ring` recipe on selects/number inputs | `MemeGenerator.tsx:566,581`, `ArtboardPicker.tsx:45,66,78` | Invisible keyboard focus — High, class-swap only |
| 9 | Both SPAs | Guard shortcuts against editable targets + fix `e.key` map (kills MealScout's `?`-in-search bug and ViralCanvas Ctrl+R hijack) | `MK-MealScout/src/composables/useKeyboardControls.ts`, `MK-ViralCanvas/src/components/MemeGenerator.tsx:187-210` | Typing punctuation opens modals; reload hijacked |
| 10 | MealScout | One-line Vue fix: `:aria-label` binding for the saved-recipes counter; same commit removes the dead newsletter form or labels+wires it | `src/App.vue:170, 423-435` | Literal `{{ }}` shipped to production screen readers |

Runner-up (11th): darken the muted-text tokens in ViralCanvas (`src/index.css:12,28`) and TypeSprint (`index.html:155,199`) — two-line commits each, clears a dozen AA failures at once.

---

## 6. Tools & methods actually used (honest statement)

- **ui-ux-pro-max skill: used** (loaded via the Skill tool at session start; its Quick-Reference priority checklist structured the audit). Its `search.py` database CLI was **not** run — not needed for a measurement audit.
- **Live browser (Claude Browser pane):** real page loads of all three production URLs (Vercel challenge passed), real Tab/Esc/Space key presses, viewport resizes (desktop / 375×812), screenshots.
- **In-page JavaScript** (`getComputedStyle` + WCAG luminance formula, alpha-compositing over ancestor backgrounds; canvas fallback for oklch color parsing): all contrast ratios above are measured, not eyeballed, except where marked "computed" (static math on token values, formula shown).
- **Source reading** of all cited files in the three repos (read-only — no files in any product repo were modified).
- **Not used / not available:** axe-core, Lighthouse, screen-reader (VoiceOver) pass-through, Playwright automation, code-review-graph (no graph existed), Repomix (not needed at this scale). Findings that depend on actual screen-reader behavior (e.g., `role="application"` effects) are inferred from spec, not tested with a live SR.
- **Caveats:** 200% zoom was approximated by the 375px reflow check (WCAG 1.4.10-style); one TypeSprint "light theme still dark" reading mid-audit was a browser-pane compositing pause, not a product bug — re-verified clean and excluded. MealScout/ViralCanvas mixed-theme findings were verified against OS-dark only; the OS-light inverse is asserted from the CSS mechanics, not re-tested.
