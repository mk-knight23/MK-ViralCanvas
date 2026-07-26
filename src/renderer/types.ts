/**
 * Shared renderer contracts.
 *
 * The DOM preview (CanvasStage) and the export rasterizer historically each
 * had their own idea of how a layer turns into pixels. Both now consume the
 * same layer-render logic: `buildLayerRenderModel` computes the visual
 * properties for a layer, the preview paints them as DOM styles, and a
 * `StageRasterizer` turns that same painted stage into a bitmap. A future
 * Canvas2D engine can implement `StageRasterizer` (and consume the same
 * render models) without touching preview or export call sites.
 */

interface BaseRenderModel {
  layerId: string;
  /** CSS `left` as a percentage of the stage width (layer center). */
  leftPercent: number;
  /** CSS `top` as a percentage of the stage height (layer center). */
  topPercent: number;
  /** Centering + rotation transform shared by preview and export. */
  transform: string;
  opacity: number;
  /** False when the layer is locked and must not respond to dragging. */
  interactive: boolean;
}

export interface TextRenderModel extends BaseRenderModel {
  kind: 'text';
  text: string;
  /** Already scaled from artboard pixels to stage pixels. */
  fontSizePx: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  /** Present only when the layer has a visible stroke. */
  webkitTextStroke?: string;
  /** Present only when the layer shadow is enabled. */
  textShadow?: string;
}

export interface ImageRenderModel extends BaseRenderModel {
  kind: 'image';
  url: string;
  widthPercent: number;
  heightPercent: number;
}

export interface ShapeRenderModel extends BaseRenderModel {
  kind: 'shape';
  widthPercent: number;
  heightPercent: number;
  fill: string;
  /** '50%' for ellipses; undefined for rectangles. */
  borderRadius?: string;
  /** Present only when the shape has a visible stroke. */
  border?: string;
}

export type LayerRenderModel = TextRenderModel | ImageRenderModel | ShapeRenderModel;

export interface RasterizeOptions {
  /** Ratio between the desired output resolution and the stage size. */
  scale: number;
  backgroundColor?: string;
}

/** Renders the painted visual state of a project stage into a bitmap. */
export interface StageRasterizer {
  rasterize(stage: HTMLElement, options: RasterizeOptions): Promise<HTMLCanvasElement>;
}
