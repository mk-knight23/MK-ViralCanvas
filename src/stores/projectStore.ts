import { create } from 'zustand';
import type { Artboard, Project, TextLayer } from '@/types/project';
import { createProject } from '@/types/project';
import type { MemeTemplate } from '@/types/meme';
import {
  addLayer as addLayerOp,
  duplicateLayer as duplicateLayerOp,
  moveLayer as moveLayerOp,
  removeLayer as removeLayerOp,
  updateLayer as updateLayerOp,
  type LayerDirection,
  type LayerUpdates,
} from '@/utils/layers';

const HISTORY_LIMIT = 50;
const COMMIT_DEBOUNCE_MS = 300;

interface ProjectStore {
  project: Project;
  selectedLayerId: string | null;
  history: Project[];
  historyIndex: number;

  /** Replaces the current project and resets history (open/import/new). */
  setProject: (project: Project) => void;
  renameProject: (name: string) => void;
  setTemplate: (template: MemeTemplate | null) => void;
  setArtboard: (artboard: Artboard) => void;

  addLayer: (overrides?: Partial<Omit<TextLayer, 'type'>>) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: LayerUpdates) => void;
  moveLayer: (id: string, direction: LayerDirection) => void;
  duplicateLayer: (id: string) => void;
  selectLayer: (id: string | null) => void;

  /** Pushes the current project onto the history stack (call debounced from UI). */
  commit: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

let commitTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleCommit(commit: () => void): void {
  if (commitTimer !== null) clearTimeout(commitTimer);
  commitTimer = setTimeout(() => {
    commitTimer = null;
    commit();
  }, COMMIT_DEBOUNCE_MS);
}

function cancelScheduledCommit(): void {
  if (commitTimer !== null) {
    clearTimeout(commitTimer);
    commitTimer = null;
  }
}

export const useProjectStore = create<ProjectStore>()((set, get) => {
  const initial = createProject();

  const applyProjectChange = (updates: Partial<Project>): void => {
    set(state => ({
      project: { ...state.project, ...updates, updatedAt: new Date().toISOString() },
    }));
    scheduleCommit(get().commit);
  };

  return {
    project: initial,
    selectedLayerId: initial.layers[0]?.id ?? null,
    history: [initial],
    historyIndex: 0,

    setProject: project => {
      cancelScheduledCommit();
      set({
        project,
        selectedLayerId: project.layers[0]?.id ?? null,
        history: [project],
        historyIndex: 0,
      });
    },

    renameProject: name => applyProjectChange({ name }),
    setTemplate: template => applyProjectChange({ template }),
    setArtboard: artboard => applyProjectChange({ artboard }),

    addLayer: overrides => {
      const before = get().project.layers;
      const layers = addLayerOp(before, overrides);
      applyProjectChange({ layers });
      if (layers.length > before.length) {
        set({ selectedLayerId: layers[layers.length - 1].id });
      }
    },

    removeLayer: id => {
      const layers = removeLayerOp(get().project.layers, id);
      applyProjectChange({ layers });
      set(state => ({
        selectedLayerId:
          state.selectedLayerId === id ? (layers[0]?.id ?? null) : state.selectedLayerId,
      }));
    },

    updateLayer: (id, updates) => {
      applyProjectChange({ layers: updateLayerOp(get().project.layers, id, updates) });
    },

    moveLayer: (id, direction) => {
      applyProjectChange({ layers: moveLayerOp(get().project.layers, id, direction) });
    },

    duplicateLayer: id => {
      const before = get().project.layers;
      const layers = duplicateLayerOp(before, id);
      applyProjectChange({ layers });
      if (layers.length > before.length) {
        const index = before.findIndex(layer => layer.id === id);
        set({ selectedLayerId: layers[index + 1]?.id ?? null });
      }
    },

    selectLayer: id => set({ selectedLayerId: id }),

    commit: () => {
      const { project, history, historyIndex } = get();
      if (history[historyIndex] === project) return;
      const trimmed = history.slice(0, historyIndex + 1);
      trimmed.push(project);
      const overflow = trimmed.length - HISTORY_LIMIT;
      const bounded = overflow > 0 ? trimmed.slice(overflow) : trimmed;
      set({ history: bounded, historyIndex: bounded.length - 1 });
    },

    undo: () => {
      cancelScheduledCommit();
      const { history, historyIndex, selectedLayerId } = get();
      if (historyIndex <= 0) return;
      const project = history[historyIndex - 1];
      set({
        project,
        historyIndex: historyIndex - 1,
        selectedLayerId: project.layers.some(l => l.id === selectedLayerId)
          ? selectedLayerId
          : (project.layers[0]?.id ?? null),
      });
    },

    redo: () => {
      cancelScheduledCommit();
      const { history, historyIndex, selectedLayerId } = get();
      if (historyIndex >= history.length - 1) return;
      const project = history[historyIndex + 1];
      set({
        project,
        historyIndex: historyIndex + 1,
        selectedLayerId: project.layers.some(l => l.id === selectedLayerId)
          ? selectedLayerId
          : (project.layers[0]?.id ?? null),
      });
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,
  };
});
