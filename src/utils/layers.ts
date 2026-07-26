import type { Layer, TextLayer } from '@/types/project';
import { MAX_LAYERS, createTextLayer, generateId } from '@/types/project';

export type LayerDirection = 'up' | 'down';

/**
 * A partial update for a layer. Base fields (x, y, opacity, …) apply to any
 * layer type; the text-specific fields only ever reach text layers because
 * the style editor operates on the selected text layer.
 */
export type LayerUpdates = Partial<Omit<TextLayer, 'id' | 'type'>>;

/**
 * Pure, immutable operations on layer arrays.
 * Every function returns a new array and never mutates its input.
 */

export function addLayer(
  layers: readonly Layer[],
  overrides: Partial<Omit<TextLayer, 'type'>> = {}
): Layer[] {
  if (layers.length >= MAX_LAYERS) return [...layers];
  return [...layers, createTextLayer(overrides)];
}

export function removeLayer(layers: readonly Layer[], id: string): Layer[] {
  return layers.filter(layer => layer.id !== id);
}

export function updateLayer(layers: readonly Layer[], id: string, updates: LayerUpdates): Layer[] {
  return layers.map(layer => {
    if (layer.id !== id) return layer;
    // The discriminant and id always win over the patch, so the variant is
    // preserved; the cast re-narrows the merged object back to the union.
    return { ...layer, ...updates, id: layer.id, type: layer.type } as Layer;
  });
}

/**
 * Moves a layer one step towards the start ('up') or the end ('down') of the list.
 * No-op (returns a copy) when the layer is missing or already at the boundary.
 */
export function moveLayer(layers: readonly Layer[], id: string, direction: LayerDirection): Layer[] {
  const index = layers.findIndex(layer => layer.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= layers.length) return [...layers];
  const next = [...layers];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

/**
 * Inserts a copy of the layer directly after the original.
 * The copy gets a fresh id, is unlocked, and is nudged slightly so it is visible.
 */
export function duplicateLayer(layers: readonly Layer[], id: string): Layer[] {
  const index = layers.findIndex(layer => layer.id === id);
  if (index === -1 || layers.length >= MAX_LAYERS) return [...layers];
  const source = layers[index];
  const copy: Layer = {
    ...source,
    id: generateId('layer'),
    y: Math.min(100, source.y + 4),
    locked: false,
  };
  const next = [...layers];
  next.splice(index + 1, 0, copy);
  return next;
}

export function findLayer(layers: readonly Layer[], id: string | null): Layer | undefined {
  if (id === null) return undefined;
  return layers.find(layer => layer.id === id);
}
