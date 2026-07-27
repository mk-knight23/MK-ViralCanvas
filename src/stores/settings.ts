import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SETTINGS_STORE_KEY } from '@/utils/storageKeys';
import { readStoredTheme, stampThemeAttributes, type ThemeName } from '@/utils/theme';

export type ThemeMode = ThemeName;

interface SettingsState {
  soundEnabled: boolean;
  theme: ThemeMode;
  showHelp: boolean;
  reducedMotion: boolean;
  reducedTransparency: boolean;
  isDarkMode: boolean;

  toggleSound: () => void;
  setTheme: (theme: ThemeMode) => void;
  applyTheme: () => void;
  toggleHelp: () => void;
  toggleDarkMode: () => void;
  setReducedMotion: (value: boolean) => void;
  setReducedTransparency: (value: boolean) => void;
}

/** Fields that persist under mk.viralcanvas.settings.v1. The theme itself
 * persists separately under mk.viralcanvas.theme.v1 (see utils/theme.ts). */
interface PersistedSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  reducedTransparency: boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      theme: readStoredTheme(),
      showHelp: false,
      reducedMotion: false,
      reducedTransparency: false,
      isDarkMode: readStoredTheme() !== 'light',

      toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),
      setTheme: theme => {
        set({ theme });
        get().applyTheme();
      },
      applyTheme: () => {
        const { theme, reducedMotion, reducedTransparency } = get();
        set({ isDarkMode: theme !== 'light' });
        stampThemeAttributes({ theme, reducedMotion, reducedTransparency });
      },
      toggleHelp: () => set(state => ({ showHelp: !state.showHelp })),
      toggleDarkMode: () => {
        get().setTheme(get().theme === 'light' ? 'dark' : 'light');
      },
      setReducedMotion: value => {
        set({ reducedMotion: value });
        get().applyTheme();
      },
      setReducedTransparency: value => {
        set({ reducedTransparency: value });
        get().applyTheme();
      },
    }),
    {
      name: SETTINGS_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedSettings => ({
        soundEnabled: state.soundEnabled,
        reducedMotion: state.reducedMotion,
        reducedTransparency: state.reducedTransparency,
      }),
      // Older releases persisted `theme` ('dark'|'light'|'system') and
      // `isDarkMode` in this key. Merge only the fields this version
      // owns; the theme migrates via readStoredTheme() at store init.
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<PersistedSettings>;
        return {
          ...current,
          soundEnabled:
            typeof stored.soundEnabled === 'boolean' ? stored.soundEnabled : current.soundEnabled,
          reducedMotion:
            typeof stored.reducedMotion === 'boolean'
              ? stored.reducedMotion
              : current.reducedMotion,
          reducedTransparency:
            typeof stored.reducedTransparency === 'boolean'
              ? stored.reducedTransparency
              : current.reducedTransparency,
        };
      },
    }
  )
);
