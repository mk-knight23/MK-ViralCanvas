import type { RasterizeOptions, StageRasterizer } from './types';

/** Gives the browser one frame to settle before capture (fonts, images). */
const RASTERIZE_PAINT_DELAY_MS = 60;

/**
 * The current rasterizer backend: captures the painted preview DOM with
 * html2canvas. The library (~49kB gzip) is imported lazily so it never
 * enters the startup bundle — it loads on the first export/copy only.
 */
export const html2canvasRasterizer: StageRasterizer = {
  async rasterize(stage: HTMLElement, options: RasterizeOptions): Promise<HTMLCanvasElement> {
    const { default: html2canvas } = await import('html2canvas');
    await new Promise(resolve => setTimeout(resolve, RASTERIZE_PAINT_DELAY_MS));
    return html2canvas(stage, {
      useCORS: true,
      scale: options.scale,
      backgroundColor: options.backgroundColor ?? '#000000',
    });
  },
};
