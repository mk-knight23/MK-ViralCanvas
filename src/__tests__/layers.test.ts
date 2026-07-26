import { describe, it, expect } from 'vitest';
import {
  addLayer,
  duplicateLayer,
  findLayer,
  moveLayer,
  removeLayer,
  updateLayer,
} from '@/utils/layers';
import {
  MAX_LAYERS,
  createTextLayer,
  isTextLayer,
  type Layer,
  type TextLayer,
} from '@/types/project';

function makeLayers(): TextLayer[] {
  return [
    createTextLayer({ id: 'a', text: 'top', y: 10 }),
    createTextLayer({ id: 'b', text: 'middle', y: 50 }),
    createTextLayer({ id: 'c', text: 'bottom', y: 90 }),
  ];
}

/** Layer arrays are Layer[] since schema v2; narrow for text-only assertions. */
function asTextLayer(layer: Layer | undefined): TextLayer {
  if (!layer || !isTextLayer(layer)) throw new Error('expected a text layer');
  return layer;
}

describe('addLayer', () => {
  it('appends a new layer with a unique id without mutating the input', () => {
    const layers = makeLayers();
    const result = addLayer(layers, { text: 'new' });

    expect(result).toHaveLength(4);
    expect(asTextLayer(result[3]).text).toBe('new');
    expect(new Set(result.map(l => l.id)).size).toBe(4);
    expect(layers).toHaveLength(3);
  });

  it('does not exceed the layer limit', () => {
    let layers: Layer[] = [];
    for (let i = 0; i < MAX_LAYERS + 5; i += 1) {
      layers = addLayer(layers);
    }
    expect(layers).toHaveLength(MAX_LAYERS);
  });
});

describe('removeLayer', () => {
  it('removes the matching layer only', () => {
    const layers = makeLayers();
    const result = removeLayer(layers, 'b');

    expect(result.map(l => l.id)).toEqual(['a', 'c']);
    expect(layers).toHaveLength(3);
  });

  it('is a no-op for unknown ids', () => {
    const layers = makeLayers();
    expect(removeLayer(layers, 'nope')).toHaveLength(3);
  });
});

describe('updateLayer', () => {
  it('updates the target layer immutably and preserves its id', () => {
    const layers = makeLayers();
    const result = updateLayer(layers, 'a', { text: 'changed', fontSize: 120 });

    expect(asTextLayer(result[0]).text).toBe('changed');
    expect(asTextLayer(result[0]).fontSize).toBe(120);
    expect(result[0].id).toBe('a');
    expect(layers[0].text).toBe('top');
    expect(result[1]).toBe(layers[1]);
  });
});

describe('moveLayer', () => {
  it('moves a layer up', () => {
    const result = moveLayer(makeLayers(), 'b', 'up');
    expect(result.map(l => l.id)).toEqual(['b', 'a', 'c']);
  });

  it('moves a layer down', () => {
    const result = moveLayer(makeLayers(), 'b', 'down');
    expect(result.map(l => l.id)).toEqual(['a', 'c', 'b']);
  });

  it('is a no-op at the boundaries', () => {
    expect(moveLayer(makeLayers(), 'a', 'up').map(l => l.id)).toEqual(['a', 'b', 'c']);
    expect(moveLayer(makeLayers(), 'c', 'down').map(l => l.id)).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op for unknown ids', () => {
    expect(moveLayer(makeLayers(), 'zzz', 'up').map(l => l.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('duplicateLayer', () => {
  it('inserts an unlocked copy with a fresh id directly after the original', () => {
    const layers = updateLayer(makeLayers(), 'b', { locked: true });
    const result = duplicateLayer(layers, 'b');

    expect(result).toHaveLength(4);
    const copy = result[2];
    expect(copy.id).not.toBe('b');
    expect(asTextLayer(copy).text).toBe('middle');
    expect(copy.locked).toBe(false);
    expect(result.map(l => l.id).slice(0, 2)).toEqual(['a', 'b']);
    expect(result[3].id).toBe('c');
  });

  it('is a no-op for unknown ids', () => {
    expect(duplicateLayer(makeLayers(), 'zzz')).toHaveLength(3);
  });
});

describe('findLayer', () => {
  it('finds by id and returns undefined for null', () => {
    const layers = makeLayers();
    expect(asTextLayer(findLayer(layers, 'c')).text).toBe('bottom');
    expect(findLayer(layers, null)).toBeUndefined();
    expect(findLayer(layers, 'missing')).toBeUndefined();
  });
});
