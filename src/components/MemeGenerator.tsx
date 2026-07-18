import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Heart,
  RefreshCw,
  Type,
  Trash2,
  Search,
  Upload,
  Undo2,
  Redo2,
  Copy,
  ChevronDown,
  ImageIcon,
  Palette,
  Move,
  TrendingUp,
  Globe,
  Flame,
  Film,
  Tv,
  Gamepad2,
  Trophy,
  Laugh,
  Skull,
  Cat,
  Sparkles,
  Clapperboard,
  Share2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { useMemeStore } from '@/stores/memeStore';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toastStore';
import {
  searchMemes,
  getTrendingMemes,
  getCategoryMemes,
  getTemplates,
  getActiveSources,
} from '@/utils/api';
import type { MemeState, MemeTemplate } from '@/types/meme';
import type { SearchMeme } from '@/utils/api';

const FONT_OPTIONS = [
  { value: "'Impact', 'Arial Black', sans-serif", label: 'Impact' },
  { value: "'Comic Sans MS', cursive", label: 'Comic Sans' },
  { value: "'Arial', sans-serif", label: 'Arial' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'Courier New', monospace", label: 'Courier' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet' },
];

const SOURCE_COLORS: Record<string, string> = {
  serper: '#2563eb',
  tavily: '#9333ea',
  brave: '#f97316',
  serpapi: '#16a34a',
  searchapi: '#0891b2',
  exa: '#6366f1',
  scrapingdog: '#ca8a04',
  apify: '#e11d48',
  imgflip: '#4b5563',
};

const CATEGORIES = [
  { id: 'templates', name: 'Templates', icon: ImageIcon },
  { id: 'trending', name: 'Trending', icon: TrendingUp },
  { id: 'funny', name: 'Funny', icon: Laugh },
  { id: 'indian', name: 'Indian', icon: Globe },
  { id: 'american', name: 'American', icon: Globe },
  { id: 'movies', name: 'Movies', icon: Film },
  { id: 'series', name: 'Series', icon: Tv },
  { id: 'politics', name: 'Politics', icon: Clapperboard },
  { id: 'dark-humor', name: 'Dark Humor', icon: Skull },
  { id: 'animals', name: 'Animals', icon: Cat },
  { id: 'sports', name: 'Sports', icon: Trophy },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2 },
  { id: 'ai', name: 'AI Memes', icon: Sparkles },
  { id: 'classic', name: 'Classic', icon: Flame },
  { id: 'reaction', name: 'Reaction', icon: Laugh },
];

const DEFAULT_MEME: MemeState = {
  topText: '',
  bottomText: '',
  fontSize: 40,
  textColor: '#ffffff',
  topOffset: 5,
  bottomOffset: 5,
  template: null,
  fontFamily: "'Impact', 'Arial Black', sans-serif",
  strokeColor: '#000000',
  strokeWidth: 2,
  shadowEnabled: true,
};

export function MemeGenerator() {
  const { templates, setTemplates, addFavorite, favorites, removeFavorite } = useMemeStore();
  const stats = useStatsStore();
  const { addToast } = useToastStore();

  const [meme, setMeme] = useState<MemeState>(DEFAULT_MEME);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('templates');
  const [categoryMemes, setCategoryMemes] = useState<SearchMeme[]>([]);
  const [showFavorites, setShowFavorites] = useState(true);
  const [activeTab, setActiveTab] = useState<'customize' | 'browse'>('customize');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [activeSources, setActiveSources] = useState<string[]>([]);

  const historyRef = useRef<MemeState[]>([]);
  const historyIndexRef = useRef(-1);
  const [historyLen, setHistoryLen] = useState(0);
  const [currentHistoryIdx, setCurrentHistoryIdx] = useState(-1);
  const memeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => stats.addTimeSpent(1), 1000);
    return () => clearInterval(interval);
  }, [stats]);

  const handlersRef = useRef<{
    handleDownload: () => void;
    handleRandom: () => void;
    handleFavorite: () => void;
    undo: () => void;
    redo: () => void;
  }>({
    handleDownload: () => {},
    handleRandom: () => {},
    handleFavorite: () => {},
    undo: () => {},
    redo: () => {},
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === 'd') {
        e.preventDefault();
        handlersRef.current.handleDownload();
      } else if (key === 'r') {
        e.preventDefault();
        handlersRef.current.handleRandom();
      } else if (key === 's') {
        e.preventDefault();
        handlersRef.current.handleFavorite();
      } else if (key === 'z') {
        e.preventDefault();
        handlersRef.current.undo();
      } else if (key === 'y') {
        e.preventDefault();
        handlersRef.current.redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const tmpl = await getTemplates();
        if (tmpl.length > 0) {
          setTemplates(tmpl);
          const initial = { ...DEFAULT_MEME, template: tmpl[0] };
          setMeme(initial);
          historyRef.current = [initial];
          historyIndexRef.current = 0;
          setHistoryLen(1);
          setCurrentHistoryIdx(0);
        }
      } catch {
        addToast('Failed to load templates', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
    getActiveSources()
      .then(setActiveSources)
      .catch(() => {});
  }, [setTemplates]);

  const commitToHistory = useCallback((newMeme: MemeState) => {
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push(newMeme);
    if (trimmed.length > 50) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    setHistoryLen(trimmed.length);
    setCurrentHistoryIdx(historyIndexRef.current);
  }, []);

  const updateMeme = useCallback(
    (updates: Partial<MemeState>) => {
      setMeme(prev => {
        const next = { ...prev, ...updates };
        if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
        commitTimerRef.current = setTimeout(() => commitToHistory(next), 300);
        return next;
      });
    },
    [commitToHistory]
  );

  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      setCurrentHistoryIdx(historyIndexRef.current);
      setMeme(historyRef.current[historyIndexRef.current]);
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      setCurrentHistoryIdx(historyIndexRef.current);
      setMeme(historyRef.current[historyIndexRef.current]);
    }
  };

  const handleCategoryChange = async (catId: string) => {
    setActiveCategory(catId);
    if (catId === 'templates') {
      setCategoryMemes([]);
      return;
    }
    setSearchLoading(true);
    try {
      let results: SearchMeme[] = [];
      if (catId === 'trending') {
        results = await getTrendingMemes();
      } else {
        results = await getCategoryMemes(catId);
      }
      setCategoryMemes(results);
      if (results.length === 0) {
        addToast(`No memes found for ${catId}`, 'info');
      }
    } catch {
      addToast('Failed to load memes', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!term.trim()) {
      if (activeCategory !== 'templates') {
        handleCategoryChange(activeCategory);
      }
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchMemes(term);
        setCategoryMemes(results);
        if (results.length === 0) {
          addToast('No memes found. Try different keywords!', 'info');
        }
      } catch {
        addToast('Search failed', 'error');
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  const handleRandom = () => {
    if (templates.length === 0) return;
    const random = templates[Math.floor(Math.random() * templates.length)];
    updateMeme({ template: random });
    stats.recordMemeCreated();
    addToast('Random template loaded!', 'success');
  };

  const handleDownload = async () => {
    if (!memeRef.current) return;
    try {
      const canvas = await html2canvas(memeRef.current, { useCORS: true, scale: 2 });
      canvas.toBlob(blob => {
        if (blob) {
          saveAs(blob, `memelab-${Date.now()}.png`);
          stats.recordDownload();
          addToast('Meme downloaded!', 'success');
        }
      });
    } catch {
      addToast('Download failed', 'error');
    }
  };

  const handleFavorite = () => {
    if (!meme.template) return;
    addFavorite({
      id: Math.random().toString(36).substring(2, 9),
      image: meme.template.url,
      topText: meme.topText,
      bottomText: meme.bottomText,
      date: new Date().toISOString(),
    });
    stats.addFavorite();
    addToast('Saved to favorites!', 'success');
  };

  handlersRef.current = { handleDownload, handleRandom, handleFavorite, undo, redo };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please upload an image file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      const url = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        updateMeme({
          template: {
            id: `custom-${Date.now()}`,
            name: file.name,
            url,
            width: img.width,
            height: img.height,
            box_count: 2,
          },
        });
        addToast('Image uploaded!', 'success');
        stats.recordMemeCreated();
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCopyToClipboard = async () => {
    if (!memeRef.current) return;
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      addToast('Clipboard not supported. Use download instead.', 'info');
      return;
    }
    try {
      const canvas = await html2canvas(memeRef.current, { useCORS: true, scale: 2 });
      canvas.toBlob(async blob => {
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          addToast('Copied to clipboard!', 'success');
        }
      });
    } catch {
      addToast('Copy failed', 'error');
    }
  };

  const selectMeme = (m: MemeTemplate | SearchMeme) => {
    updateMeme({
      template: {
        id: m.id,
        name: m.name,
        url: m.url,
        width: m.width,
        height: m.height,
        box_count: 2,
      },
    });
    setActiveTab('customize');
    stats.recordMemeCreated();
  };

  const getDisplayMemes = (): (MemeTemplate | SearchMeme)[] => {
    if (activeCategory === 'templates') {
      if (searchTerm) {
        return templates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return templates.slice(0, 50);
    }
    return categoryMemes;
  };

  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent('Check out this meme I made on MK ViralCanvas!');

  const quickColors = [
    '#ffffff',
    '#000000',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff6b00',
    '#ff00ff',
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-primary" />
        <p className="text-text-muted text-sm">Loading meme templates...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel */}
      <div className="lg:col-span-4 space-y-4">
        {/* Tabs */}
        <div className="flex bg-surface-secondary rounded-xl p-1 border border-border">
          {(['customize', 'browse'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-surface-elevated text-brand-primary shadow-sm border border-border'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab === 'customize' ? (
                <span className="flex items-center justify-center gap-2">
                  <Palette className="w-4 h-4" /> Editor
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Globe className="w-4 h-4" /> Browse
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Editor Tab */}
        {activeTab === 'customize' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-elevated p-5 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Type className="w-5 h-5 text-brand-primary" /> Text
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={undo}
                  disabled={currentHistoryIdx <= 0}
                  className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Undo"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={redo}
                  disabled={currentHistoryIdx >= historyLen - 1}
                  className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Redo"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
                  Top Text
                </label>
                <input
                  type="text"
                  value={meme.topText}
                  onChange={e => updateMeme({ topText: e.target.value })}
                  className="w-full bg-surface-secondary border border-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none transition-all text-sm"
                  placeholder="Enter top text..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
                  Bottom Text
                </label>
                <input
                  type="text"
                  value={meme.bottomText}
                  onChange={e => updateMeme({ bottomText: e.target.value })}
                  className="w-full bg-surface-secondary border border-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none transition-all text-sm"
                  placeholder="Enter bottom text..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
                    Font
                  </label>
                  <select
                    value={meme.fontFamily}
                    onChange={e => updateMeme({ fontFamily: e.target.value })}
                    className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer"
                  >
                    {FONT_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
                    Size: {meme.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="100"
                    value={meme.fontSize}
                    onChange={e => updateMeme({ fontSize: parseInt(e.target.value) })}
                    className="w-full mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
                  Text Color
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {quickColors.map(c => (
                    <button
                      key={c}
                      onClick={() => updateMeme({ textColor: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${meme.textColor === c ? 'border-brand-primary scale-110' : 'border-border hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={meme.textColor}
                    onChange={e => updateMeme({ textColor: e.target.value })}
                    className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
                    Stroke Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={meme.strokeColor}
                      onChange={e => updateMeme({ strokeColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs text-text-muted">{meme.strokeColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
                    Stroke: {meme.strokeWidth}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    value={meme.strokeWidth}
                    onChange={e => updateMeme({ strokeWidth: parseInt(e.target.value) })}
                    className="w-full mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-xl">
                <span className="text-sm font-medium">Text Shadow</span>
                <button
                  onClick={() => updateMeme({ shadowEnabled: !meme.shadowEnabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${meme.shadowEnabled ? 'bg-brand-primary' : 'bg-border'}`}
                  role="switch"
                  aria-checked={meme.shadowEnabled}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${meme.shadowEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Move className="w-3.5 h-3.5" /> Position
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-text-muted">Top: {meme.topOffset}%</span>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={meme.topOffset}
                      onChange={e => updateMeme({ topOffset: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted">
                      Bottom: {meme.bottomOffset}%
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      value={meme.bottomOffset}
                      onChange={e => updateMeme({ bottomOffset: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleRandom}
                className="bg-surface-secondary hover:bg-border text-text-secondary p-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" /> Random
              </button>
              <button
                onClick={handleFavorite}
                className="bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-950/50 p-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer active:scale-95"
              >
                <Heart className="w-4 h-4" /> Save
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleDownload}
                className="bg-brand-primary hover:bg-brand-accent text-white font-bold p-3 rounded-xl shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-sm"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="bg-surface-secondary border border-border hover:border-brand-primary/30 text-text-secondary p-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-sm font-semibold"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="w-full bg-surface-secondary border border-border hover:border-brand-primary/30 text-text-secondary p-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-sm font-semibold"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute bottom-full left-0 right-0 mb-2 card-elevated p-2 space-y-1 z-20"
                    >
                      {[
                        {
                          name: 'Twitter/X',
                          url: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
                        },
                        {
                          name: 'Facebook',
                          url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
                        },
                        {
                          name: 'Reddit',
                          url: `https://www.reddit.com/submit?url=${shareUrl}&title=${shareText}`,
                        },
                        { name: 'WhatsApp', url: `https://wa.me/?text=${shareText}%20${shareUrl}` },
                      ].map(s => (
                        <a
                          key={s.name}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-2 text-xs font-medium rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer"
                        >
                          {s.name}
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border hover:border-brand-primary/40 p-3.5 rounded-xl text-text-muted hover:text-brand-primary transition-all flex items-center justify-center gap-2 text-sm font-medium cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Upload Your Own Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </motion.div>
        )}

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-elevated p-5 space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search memes across the web..."
                className="w-full bg-surface-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none"
              />
            </div>

            {activeSources.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-text-muted font-medium uppercase tracking-wide">
                  Powered by {activeSources.length} sources:
                </span>
                {activeSources.map(src => (
                  <span
                    key={src}
                    className="text-white text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: SOURCE_COLORS[src] || '#7c3aed' }}
                  >
                    {src}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSearchTerm('');
                      handleCategoryChange(cat.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-brand-primary text-white'
                        : 'bg-surface-secondary text-text-muted hover:text-text-secondary hover:bg-border'
                    }`}
                  >
                    <Icon className="w-3 h-3" /> {cat.name}
                  </button>
                );
              })}
            </div>

            {searchLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
                {getDisplayMemes().map(m => (
                  <button
                    key={m.id}
                    onClick={() => selectMeme(m)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                      meme.template?.id === m.id
                        ? 'border-brand-primary ring-2 ring-brand-primary/20'
                        : 'border-transparent hover:border-border-hover'
                    }`}
                  >
                    <img
                      src={m.url}
                      alt={m.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                      <span className="text-white text-[10px] font-semibold leading-tight line-clamp-2">
                        {m.name}
                      </span>
                    </div>
                    {'source' in m && (
                      <span
                        className="absolute top-1 right-1 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase"
                        style={{ backgroundColor: SOURCE_COLORS[m.source as string] || '#7c3aed' }}
                      >
                        {m.source as string}
                      </span>
                    )}
                  </button>
                ))}
                {getDisplayMemes().length === 0 && !searchLoading && (
                  <div className="col-span-3 text-center py-12 text-text-muted text-sm">
                    No memes found. Try a different search or category!
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Right Panel - Preview */}
      <div className="lg:col-span-8 flex flex-col items-center gap-6">
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg text-text-secondary">Preview</h3>
            {meme.template && (
              <span className="text-xs text-text-muted bg-surface-secondary px-3 py-1.5 rounded-lg truncate max-w-[200px]">
                {meme.template.name}
              </span>
            )}
          </div>

          <div
            ref={memeRef}
            className="relative bg-black rounded-2xl overflow-hidden shadow-2xl mx-auto"
            style={{ width: 'fit-content', maxWidth: '100%' }}
          >
            {meme.template && (
              <>
                <img
                  src={meme.template.url}
                  alt="Meme preview"
                  className="max-h-[60vh] w-auto object-contain block"
                  crossOrigin="anonymous"
                />
                {meme.topText && (
                  <h2
                    className="absolute left-1/2 -translate-x-1/2 font-black text-center uppercase whitespace-nowrap pointer-events-none z-10"
                    style={{
                      top: `${meme.topOffset}%`,
                      fontSize: `${meme.fontSize}px`,
                      color: meme.textColor,
                      fontFamily: meme.fontFamily,
                      WebkitTextStroke:
                        meme.strokeWidth > 0 ? `${meme.strokeWidth}px ${meme.strokeColor}` : 'none',
                      textShadow: meme.shadowEnabled
                        ? `0 0 8px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.6)`
                        : 'none',
                    }}
                  >
                    {meme.topText}
                  </h2>
                )}
                {meme.bottomText && (
                  <h2
                    className="absolute left-1/2 -translate-x-1/2 font-black text-center uppercase whitespace-nowrap pointer-events-none z-10"
                    style={{
                      bottom: `${meme.bottomOffset}%`,
                      fontSize: `${meme.fontSize}px`,
                      color: meme.textColor,
                      fontFamily: meme.fontFamily,
                      WebkitTextStroke:
                        meme.strokeWidth > 0 ? `${meme.strokeWidth}px ${meme.strokeColor}` : 'none',
                      textShadow: meme.shadowEnabled
                        ? `0 0 8px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.6)`
                        : 'none',
                    }}
                  >
                    {meme.bottomText}
                  </h2>
                )}
              </>
            )}
          </div>
        </div>

        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="w-full space-y-3">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <Heart className="w-5 h-5 text-pink-500 fill-current" />
              <h3 className="font-display font-bold text-lg">My Favorites</h3>
              <span className="text-xs text-text-muted bg-surface-secondary px-2 py-1 rounded-md">
                {favorites.length}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-text-muted transition-transform ${showFavorites ? 'rotate-180' : ''}`}
              />
            </button>
            <AnimatePresence>
              {showFavorites && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {favorites.map(f => (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group relative card-elevated p-2 cursor-pointer"
                      >
                        <img
                          src={f.image}
                          alt="Favorite meme"
                          className="w-full aspect-square object-cover rounded-xl"
                          loading="lazy"
                        />
                        {(f.topText || f.bottomText) && (
                          <div className="mt-1.5 px-1">
                            <p className="text-[10px] text-text-muted truncate">
                              {f.topText || f.bottomText}
                            </p>
                          </div>
                        )}
                        <div className="absolute inset-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              selectMeme({
                                id: f.id,
                                name: 'Favorite',
                                url: f.image,
                                width: 500,
                                height: 500,
                              });
                            }}
                            className="bg-white/20 hover:bg-brand-primary/80 p-2 rounded-full text-white transition-colors cursor-pointer"
                            aria-label="Use this meme"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              removeFavorite(f.id);
                              addToast('Removed from favorites', 'info');
                            }}
                            className="bg-white/20 hover:bg-red-500/80 p-2 rounded-full text-white transition-colors cursor-pointer"
                            aria-label="Remove favorite"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
