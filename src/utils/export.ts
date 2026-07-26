import type { ExportFormat } from '@/types/project';
import type { StageRasterizer } from '@/renderer/types';
import { html2canvasRasterizer } from '@/renderer/html2canvasRasterizer';

/**
 * Export pipeline: turns the painted stage into a downloadable/copyable
 * image blob. Pure business logic — no React, no toasts, no store access —
 * so the whole path is unit-testable with a fake rasterizer.
 */

export const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function extensionForBlobType(type: string): string {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/jpeg') return 'jpg';
  return 'png';
}

export function exportFileName(extension: string, timestamp: number = Date.now()): string {
  return `viralcanvas-${timestamp}.${extension}`;
}

/** Promisified canvas.toBlob; PNG ignores the quality parameter. */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number
): Promise<Blob | null> {
  return new Promise(resolve => {
    canvas.toBlob(
      blob => resolve(blob),
      MIME_BY_FORMAT[format],
      format === 'png' ? undefined : quality
    );
  });
}

export interface StageExportOptions {
  format: ExportFormat;
  /** 0.1-1, only applied to lossy formats. */
  quality: number;
  /** Output resolution / current stage size. */
  scale: number;
}

export interface StageExportResult {
  blob: Blob;
  /** File extension matching the blob the browser actually produced. */
  extension: string;
  /** True when the browser fell back to a different format (e.g. no WebP). */
  mimeMismatch: boolean;
}

/**
 * Rasterizes the stage and encodes it in the requested format.
 * Returns null when the browser could not produce a blob at all.
 */
export async function exportStage(
  stage: HTMLElement,
  options: StageExportOptions,
  rasterizer: StageRasterizer = html2canvasRasterizer
): Promise<StageExportResult | null> {
  const canvas = await rasterizer.rasterize(stage, { scale: options.scale });
  const blob = await canvasToBlob(canvas, options.format, options.quality);
  if (!blob) return null;
  return {
    blob,
    extension: extensionForBlobType(blob.type),
    mimeMismatch: blob.type !== MIME_BY_FORMAT[options.format],
  };
}
