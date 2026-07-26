import type { Layer } from '@/types/project';
import type { LayerRenderModel } from './types';

/** The classic meme text drop shadow, shared by preview and export. */
export const MEME_TEXT_SHADOW = '0 0 8px rgba(0,0,0,0.8), 2px 2px 4px rgba(0,0,0,0.6)';

function buildTransform(rotation: number): string {
  return `translate(-50%, -50%) rotate(${rotation}deg)`;
}

/**
 * Computes the visual properties of a layer at a given preview scale.
 * This is the single source of layer-render logic: the DOM preview applies
 * the result as inline styles, and exports rasterize that same painted DOM,
 * so both surfaces always agree on how a layer looks.
 *
 * Returns null when the layer should not be painted at all (hidden layers,
 * text layers with no content).
 */
export function buildLayerRenderModel(layer: Layer, scale: number): LayerRenderModel | null {
  if (layer.hidden) return null;

  const base = {
    layerId: layer.id,
    leftPercent: layer.x,
    topPercent: layer.y,
    transform: buildTransform(layer.rotation),
    opacity: layer.opacity,
    interactive: !layer.locked,
  };

  switch (layer.type) {
    case 'text': {
      if (layer.text.length === 0) return null;
      return {
        ...base,
        kind: 'text',
        text: layer.text,
        fontSizePx: layer.fontSize * scale,
        fontFamily: layer.fontFamily,
        fontWeight: layer.fontWeight,
        color: layer.color,
        webkitTextStroke:
          layer.strokeWidth > 0
            ? `${layer.strokeWidth * scale}px ${layer.strokeColor}`
            : undefined,
        textShadow: layer.shadowEnabled ? MEME_TEXT_SHADOW : undefined,
      };
    }
    case 'image':
      return {
        ...base,
        kind: 'image',
        url: layer.url,
        widthPercent: layer.width,
        heightPercent: layer.height,
      };
    case 'shape':
      return {
        ...base,
        kind: 'shape',
        widthPercent: layer.width,
        heightPercent: layer.height,
        fill: layer.fill,
        borderRadius: layer.shape === 'ellipse' ? '50%' : undefined,
        border:
          layer.strokeWidth > 0
            ? `${layer.strokeWidth * scale}px solid ${layer.strokeColor}`
            : undefined,
      };
  }
}
