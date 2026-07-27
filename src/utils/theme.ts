import { SETTINGS_STORE_KEY, THEME_KEY } from './storageKeys';

/**
 * Night Studio theme engine (V3).
 *
 * One writer for every theme-related DOM side effect: the `data-theme`,
 * `data-motion` and `data-transparency` attributes on <html>, the
 * `theme-color` meta, and the persisted `mk.viralcanvas.theme.v1` key.
 * Components never branch on theme id — CSS token remapping does all
 * the work (see src/index.css).
 *
 * First-paint stamping: main.tsx calls the settings store's applyTheme()
 * synchronously in its module graph, before ReactDOM renders anything.
 * The app is a SPA that paints nothing until that bundle executes, so
 * no inline <script> is needed and the CSP (`script-src 'self'`) stays
 * untouched. Tradeoff: while the bundle downloads, the document shows
 * the CSS default (signature dark) — light/HC users can see a brief
 * dark frame on cold loads. Documented and accepted: dark is the
 * designed default for this product.
 */

export type ThemeName = 'dark' | 'light' | 'hc';

/** Resolved --mk-bg-page per theme, mirrored into <meta name="theme-color">. */
export const THEME_META_COLORS: Record<ThemeName, string> = {
  dark: '#0E1116',
  light: '#F6F7F9',
  hc: '#000000',
};

export function isThemeName(value: unknown): value is ThemeName {
  return value === 'dark' || value === 'light' || value === 'hc';
}

export interface ThemeAttributes {
  theme: ThemeName;
  reducedMotion: boolean;
  reducedTransparency: boolean;
}

export function stampThemeAttributes({
  theme,
  reducedMotion,
  reducedTransparency,
}: ThemeAttributes): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-motion', reducedMotion ? 'reduced' : 'full');

  // High contrast forces reduced transparency: no glass, no aurora
  // anywhere (V3_DESIGN_SYSTEM.md §3.3).
  const transparencyReduced = reducedTransparency || theme === 'hc';
  root.setAttribute('data-transparency', transparencyReduced ? 'reduced' : 'normal');

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_META_COLORS[theme]);

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode / quota exceeded: the theme simply won't persist.
  }
}

/**
 * Initial theme for store creation. Prefers the dedicated theme key;
 * falls back to the pre-V3 settings JSON (which stored
 * 'dark' | 'light' | 'system') so existing users keep their choice.
 */
export function readStoredTheme(): ThemeName {
  try {
    const direct = localStorage.getItem(THEME_KEY);
    if (isThemeName(direct)) return direct;

    const raw = localStorage.getItem(SETTINGS_STORE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const legacy =
        typeof parsed === 'object' && parsed !== null
          ? (parsed as { state?: { theme?: unknown } }).state?.theme
          : undefined;
      if (isThemeName(legacy)) return legacy;
      if (legacy === 'system') {
        const prefersLight =
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-color-scheme: light)').matches;
        return prefersLight ? 'light' : 'dark';
      }
    }
  } catch {
    // Corrupt JSON or storage unavailable — fall through to the default.
  }
  return 'dark';
}
