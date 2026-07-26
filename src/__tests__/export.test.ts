import { describe, it, expect, vi } from 'vitest';
import {
  canvasToBlob,
  exportFileName,
  exportStage,
  extensionForBlobType,
} from '@/utils/export';
import type { StageRasterizer } from '@/renderer/types';

function fakeCanvas(producedType: string | null): {
  canvas: HTMLCanvasElement;
  toBlob: ReturnType<typeof vi.fn>;
} {
  const toBlob = vi.fn(
    (callback: (blob: Blob | null) => void) =>
      callback(producedType === null ? null : new Blob(['x'], { type: producedType }))
  );
  return { canvas: { toBlob } as unknown as HTMLCanvasElement, toBlob };
}

function fakeRasterizer(canvas: HTMLCanvasElement): StageRasterizer {
  return { rasterize: vi.fn().mockResolvedValue(canvas) };
}

const stage = document.createElement('div');

describe('extensionForBlobType', () => {
  it('maps known mime types and falls back to png', () => {
    expect(extensionForBlobType('image/webp')).toBe('webp');
    expect(extensionForBlobType('image/jpeg')).toBe('jpg');
    expect(extensionForBlobType('image/png')).toBe('png');
    expect(extensionForBlobType('application/octet-stream')).toBe('png');
  });
});

describe('exportFileName', () => {
  it('builds a timestamped file name with the given extension', () => {
    expect(exportFileName('webp', 1234)).toBe('viralcanvas-1234.webp');
  });
});

describe('canvasToBlob', () => {
  it('passes the quality parameter for lossy formats only', async () => {
    const { canvas, toBlob } = fakeCanvas('image/jpeg');
    await canvasToBlob(canvas, 'jpeg', 0.8);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8);

    const png = fakeCanvas('image/png');
    await canvasToBlob(png.canvas, 'png', 0.8);
    expect(png.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined);
  });
});

describe('exportStage', () => {
  it('returns the blob with a matching extension when the format is supported', async () => {
    const { canvas } = fakeCanvas('image/webp');
    const result = await exportStage(
      stage,
      { format: 'webp', quality: 0.9, scale: 2 },
      fakeRasterizer(canvas)
    );

    expect(result).not.toBeNull();
    expect(result?.extension).toBe('webp');
    expect(result?.mimeMismatch).toBe(false);
  });

  it('flags a mime mismatch when the browser falls back to png', async () => {
    const { canvas } = fakeCanvas('image/png');
    const result = await exportStage(
      stage,
      { format: 'webp', quality: 0.9, scale: 1 },
      fakeRasterizer(canvas)
    );

    expect(result?.mimeMismatch).toBe(true);
    expect(result?.extension).toBe('png');
  });

  it('returns null when the browser cannot produce a blob', async () => {
    const { canvas } = fakeCanvas(null);
    const result = await exportStage(
      stage,
      { format: 'png', quality: 1, scale: 1 },
      fakeRasterizer(canvas)
    );
    expect(result).toBeNull();
  });

  it('rasterizes at the requested scale', async () => {
    const { canvas } = fakeCanvas('image/png');
    const rasterizer = fakeRasterizer(canvas);
    await exportStage(stage, { format: 'png', quality: 1, scale: 2.5 }, rasterizer);
    expect(rasterizer.rasterize).toHaveBeenCalledWith(stage, { scale: 2.5 });
  });
});
