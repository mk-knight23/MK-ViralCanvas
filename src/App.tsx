import { MotionConfig } from 'framer-motion';
import { useSettingsStore } from '@/stores/settings';
import { Moon, Sun, Settings } from 'lucide-react';
import { MemeGenerator } from './components/MemeGenerator';
import { SettingsPanel } from './components/SettingsPanel';
import { StatsTicker } from './components/StatsTicker';
import { ToastContainer } from './components/Toast';

/**
 * Night Studio shell (V3): the editor IS the landing. No marketing hero,
 * no decorative feature tiles — a glass nav over a static aurora, the
 * Studio Strip, then the workspace. Theme lives on <html data-theme>
 * (stores/settings.ts + utils/theme.ts), never as a class here.
 */
export default function App() {
  const { isDarkMode, toggleDarkMode, toggleHelp, reducedMotion } = useSettingsStore();

  return (
    // 'user' honors the OS prefers-reduced-motion setting; the stored
    // toggle upgrades that to 'always' for every framer-motion animation.
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <div className="min-h-screen">
        <SettingsPanel />
        <ToastContainer />

        {/* Aurora (violet→cyan, static, masked) lives behind this region
            only — never behind the canvas. Hidden in HC / reduced
            transparency via --mk-aurora-opacity. */}
        <div className="header-region">
          <nav className="sticky top-0 z-40 glass-nav border-b border-border">
            <div className="max-w-7xl min-[1440px]:max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
              <h1 className="text-xl font-display font-bold tracking-tight leading-none">
                MK<span className="text-brand-primary">_</span>ViralCanvas
              </h1>

              <div className="flex items-center gap-3">
                <StatsTicker />

                <button
                  onClick={toggleDarkMode}
                  className="p-2.5 rounded-lg bg-surface-elevated border border-border text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors cursor-pointer"
                  aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button
                  onClick={toggleHelp}
                  className="p-2.5 rounded-lg bg-surface-elevated border border-border text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors cursor-pointer"
                  aria-label="Open settings"
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>
          </nav>
        </div>

        <div className="max-w-7xl min-[1440px]:max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <main role="main" aria-label="Meme generator workspace">
            <MemeGenerator />
          </main>

          <footer className="mt-16 py-8 border-t border-border" role="contentinfo">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="font-display font-semibold text-sm text-text-muted">
                MK ViralCanvas v{__APP_VERSION__}
              </span>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <a
                  href="https://github.com/mk-knight23/MK-ViralCanvas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  GitHub
                </a>
                <span>·</span>
                <span>No data collected</span>
                <span>·</span>
                <span>Free & open-source</span>
              </div>
              <p className="text-text-muted text-xs">
                © 2026{' '}
                <a
                  href="https://www.mkazi.live"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  Kazi Musharraf
                </a>
                . All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </MotionConfig>
  );
}
