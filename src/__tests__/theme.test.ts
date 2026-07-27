import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  THEME_META_COLORS,
  isThemeName,
  readStoredTheme,
  stampThemeAttributes,
} from '@/utils/theme';
import { SETTINGS_STORE_KEY, THEME_KEY } from '@/utils/storageKeys';
import { useSettingsStore } from '@/stores/settings';

function ensureThemeColorMeta(): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  return meta;
}

describe('theme engine', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-motion');
    document.documentElement.removeAttribute('data-transparency');
  });

  describe('stampThemeAttributes', () => {
    it('stamps data-theme, data-motion and data-transparency on <html>', () => {
      stampThemeAttributes({ theme: 'light', reducedMotion: false, reducedTransparency: false });

      const root = document.documentElement;
      expect(root.getAttribute('data-theme')).toBe('light');
      expect(root.getAttribute('data-motion')).toBe('full');
      expect(root.getAttribute('data-transparency')).toBe('normal');
    });

    it('bridges the reduced-motion setting to data-motion="reduced"', () => {
      stampThemeAttributes({ theme: 'dark', reducedMotion: true, reducedTransparency: false });
      expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');
    });

    it('honors the reduced-transparency setting', () => {
      stampThemeAttributes({ theme: 'dark', reducedMotion: false, reducedTransparency: true });
      expect(document.documentElement.getAttribute('data-transparency')).toBe('reduced');
    });

    it('forces reduced transparency in high contrast (no glass anywhere)', () => {
      stampThemeAttributes({ theme: 'hc', reducedMotion: false, reducedTransparency: false });
      expect(document.documentElement.getAttribute('data-transparency')).toBe('reduced');
    });

    it('persists the theme under mk.viralcanvas.theme.v1', () => {
      stampThemeAttributes({ theme: 'hc', reducedMotion: false, reducedTransparency: false });
      expect(THEME_KEY).toBe('mk.viralcanvas.theme.v1');
      expect(localStorage.getItem(THEME_KEY)).toBe('hc');
    });

    it('keeps <meta name="theme-color"> in sync with the theme page color', () => {
      const meta = ensureThemeColorMeta();
      (['dark', 'light', 'hc'] as const).forEach(theme => {
        stampThemeAttributes({ theme, reducedMotion: false, reducedTransparency: false });
        expect(meta.getAttribute('content')).toBe(THEME_META_COLORS[theme]);
      });
    });
  });

  describe('readStoredTheme', () => {
    it('defaults to signature dark when nothing is stored', () => {
      expect(readStoredTheme()).toBe('dark');
    });

    it('prefers the dedicated theme key', () => {
      localStorage.setItem(THEME_KEY, 'light');
      expect(readStoredTheme()).toBe('light');
    });

    it('migrates the legacy settings-store theme value', () => {
      localStorage.setItem(SETTINGS_STORE_KEY, JSON.stringify({ state: { theme: 'light' } }));
      expect(readStoredTheme()).toBe('light');
    });

    it("resolves the retired 'system' mode via prefers-color-scheme", () => {
      localStorage.setItem(SETTINGS_STORE_KEY, JSON.stringify({ state: { theme: 'system' } }));
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList));
      expect(readStoredTheme()).toBe('light');
      vi.unstubAllGlobals();
    });

    it('falls back to dark on corrupt storage', () => {
      localStorage.setItem(THEME_KEY, 'sparkly');
      localStorage.setItem(SETTINGS_STORE_KEY, '{not json');
      expect(readStoredTheme()).toBe('dark');
    });
  });

  describe('isThemeName', () => {
    it('accepts only the three shipped themes', () => {
      expect(isThemeName('dark')).toBe(true);
      expect(isThemeName('light')).toBe(true);
      expect(isThemeName('hc')).toBe(true);
      expect(isThemeName('system')).toBe(false);
      expect(isThemeName(undefined)).toBe(false);
    });
  });

  describe('settings store integration', () => {
    it('setTheme stamps the DOM and tracks isDarkMode', () => {
      const store = useSettingsStore.getState();

      store.setTheme('hc');
      expect(document.documentElement.getAttribute('data-theme')).toBe('hc');
      expect(useSettingsStore.getState().isDarkMode).toBe(true);

      store.setTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(useSettingsStore.getState().isDarkMode).toBe(false);

      store.setTheme('dark');
    });

    it('setReducedMotion / setReducedTransparency stamp their attributes', () => {
      const store = useSettingsStore.getState();

      store.setReducedMotion(true);
      expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');
      store.setReducedMotion(false);
      expect(document.documentElement.getAttribute('data-motion')).toBe('full');

      store.setReducedTransparency(true);
      expect(document.documentElement.getAttribute('data-transparency')).toBe('reduced');
      store.setReducedTransparency(false);
      expect(document.documentElement.getAttribute('data-transparency')).toBe('normal');
    });

    it('toggleDarkMode flips between light and the dark signature', () => {
      const store = useSettingsStore.getState();

      store.setTheme('light');
      store.toggleDarkMode();
      expect(useSettingsStore.getState().theme).toBe('dark');

      store.toggleDarkMode();
      expect(useSettingsStore.getState().theme).toBe('light');

      // From high contrast the quick toggle lands on light.
      store.setTheme('hc');
      store.toggleDarkMode();
      expect(useSettingsStore.getState().theme).toBe('light');

      store.setTheme('dark');
    });
  });
});
