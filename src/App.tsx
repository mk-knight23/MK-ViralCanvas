import { motion } from 'framer-motion';
import { useSettingsStore } from '@/stores/settings';
import { Smile, Zap, Moon, Sun, Settings, Sparkles, Download, Heart, Image } from 'lucide-react';
import { MemeGenerator } from './components/MemeGenerator';
import { SettingsPanel } from './components/SettingsPanel';
import { ToastContainer } from './components/Toast';
import { useStatsStore } from '@/stores/stats';

export default function App() {
  const { isDarkMode, toggleDarkMode, toggleHelp, applyTheme } = useSettingsStore();
  const stats = useStatsStore();

  return (
    <div
      className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}
      role="application"
      aria-label="MK ViralCanvas Meme Generator"
    >
      <SettingsPanel />
      <ToastContainer />

      <nav className="sticky top-0 z-40 glass mx-0 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary p-2 rounded-xl shadow-lg shadow-brand-primary/20">
              <Smile className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-display font-black tracking-tight uppercase leading-none">
              MK_<span className="text-brand-primary">ViralCanvas</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 mr-4 text-xs font-semibold text-text-muted">
              <span className="flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" /> {stats.totalMemesCreated}
              </span>
              <span className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> {stats.totalDownloads}
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" /> {stats.totalFavorites}
              </span>
            </div>

            <button
              onClick={() => {
                toggleDarkMode();
                applyTheme();
              }}
              className="p-2.5 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-brand-primary hover:border-brand-primary/30 transition-all cursor-pointer"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => {
                toggleHelp();
              }}
              className="p-2.5 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-brand-primary hover:border-brand-primary/30 transition-all cursor-pointer"
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-widest mb-5">
              <Zap className="w-3.5 h-3.5 fill-current" /> Professional Meme Maker
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-primary via-brand-accent to-brand-glow">
              Create Memes that Go Viral
            </h2>
            <p className="text-text-secondary text-lg leading-relaxed">
              The ultimate workspace for digital creators. Customize templates, upload your own
              images, and share instantly.
            </p>
          </motion.div>
        </div>

        <main role="main" aria-label="Meme generator workspace">
          <MemeGenerator />
        </main>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { icon: Sparkles, label: 'AI-Powered', desc: 'Smart templates' },
            { icon: Download, label: 'HD Export', desc: 'High quality PNG' },
            { icon: Heart, label: 'Favorites', desc: 'Save your best' },
            { icon: Zap, label: 'Instant', desc: 'No signup needed' },
          ].map(feature => (
            <div key={feature.label} className="card-elevated p-5 text-center group cursor-default">
              <feature.icon className="w-6 h-6 mx-auto mb-3 text-brand-primary group-hover:scale-110 transition-transform" />
              <div className="font-display font-bold text-sm mb-1">{feature.label}</div>
              <div className="text-text-muted text-xs">{feature.desc}</div>
            </div>
          ))}
        </motion.div>

        <footer className="mt-20 py-10 border-t border-border" role="contentinfo">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-text-muted">
              <Smile size={18} />
              <span className="font-display font-bold text-sm">MK ViralCanvas v2.0</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <a href="https://github.com/mk-knight23/19-web-viral-creator" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors">GitHub</a>
              <span>·</span>
              <span>No data collected</span>
              <span>·</span>
              <span>Free & open-source</span>
            </div>
            <p className="text-text-muted text-xs">
              © 2026 <a href="https://www.mkazi.live" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors">Qazi Musharof — Kazi Developer</a>. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
