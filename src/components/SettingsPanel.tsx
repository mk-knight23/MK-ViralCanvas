import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/stores/settings';
import { useStatsStore } from '@/stores/stats';
import { useAudio } from '@/hooks/useAudio';
import { KEYBOARD_SHORTCUTS } from '@/utils/constants';
import {
  Volume2,
  Moon,
  Sun,
  Monitor,
  RotateCcw,
  X,
  Keyboard,
  BarChart3,
  Settings,
} from 'lucide-react';

export function SettingsPanel() {
  const settings = useSettingsStore();
  const stats = useStatsStore();
  const { playClick } = useAudio();

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const themeOptions = [
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // While the dialog is open: lock background scroll, move focus into the
  // dialog, and restore focus to the trigger element when it closes.
  useEffect(() => {
    if (!settings.showHelp) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = '';
      triggerRef.current?.focus?.();
    };
  }, [settings.showHelp]);

  const close = () => {
    playClick();
    settings.toggleHelp();
  };

  // Esc closes the dialog; Tab is trapped inside it while open.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;

    const root = dialogRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled'));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || active === root) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence>
      {settings.showHelp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={close}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="card-elevated w-full max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar outline-none"
            onClick={e => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-surface-elevated z-10 rounded-t-[1.25rem]">
              <div className="flex items-center gap-3">
                <div className="bg-brand-primary/10 p-2 rounded-lg">
                  <Settings className="text-brand-primary w-5 h-5" />
                </div>
                <h2 id="settings-title" className="text-lg font-display font-bold">
                  Settings
                </h2>
              </div>
              <button
                onClick={close}
                className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface-secondary cursor-pointer"
                aria-label="Close settings"
              >
                <X size={20} />
              </button>
            </header>

            <div className="p-6 space-y-8">
              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                  <Volume2 size={14} /> Audio
                </h3>
                <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-xl">
                  <span className="font-medium text-sm">Sound Effects</span>
                  <button
                    onClick={() => {
                      playClick();
                      settings.toggleSound();
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                      settings.soundEnabled ? 'bg-brand-primary' : 'bg-border'
                    }`}
                    role="switch"
                    aria-checked={settings.soundEnabled}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                  <Sun size={14} /> Theme
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        playClick();
                        settings.setTheme(option.value);
                      }}
                      className={`flex flex-col items-center p-4 rounded-xl transition-all border-2 cursor-pointer ${
                        settings.theme === option.value
                          ? 'border-brand-primary bg-brand-primary/10'
                          : 'border-border hover:border-border-hover'
                      }`}
                    >
                      <option.icon
                        size={20}
                        className={`mb-2 ${
                          settings.theme === option.value ? 'text-brand-primary' : 'text-text-muted'
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          settings.theme === option.value ? 'text-text-primary' : 'text-text-muted'
                        }`}
                      >
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                  <BarChart3 size={14} /> Statistics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: stats.totalMemesCreated,
                      label: 'Memes Created',
                      color: 'text-text-primary',
                    },
                    {
                      value: stats.totalDownloads,
                      label: 'Downloads',
                      color: 'text-brand-primary',
                    },
                    { value: stats.totalFavorites, label: 'Favorites', color: 'text-pink-500' },
                    {
                      value: formatTime(stats.totalTimeSpent),
                      label: 'Time Spent',
                      color: 'text-brand-accent',
                    },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      className="bg-surface-secondary rounded-xl p-4 text-center"
                    >
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1 font-semibold">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    playClick();
                    stats.resetStats();
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors text-sm font-medium cursor-pointer"
                >
                  <RotateCcw size={14} /> Reset Statistics
                </button>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                  <Keyboard size={14} /> Keyboard Shortcuts
                </h3>
                <div className="space-y-1.5">
                  {KEYBOARD_SHORTCUTS.map(shortcut => (
                    <div
                      key={shortcut.action}
                      className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                    >
                      <span className="text-sm text-text-secondary">{shortcut.action}</span>
                      <kbd className="px-2.5 py-1 text-xs font-mono bg-surface-elevated border border-border rounded-md text-text-muted">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <footer className="p-5 border-t border-border text-center">
              <p className="text-xs text-text-muted">MK ViralCanvas v2.0 — Built with React + Vite</p>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
