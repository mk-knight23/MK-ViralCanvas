import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Heart, Palette, RefreshCw, Redo2, Type, Undo2, Upload } from 'lucide-react';
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
import type { LayerUpdates } from '@/utils/layers';
import type { SearchMeme } from '@/utils/api';
import { TemplateBrowser } from './browse/TemplateBrowser';
import { ArtboardPicker } from './editor/ArtboardPicker';
import { CanvasStage } from './editor/CanvasStage';
import { DashboardStrip } from './editor/DashboardStrip';
import { ExportControls } from './editor/ExportControls';
import { FavoritesGallery } from './editor/FavoritesGallery';
import { LayersPanel } from './editor/LayersPanel';
import { LayerStylePanel } from './editor/LayerStylePanel';
import { ProjectsMenu } from './editor/ProjectsMenu';
import { ShareMenu } from './editor/ShareMenu';

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
  const [activeTab, setActiveTab] = useState<'customize' | 'browse'>('customize');
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

  const updateSelectedLayer = (updates: LayerUpdates) => {
    if (selectedLayer) {
      updateLayer(selectedLayer.id, updates);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-primary" />
        <p className="text-text-muted text-sm">Loading meme templates...</p>
      </div>
    );
  }

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

              <LayerStylePanel layer={selectedLayer} onUpdate={updateSelectedLayer} />

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

              <ShareMenu />

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

          <FavoritesGallery
            favorites={favorites}
            onUse={f =>
              selectMeme({ id: f.id, name: 'Favorite', url: f.image, width: 500, height: 500 })
            }
            onRemove={id => {
              removeFavorite(id);
              addToast('Removed from favorites', 'info');
            }}
          />
        </div>
      </div>
    </div>
  );
}
