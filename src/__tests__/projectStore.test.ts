import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@/stores/projectStore';
import { createProject, createTextLayer, isTextLayer, type Project } from '@/types/project';

/** Layer arrays are Layer[] since schema v2; narrow for text-only assertions. */
function textAt(project: Project, index: number): string {
  const layer = project.layers[index];
  if (!layer || !isTextLayer(layer)) throw new Error('expected a text layer');
  return layer.text;
}

function resetStore() {
  useProjectStore.getState().setProject(
    createProject({
      id: 'test-project',
      name: 'Test',
      layers: [
        createTextLayer({ id: 'top', text: '', y: 10 }),
        createTextLayer({ id: 'bottom', text: '', y: 90 }),
      ],
    })
  );
}

beforeEach(resetStore);

describe('projectStore layers', () => {
  it('starts with the classic two default layers and selects the first', () => {
    const state = useProjectStore.getState();
    expect(state.project.layers).toHaveLength(2);
    expect(state.selectedLayerId).toBe('top');
  });

  it('addLayer appends and selects the new layer', () => {
    useProjectStore.getState().addLayer({ text: 'third' });
    const state = useProjectStore.getState();
    expect(state.project.layers).toHaveLength(3);
    expect(state.selectedLayerId).toBe(state.project.layers[2].id);
  });

  it('removeLayer drops the layer and moves selection to the first remaining layer', () => {
    useProjectStore.getState().selectLayer('top');
    useProjectStore.getState().removeLayer('top');
    const state = useProjectStore.getState();
    expect(state.project.layers.map(l => l.id)).toEqual(['bottom']);
    expect(state.selectedLayerId).toBe('bottom');
  });

  it('updateLayer changes properties immutably', () => {
    const before = useProjectStore.getState().project;
    useProjectStore.getState().updateLayer('top', { text: 'HELLO', rotation: 15 });
    const after = useProjectStore.getState().project;

    expect(textAt(after, 0)).toBe('HELLO');
    expect(after.layers[0].rotation).toBe(15);
    expect(textAt(before, 0)).toBe('');
    expect(after).not.toBe(before);
  });

  it('moveLayer reorders and duplicateLayer inserts a copy after the source', () => {
    useProjectStore.getState().moveLayer('bottom', 'up');
    expect(useProjectStore.getState().project.layers.map(l => l.id)).toEqual(['bottom', 'top']);

    useProjectStore.getState().duplicateLayer('bottom');
    const state = useProjectStore.getState();
    expect(state.project.layers).toHaveLength(3);
    expect(state.project.layers[0].id).toBe('bottom');
    expect(state.project.layers[1].id).not.toBe('bottom');
    expect(state.selectedLayerId).toBe(state.project.layers[1].id);
  });
});

describe('projectStore history', () => {
  it('undo and redo walk committed snapshots', () => {
    const store = useProjectStore.getState();
    store.updateLayer('top', { text: 'v1' });
    store.commit();
    useProjectStore.getState().updateLayer('top', { text: 'v2' });
    useProjectStore.getState().commit();

    expect(textAt(useProjectStore.getState().project, 0)).toBe('v2');
    expect(useProjectStore.getState().canUndo()).toBe(true);

    useProjectStore.getState().undo();
    expect(textAt(useProjectStore.getState().project, 0)).toBe('v1');

    useProjectStore.getState().undo();
    expect(textAt(useProjectStore.getState().project, 0)).toBe('');
    expect(useProjectStore.getState().canUndo()).toBe(false);

    useProjectStore.getState().redo();
    expect(textAt(useProjectStore.getState().project, 0)).toBe('v1');
    expect(useProjectStore.getState().canRedo()).toBe(true);
  });

  it('a new change after undo discards the redo tail', () => {
    const store = useProjectStore.getState();
    store.updateLayer('top', { text: 'first' });
    store.commit();
    useProjectStore.getState().undo();

    useProjectStore.getState().updateLayer('top', { text: 'branch' });
    useProjectStore.getState().commit();

    expect(useProjectStore.getState().canRedo()).toBe(false);
    expect(textAt(useProjectStore.getState().project, 0)).toBe('branch');
  });

  it('commit is a no-op when nothing changed', () => {
    const before = useProjectStore.getState().history.length;
    useProjectStore.getState().commit();
    expect(useProjectStore.getState().history.length).toBe(before);
  });

  it('setProject resets history', () => {
    const store = useProjectStore.getState();
    store.updateLayer('top', { text: 'x' });
    store.commit();
    useProjectStore.getState().setProject(createProject({ id: 'fresh' }));

    const state = useProjectStore.getState();
    expect(state.canUndo()).toBe(false);
    expect(state.canRedo()).toBe(false);
    expect(state.project.id).toBe('fresh');
  });
});
