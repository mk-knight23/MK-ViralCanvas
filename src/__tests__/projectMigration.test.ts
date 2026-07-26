import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadProject,
  parseProjectJson,
  saveProject,
  serializeProject,
  validateProject,
} from '@/utils/projectStorage';
import {
  PROJECT_SCHEMA_VERSION,
  createImageLayer,
  createProject,
  createShapeLayer,
  createTextLayer,
  isTextLayer,
} from '@/types/project';

const V1_FIXTURE = readFileSync(join(__dirname, 'fixtures', 'project-v1.json'), 'utf-8');

beforeEach(() => {
  localStorage.clear();
});

describe('schemaVersion 1 → 2 migration', () => {
  it('loads a real v1 project file and migrates it to schemaVersion 2', () => {
    const result = parseProjectJson(V1_FIXTURE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.schemaVersion).toBe(2);
    expect(PROJECT_SCHEMA_VERSION).toBe(2);
  });

  it('migrates every v1 layer to a text layer without losing any field', () => {
    const fixture = JSON.parse(V1_FIXTURE) as {
      project: { layers: Record<string, unknown>[] };
    };
    const result = parseProjectJson(V1_FIXTURE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.layers).toHaveLength(fixture.project.layers.length);
    result.project.layers.forEach((layer, index) => {
      // Lossless: the migrated layer is exactly the v1 layer plus type: 'text'.
      expect(layer).toEqual({ ...fixture.project.layers[index], type: 'text' });
    });
  });

  it('preserves v1 project metadata (id, name, dates, artboard, template)', () => {
    const fixture = JSON.parse(V1_FIXTURE) as { project: Record<string, unknown> };
    const result = parseProjectJson(V1_FIXTURE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.id).toBe(fixture.project.id);
    expect(result.project.name).toBe(fixture.project.name);
    expect(result.project.createdAt).toBe(fixture.project.createdAt);
    expect(result.project.updatedAt).toBe(fixture.project.updatedAt);
    expect(result.project.artboard).toEqual(fixture.project.artboard);
    expect(result.project.template).toEqual(fixture.project.template);
  });

  it('migrates a bare v1 project object without the export envelope', () => {
    const bare = (JSON.parse(V1_FIXTURE) as { project: unknown }).project;
    const result = validateProject(bare);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.schemaVersion).toBe(2);
    expect(result.project.layers.every(isTextLayer)).toBe(true);
  });

  it('round-trips a v1 project through save/load storage losslessly', () => {
    const migrated = parseProjectJson(V1_FIXTURE);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;

    expect(saveProject(migrated.project)).toBe(true);
    const reloaded = loadProject(migrated.project.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.layers).toEqual(migrated.project.layers);
    expect(reloaded?.schemaVersion).toBe(2);
  });
});

describe('schemaVersion 2 layer union', () => {
  it('serializes and re-parses text, image, and shape layers losslessly', () => {
    const project = createProject({
      name: 'V2 round trip',
      layers: [
        createTextLayer({ id: 'l-text', text: 'HELLO' }),
        createImageLayer({
          id: 'l-img',
          url: 'https://example.com/sticker.png',
          x: 25,
          y: 25,
          width: 30,
          height: 20,
        }),
        createShapeLayer({
          id: 'l-shape',
          shape: 'ellipse',
          fill: '#ff0000',
          width: 40,
          height: 15,
        }),
      ],
    });

    const result = parseProjectJson(serializeProject(project));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project).toEqual(project);
    expect(result.project.layers.map(l => l.type)).toEqual(['text', 'image', 'shape']);
  });

  it('rejects image layers with unsafe urls', () => {
    const result = validateProject({
      layers: [
        // eslint-disable-next-line no-script-url
        { type: 'image', url: 'javascript:alert(1)', x: 50, y: 50, width: 20, height: 20 },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects layers with an unknown type discriminant', () => {
    const result = validateProject({
      layers: [{ type: 'video', url: 'https://example.com/a.mp4' }],
    });
    expect(result.ok).toBe(false);
  });

  it('clamps out-of-range image and shape geometry instead of failing', () => {
    const result = validateProject({
      layers: [
        { type: 'image', url: 'https://example.com/a.png', width: 900, height: -5 },
        { type: 'shape', shape: 'nonsense', fill: '#00ff00', strokeWidth: 999 },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [image, shape] = result.project.layers;
    expect(image.type).toBe('image');
    if (image.type === 'image') {
      expect(image.width).toBe(100);
      expect(image.height).toBe(1);
    }
    expect(shape.type).toBe('shape');
    if (shape.type === 'shape') {
      expect(shape.shape).toBe('rectangle');
      expect(shape.strokeWidth).toBe(60);
    }
  });
});
