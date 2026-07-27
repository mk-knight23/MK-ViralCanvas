import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Globe,
  Heart,
  ImageIcon,
  Palette,
  RefreshCw,
  Redo2,
  Share2,
  Trash2,
  Type,
  Undo2,
  Upload,
} from 'lucide-react';
import { useMemeStore } from '@/stores/memeStore';
import { useProjectStore } from '@/stores/projectStore';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toastStore';
import { getTemplates } from '@/utils/api';
import { findLayer } from '@/utils/layers';
import { isTextLayer } from '@/types/project';
import { useAutosave } from '@/hooks/useAutosave';
import { useMemeExport } from '@/hooks/useMemeExport';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';
import { getLastProjectId, loadProject, setLastProjectId } from '@/utils/projectStorage';
import type { MemeTemplate } from '@/types/meme';
import type { ExportOptions } from '@/types/project';
import type { SearchMeme } from '@/utils/api';
import { TemplateBrowser } from './browse/TemplateBrowser';
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

export function MemeGenerator() {
  const { templates, setTemplates, addFavorite, favorites, removeFavorite } = useMemeStore();
  // Narrow action selectors: zustand actions are stable references, so
  // MemeGenerator never re-renders on stats changes (incl. the 1s ticker).
  const recordMemeCreated = useStatsStore(s => s.recordMemeCreated);
  const recordFavorite = useStatsStore(s => s.addFavorite);
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

  const foundLayer = findLayer(project.layers, selectedLayerId ?? null);
  // The style panel edits text properties, so it only operates on text layers.
  const selectedLayer = foundLayer && isTextLayer(foundLayer) ? foundLayer : undefined;

  const [loading, setLoading] = useState(true);
  const [showFavorites, setShowFavorites] = useState(true);
  const [activeTab, setActiveTab] = useState<'customize' | 'browse'>('customize');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'png',
    quality: 0.92,
    multiplier: 1,
  });
  const [dashboardKey, setDashboardKey] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bumpDashboard = useCallback(() => setDashboardKey(key => key + 1), []);

  useAutosave(bumpDashboard);
  useUndoRedoShortcuts();

  const { isExporting, downloadImage, copyToClipboard } = useMemeExport({
    stageRef,
    options: exportOptions,
    onExported: bumpDashboard,
  });

  // Time-spent ticker: reads the action off the store imperatively so the
  // interval is created once and no component subscribes to the tick.
  useEffect(() => {
    const interval = setInterval(() => useStatsStore.getState().addTimeSpent(1), 1000);
    return () => clearInterval(interval);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTemplates, setProject]);

  const handleRandom = () => {
    if (templates.length === 0) return;
    const random = templates[Math.floor(Math.random() * templates.length)];
    setTemplate(random);
    recordMemeCreated();
    addToast('Random template loaded!', 'success');
  };

  const handleFavorite = () => {
    if (!project.template) return;
    const [first, second] = project.layers;
    addFavorite({
      id: Math.random().toString(36).substring(2, 9),
      image: project.template.url,
      topText: first && isTextLayer(first) ? first.text : '',
      bottomText: second && isTextLayer(second) ? second.text : '',
      date: new Date().toISOString(),
    });
    recordFavorite();
    addToast('Saved to favorites!', 'success');
  };

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
        recordMemeCreated();
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
    recordMemeCreated();
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
                      aria-label="Font family"
                      className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none cursor-pointer disabled:cursor-not-allowed"
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
                      aria-label="Font weight"
                      className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none cursor-pointer disabled:cursor-not-allowed"
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
                      aria-label="Font size"
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
                      aria-label="Text rotation"
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
                      aria-label="Stroke width"
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
                      aria-label="Text opacity"
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-end justify-between pb-1">
                    <span className="text-[10px] text-text-muted">Shadow</span>
                    <button
                      onClick={() =>
                        updateSelected({ shadowEnabled: !selectedLayer?.shadowEnabled })
                      }
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
                      aria-label="Horizontal position"
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
                      aria-label="Vertical position"
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
                onDownload={downloadImage}
                onCopy={copyToClipboard}
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
            <TemplateBrowser
              templates={templates}
              selectedTemplateId={project.template?.id}
              onSelect={selectMeme}
            />
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
                          <div className="absolute inset-2 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
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
