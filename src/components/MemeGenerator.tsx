import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cat,
  ChevronDown,
  Clapperboard,
  Film,
  Flame,
  Gamepad2,
  Globe,
  Heart,
  ImageIcon,
  Laugh,
  Palette,
  RefreshCw,
  Redo2,
  Search,
  Share2,
  Skull,
  Sparkles,
  Trash2,
  TrendingUp,
  Trophy,
  Tv,
  Type,
  Undo2,
  Upload,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { useMemeStore } from '@/stores/memeStore';
import { useProjectStore } from '@/stores/projectStore';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toastStore';
import {
  getActiveSources,
  getCategoryMemes,
  getTemplates,
  getTrendingMemes,
  searchMemes,
} from '@/utils/api';
import { findLayer } from '@/utils/layers';
import {
  getLastProjectId,
  incrementExportCount,
  loadProject,
  saveProject,
  setLastProjectId,
} from '@/utils/projectStorage';
import type { MemeTemplate } from '@/types/meme';
import type { ExportFormat, ExportOptions } from '@/types/project';
import type { SearchMeme } from '@/utils/api';
import { ArtboardPicker } from './editor/ArtboardPicker';
import { CanvasStage } from './editor/CanvasStage';
import { DashboardStrip } from './editor/DashboardStrip';
import { ExportControls } from './editor/ExportControls';
import { LayersPanel } from './editor/LayersPanel';
import { ProjectsMenu } from './editor/ProjectsMenu';

const FONT_OPTIONS = [
  { value: "'Impact', 'Arial Black', sans-serif", label: 'Impact' },
  { value: "'Comic Sans MS', cursive", label: 'Comic Sans' },
  { value: "'Arial', sans-serif", label: 'Arial' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'Courier New', monospace", label: 'Courier' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet' },
];

const WEIGHT_OPTIONS = [
  { value: 400, label: 'Regular' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 900, label: 'Black' },
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

const QUICK_COLORS = [
  '#ffffff',
  '#000000',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#ff6b00',
  '#ff00ff',
];

const AUTOSAVE_DEBOUNCE_MS = 800;
const EXPORT_PAINT_DELAY_MS = 60;

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

function extensionForBlobType(type: string): string {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/jpeg') return 'jpg';
  return 'png';
}

export function MemeGenerator() {
  const { templates, setTemplates, addFavorite, favorites, removeFavorite } = useMemeStore();
  const stats = useStatsStore();
  const { addToast } = useToastStore();

  const project = useProjectStore(s => s.project);
  const selectedLayerId = useProjectStore(s => s.selectedLayerId);
  const setProject = useProjectStore(s => s.setProject);
  const setTemplate = useProjectStore(s => s.setTemplate);
  const updateLayer = useProjectStore(s => s.updateLayer);
  const undo = useProjectStore(s => s.undo);
  const redo = useProjectStore(s => s.redo);
  const canUndo = useProjectStore(s => s.historyIndex > 0);
  const canRedo = useProjectStore(s => s.historyIndex < s.history.length - 1);

  const selectedLayer = findLayer(project.layers, selectedLayerId ?? null);

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('templates');
  const [categoryMemes, setCategoryMemes] = useState<SearchMeme[]>([]);
  const [showFavorites, setShowFavorites] = useState(true);
  const [activeTab, setActiveTab] = useState<'customize' | 'browse'>('customize');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'png',
    quality: 0.92,
    multiplier: 1,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveWarnedRef = useRef(false);

  const bumpDashboard = useCallback(() => setDashboardKey(key => key + 1), []);

  useEffect(() => {
    const interval = setInterval(() => stats.addTimeSpent(1), 1000);
    return () => clearInterval(interval);
  }, [stats]);

  const handlersRef = useRef({
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

  // Initial load: restore the last project, then fetch templates for browsing.
  useEffect(() => {
    const lastId = getLastProjectId();
    const saved = lastId ? loadProject(lastId) : null;
    if (saved) setProject(saved);

    const load = async () => {
      try {
        const tmpl = await getTemplates();
        if (tmpl.length > 0) {
          setTemplates(tmpl);
          const current = useProjectStore.getState().project;
          if (!current.template) {
            setProject({ ...current, template: tmpl[0] });
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTemplates, setProject]);

  // Debounced autosave of the current project.
  useEffect(() => {
    const isPristine = !project.template && project.layers.every(layer => layer.text.length === 0);
    if (isPristine) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const current = useProjectStore.getState().project;
      if (saveProject(current)) {
        setLastProjectId(current.id);
        autosaveWarnedRef.current = false;
        bumpDashboard();
      } else if (!autosaveWarnedRef.current) {
        autosaveWarnedRef.current = true;
        addToast('Autosave failed — browser storage may be full', 'error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [project, addToast, bumpDashboard]);

  const handleCategoryChange = async (catId: string) => {
    setActiveCategory(catId);
    if (catId === 'templates') {
      setCategoryMemes([]);
      return;
    }
    setSearchLoading(true);
    try {
      const results = catId === 'trending' ? await getTrendingMemes() : await getCategoryMemes(catId);
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
    setTemplate(random);
    stats.recordMemeCreated();
    addToast('Random template loaded!', 'success');
  };

  const captureStage = async (scale: number): Promise<HTMLCanvasElement | null> => {
    const el = stageRef.current;
    if (!el || el.clientWidth === 0) return null;
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, EXPORT_PAINT_DELAY_MS));
      return await html2canvas(el, { useCORS: true, scale, backgroundColor: '#000000' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!project.template) {
      addToast('Pick a template or upload an image first', 'info');
      return;
    }
    const el = stageRef.current;
    if (!el || el.clientWidth === 0) return;
    const { format, quality, multiplier } = exportOptions;
    try {
      const scale = (project.artboard.width * multiplier) / el.clientWidth;
      const canvas = await captureStage(scale);
      if (!canvas) return;
      canvas.toBlob(
        blob => {
          if (!blob) {
            addToast('Export failed', 'error');
            return;
          }
          const requestedMime = MIME_BY_FORMAT[format];
          const extension = extensionForBlobType(blob.type);
          if (blob.type !== requestedMime) {
            addToast(
              `${format.toUpperCase()} not supported by this browser — saved as ${extension.toUpperCase()}`,
              'info'
            );
          }
          saveAs(blob, `viralcanvas-${Date.now()}.${extension}`);
          incrementExportCount();
          stats.recordDownload();
          bumpDashboard();
          addToast('Image exported!', 'success');
        },
        MIME_BY_FORMAT[format],
        format === 'png' ? undefined : quality
      );
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const handleCopyToClipboard = async () => {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      addToast('Clipboard not supported. Use download instead.', 'info');
      return;
    }
    const el = stageRef.current;
    if (!el || el.clientWidth === 0 || !project.template) return;
    try {
      const scale = project.artboard.width / el.clientWidth;
      const canvas = await captureStage(scale);
      if (!canvas) return;
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

  const handleFavorite = () => {
    if (!project.template) return;
    addFavorite({
      id: Math.random().toString(36).substring(2, 9),
      image: project.template.url,
      topText: project.layers[0]?.text ?? '',
      bottomText: project.layers[1]?.text ?? '',
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
        setTemplate({
          id: `custom-${Date.now()}`,
          name: file.name,
          url,
          width: img.width,
          height: img.height,
          box_count: 2,
        });
        addToast('Image uploaded!', 'success');
        stats.recordMemeCreated();
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const selectMeme = (m: MemeTemplate | SearchMeme) => {
    setTemplate({
      id: m.id,
      name: m.name,
      url: m.url,
      width: m.width,
      height: m.height,
      box_count: 2,
    });
    setActiveTab('customize');
    stats.recordMemeCreated();
  };

  const openProject = (id: string) => {
    const loaded = loadProject(id);
    if (!loaded) {
      addToast('Could not open project', 'error');
      return;
    }
    setProject(loaded);
    setLastProjectId(loaded.id);
    addToast(`Opened "${loaded.name}"`, 'success');
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

  const updateSelected = (updates: Parameters<typeof updateLayer>[1]) => {
    if (selectedLayer && !selectedLayer.locked) {
      updateLayer(selectedLayer.id, updates);
    }
  };

  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent('Check out this meme I made on MK ViralCanvas!');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-primary" />
        <p className="text-text-muted text-sm">Loading meme templates...</p>
      </div>
    );
  }

  const propertiesDisabled = !selectedLayer || selectedLayer.locked;

  return (
    <div className="space-y-4">
      <ProjectsMenu onProjectsChanged={bumpDashboard} />
      <DashboardStrip refreshKey={dashboardKey} onOpenProject={openProject} />

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
                    disabled={!canUndo}
                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Undo"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Redo"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <LayersPanel />

              {/* Selected-layer properties */}
              <div className={`space-y-3 ${propertiesDisabled ? 'opacity-60' : ''}`}>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Layer Style {selectedLayer?.locked ? '(locked)' : ''}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-text-muted">Font</span>
                    <select
                      value={selectedLayer?.fontFamily ?? FONT_OPTIONS[0].value}
                      disabled={propertiesDisabled}
                      onChange={e => updateSelected({ fontFamily: e.target.value })}
                      className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none cursor-pointer disabled:cursor-not-allowed"
                    >
                      {FONT_OPTIONS.map(f => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted">Weight</span>
                    <select
                      value={selectedLayer?.fontWeight ?? 900}
                      disabled={propertiesDisabled}
                      onChange={e => updateSelected({ fontWeight: Number(e.target.value) })}
                      className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm outline-none cursor-pointer disabled:cursor-not-allowed"
                    >
                      {WEIGHT_OPTIONS.map(w => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-text-muted">
                      Size: {selectedLayer?.fontSize ?? 0}px
                    </span>
                    <input
                      type="range"
                      min="16"
                      max="300"
                      value={selectedLayer?.fontSize ?? 80}
                      disabled={propertiesDisabled}
                      onChange={e => updateSelected({ fontSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted">
                      Rotation: {selectedLayer?.rotation ?? 0}°
                    </span>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={selectedLayer?.rotation ?? 0}
                      disabled={propertiesDisabled}
                      onChange={e => updateSelected({ rotation: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-text-muted block mb-1">Text Color</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {QUICK_COLORS.map(c => (
                      <button
                        key={c}
                        disabled={propertiesDisabled}
                        onClick={() => updateSelected({ color: c })}
                        className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer disabled:cursor-not-allowed ${
                          selectedLayer?.color === c
                            ? 'border-brand-primary scale-110'
                            : 'border-border hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                    <input
                      type="color"
                      value={selectedLayer?.color ?? '#ffffff'}
                      disabled={propertiesDisabled}
                      onChange={e => updateSelected({ color: e.target.value })}
                      className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent disabled:cursor-not-allowed"
                      aria-label="Custom text color"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-text-muted">Stroke Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedLayer?.strokeColor ?? '#000000'}
                        disabled={propertiesDisabled}
                        onChange={e => updateSelected({ strokeColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent disabled:cursor-not-allowed"
                        aria-label="Stroke color"
                      />
                      <span className="text-xs text-text-muted">
                        {selectedLayer?.strokeColor ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted">
                      Stroke: {selectedLayer?.strokeWidth ?? 0}px
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={selectedLayer?.strokeWidth ?? 0}
                      disabled={propertiesDisabled}
                      onChange={e => updateSelected({ strokeWidth: parseInt(e.target.value) })}
                      className="w-full mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-text-muted">
                      Opacity: {Math.round((selectedLayer?.opacity ?? 1) * 100)}%
                    </span>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={selectedLayer?.opacity ?? 1}
                      disabled={propertiesDisabled}
                      onChange={e => updateSelected({ opacity: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-end justify-between pb-1">
                    <span className="text-[10px] text-text-muted">Shadow</span>
                    <button
                      onClick={() => updateSelected({ shadowEnabled: !selectedLayer?.shadowEnabled })}
                      disabled={propertiesDisabled}
                      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
                        selectedLayer?.shadowEnabled ? 'bg-brand-primary' : 'bg-border'
                      }`}
                      role="switch"
                      aria-checked={selectedLayer?.shadowEnabled ?? false}
                      aria-label="Toggle text shadow"
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                          selectedLayer?.shadowEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-text-muted">
                      X: {Math.round(selectedLayer?.x ?? 50)}%
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedLayer?.x ?? 50}
                      disabled={propertiesDisabled}
                      onChange={e => updateSelected({ x: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted">
                      Y: {Math.round(selectedLayer?.y ?? 50)}%
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedLayer?.y ?? 50}
                      disabled={propertiesDisabled}
                      onChange={e => updateSelected({ y: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-text-muted">
                  Tip: drag text directly on the canvas to reposition it.
                </p>
              </div>

              <ArtboardPicker />

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

              <ExportControls
                options={exportOptions}
                onOptionsChange={setExportOptions}
                onDownload={handleDownload}
                onCopy={handleCopyToClipboard}
                isExporting={isExporting}
              />

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
                        {
                          name: 'WhatsApp',
                          url: `https://wa.me/?text=${shareText}%20${shareUrl}`,
                        },
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
                        project.template?.id === m.id
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted bg-surface-secondary px-3 py-1.5 rounded-lg">
                  {project.artboard.width}×{project.artboard.height}
                </span>
                {project.template && (
                  <span className="text-xs text-text-muted bg-surface-secondary px-3 py-1.5 rounded-lg truncate max-w-[200px]">
                    {project.template.name}
                  </span>
                )}
              </div>
            </div>

            <CanvasStage stageRef={stageRef} hideChrome={isExporting} />
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
    </div>
  );
}
