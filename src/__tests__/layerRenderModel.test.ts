import { describe, it, expect } from 'vitest';
import { MEME_TEXT_SHADOW, buildLayerRenderModel } from '@/renderer/layerRenderModel';
import { createImageLayer, createShapeLayer, createTextLayer } from '@/types/project';

describe('buildLayerRenderModel — text layers', () => {
  it('scales font size and stroke width from artboard pixels to stage pixels', () => {
    const layer = createTextLayer({ text: 'HELLO', fontSize: 80, strokeWidth: 4 });
    const model = buildLayerRenderModel(layer, 0.5);

    expect(model?.kind).toBe('text');
    if (model?.kind !== 'text') return;
    expect(model.fontSizePx).toBe(40);
    expect(model.webkitTextStroke).toBe(`2px ${layer.strokeColor}`);
  });

  it('positions the layer center with the shared transform', () => {
    const layer = createTextLayer({ text: 'X', x: 25, y: 75, rotation: -12 });
    const model = buildLayerRenderModel(layer, 1);

    expect(model?.leftPercent).toBe(25);
    expect(model?.topPercent).toBe(75);
    expect(model?.transform).toBe('translate(-50%, -50%) rotate(-12deg)');
  });

  it('omits the stroke when the stroke width is zero', () => {
    const layer = createTextLayer({ text: 'X', strokeWidth: 0 });
    const model = buildLayerRenderModel(layer, 1);
    if (model?.kind !== 'text') throw new Error('expected a text model');
    expect(model.webkitTextStroke).toBeUndefined();
  });

  it('toggles the meme shadow with shadowEnabled', () => {
    const withShadow = buildLayerRenderModel(createTextLayer({ text: 'X' }), 1);
    const withoutShadow = buildLayerRenderModel(
      createTextLayer({ text: 'X', shadowEnabled: false }),
      1
    );
    if (withShadow?.kind !== 'text' || withoutShadow?.kind !== 'text') {
      throw new Error('expected text models');
    }
    expect(withShadow.textShadow).toBe(MEME_TEXT_SHADOW);
    expect(withoutShadow.textShadow).toBeUndefined();
  });

  it('returns null for hidden layers and empty text', () => {
    expect(buildLayerRenderModel(createTextLayer({ text: 'X', hidden: true }), 1)).toBeNull();
    expect(buildLayerRenderModel(createTextLayer({ text: '' }), 1)).toBeNull();
  });

  it('marks locked layers as non-interactive', () => {
    const model = buildLayerRenderModel(createTextLayer({ text: 'X', locked: true }), 1);
    expect(model?.interactive).toBe(false);
  });
});

describe('buildLayerRenderModel — image layers', () => {
  it('exposes source and percentage geometry', () => {
    const layer = createImageLayer({
      url: 'https://example.com/a.png',
      x: 30,
      y: 40,
      width: 50,
      height: 25,
      opacity: 0.7,
    });
    const model = buildLayerRenderModel(layer, 0.5);

    expect(model?.kind).toBe('image');
    if (model?.kind !== 'image') return;
    expect(model.url).toBe('https://example.com/a.png');
    expect(model.widthPercent).toBe(50);
    expect(model.heightPercent).toBe(25);
    expect(model.opacity).toBe(0.7);
  });

  it('returns null when hidden', () => {
    const layer = createImageLayer({ url: 'https://example.com/a.png', hidden: true });
    expect(buildLayerRenderModel(layer, 1)).toBeNull();
  });
});

describe('buildLayerRenderModel — shape layers', () => {
  it('renders ellipses with a 50% border radius and scales the stroke', () => {
    const layer = createShapeLayer({
      shape: 'ellipse',
      fill: '#ff0000',
      strokeColor: '#00ff00',
      strokeWidth: 8,
    });
    const model = buildLayerRenderModel(layer, 0.25);

    expect(model?.kind).toBe('shape');
    if (model?.kind !== 'shape') return;
    expect(model.fill).toBe('#ff0000');
    expect(model.borderRadius).toBe('50%');
    expect(model.border).toBe('2px solid #00ff00');
  });

  it('renders rectangles without a border radius or stroke by default', () => {
    const model = buildLayerRenderModel(createShapeLayer(), 1);
    if (model?.kind !== 'shape') throw new Error('expected a shape model');
    expect(model.borderRadius).toBeUndefined();
    expect(model.border).toBeUndefined();
  });
});
