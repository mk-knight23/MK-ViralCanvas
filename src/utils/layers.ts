import type { TextLayer } from '@/types/project';
import { MAX_LAYERS, createTextLayer, generateId } from '@/types/project';

export type LayerDirection = 'up' | 'down';

/**
 * Pure, immutable operations on text-layer arrays.
 * Every function returns a new array and never mutates its input.
 */

export function addLayer(
  layers: readonly TextLayer[],
  overrides: Partial<TextLayer> = {}
): TextLayer[] {
  if (layers.length >= MAX_LAYERS) return [...layers];
  return [...layers, createTextLayer(overrides)];
}

export function removeLayer(layers: readonly TextLayer[], id: string): TextLayer[] {
  return layers.filter(layer => layer.id !== id);
}

export function updateLayer(
  layers: readonly TextLayer[],
  id: string,
  updates: Partial<Omit<TextLayer, 'id'>>
): TextLayer[] {
  return layers.map(layer => (layer.id === id ? { ...layer, ...updates, id: layer.id } : layer));
}

/**
 * Moves a layer one step towards the start ('up') or the end ('down') of the list.
 * No-op (returns a copy) when the layer is missing or already at the boundary.
 */
export function moveLayer(
  layers: readonly TextLayer[],
  id: string,
  direction: LayerDirection
): TextLayer[] {
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
export function duplicateLayer(layers: readonly TextLayer[], id: string): TextLayer[] {
  const index = layers.findIndex(layer => layer.id === id);
  if (index === -1 || layers.length >= MAX_LAYERS) return [...layers];
  const source = layers[index];
  const copy: TextLayer = {
    ...source,
    id: generateId('layer'),
    y: Math.min(100, source.y + 4),
    locked: false,
  };
  const next = [...layers];
  next.splice(index + 1, 0, copy);
  return next;
}

export function findLayer(layers: readonly TextLayer[], id: string | null): TextLayer | undefined {
  if (id === null) return undefined;
  return layers.find(layer => layer.id === id);
}
