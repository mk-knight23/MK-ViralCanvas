import { describe, it, expect, beforeEach } from 'vitest';
import {
  deleteProject,
  estimateStorageBytes,
  formatBytes,
  getExportCount,
  getLastProjectId,
  incrementExportCount,
  isSafeImageUrl,
  listProjects,
  loadProject,
  parseProjectJson,
  saveProject,
  serializeProject,
  setLastProjectId,
  validateProject,
} from '@/utils/projectStorage';
import { createProject, createTextLayer } from '@/types/project';

beforeEach(() => {
  localStorage.clear();
});

describe('serialization round-trip', () => {
  it('serializes and parses a project back to an equal object', () => {
    const project = createProject({
      name: 'Round trip',
      template: {
        id: 't1',
        name: 'Drake',
        url: 'https://i.imgflip.com/30b1gx.jpg',
        width: 1200,
        height: 1200,
      },
      layers: [
        createTextLayer({ id: 'l1', text: 'TOP', y: 8, rotation: -12, opacity: 0.8 }),
        createTextLayer({ id: 'l2', text: 'BOTTOM', y: 92, locked: true, hidden: true }),
      ],
    });

    const result = parseProjectJson(serializeProject(project));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project).toEqual(project);
    }
  });

  it('accepts a bare project object without the export envelope', () => {
    const project = createProject({ name: 'Bare' });
    const result = parseProjectJson(JSON.stringify(project));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.project.name).toBe('Bare');
  });
});

describe('import validation', () => {
  it('rejects invalid JSON without throwing', () => {
    const result = parseProjectJson('{not json');
    expect(result).toEqual({ ok: false, error: expect.stringContaining('JSON') });
  });

  it('rejects non-object roots', () => {
    expect(parseProjectJson('42').ok).toBe(false);
    expect(parseProjectJson('"hello"').ok).toBe(false);
    expect(parseProjectJson('[1,2,3]').ok).toBe(false);
    expect(parseProjectJson('null').ok).toBe(false);
  });

  it('rejects projects without a layers array', () => {
    expect(parseProjectJson(JSON.stringify({ name: 'x' })).ok).toBe(false);
    expect(parseProjectJson(JSON.stringify({ name: 'x', layers: 'nope' })).ok).toBe(false);
  });

  it('rejects layers with non-string text or non-object entries', () => {
    expect(validateProject({ layers: [{ text: 42 }] }).ok).toBe(false);
    expect(validateProject({ layers: ['nope'] }).ok).toBe(false);
    expect(validateProject({ layers: [null] }).ok).toBe(false);
  });

  it('rejects unsafe template image urls', () => {
    const result = validateProject({
      layers: [],
      // eslint-disable-next-line no-script-url
      template: { id: 't', name: 'evil', url: 'javascript:alert(1)', width: 10, height: 10 },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid artboard dimensions', () => {
    expect(validateProject({ layers: [], artboard: { width: 'wide', height: 100 } }).ok).toBe(
      false
    );
  });

  it('clamps out-of-range layer values instead of failing', () => {
    const result = validateProject({
      layers: [{ text: 'ok', x: 900, y: -50, fontSize: 99999, opacity: 7 }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const layer = result.project.layers[0];
      expect(layer.x).toBe(100);
      expect(layer.y).toBe(0);
      expect(layer.fontSize).toBe(600);
      expect(layer.opacity).toBe(1);
    }
  });

  it('regenerates duplicate layer ids', () => {
    const result = validateProject({
      layers: [
        { id: 'same', text: 'a' },
        { id: 'same', text: 'b' },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const ids = result.project.layers.map(l => l.id);
      expect(new Set(ids).size).toBe(2);
    }
  });
});

describe('isSafeImageUrl', () => {
  it('accepts http(s), data:image, blob and root-relative urls', () => {
    expect(isSafeImageUrl('https://example.com/a.png')).toBe(true);
    expect(isSafeImageUrl('http://example.com/a.png')).toBe(true);
    expect(isSafeImageUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isSafeImageUrl('blob:https://example.com/uuid')).toBe(true);
    expect(isSafeImageUrl('/local/image.png')).toBe(true);
  });

  it('rejects script-capable or malformed sources', () => {
    // eslint-disable-next-line no-script-url
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageUrl('data:text/html,<script>')).toBe(false);
    expect(isSafeImageUrl('')).toBe(false);
    expect(isSafeImageUrl(42)).toBe(false);
    expect(isSafeImageUrl(null)).toBe(false);
  });
});

describe('localStorage persistence', () => {
  it('saves, lists, loads and deletes projects under the viralcanvas prefix', () => {
    const first = createProject({ id: 'p1', name: 'First' });
    const second = createProject({ id: 'p2', name: 'Second' });

    expect(saveProject(first)).toBe(true);
    expect(saveProject(second)).toBe(true);
    expect(localStorage.getItem('viralcanvas:v1:project:p1')).not.toBeNull();

    const metas = listProjects();
    expect(metas).toHaveLength(2);
    expect(metas.map(m => m.id).sort()).toEqual(['p1', 'p2']);

    const loaded = loadProject('p1');
    expect(loaded?.name).toBe('First');
    expect(loaded?.layers).toHaveLength(2);

    deleteProject('p1');
    expect(loadProject('p1')).toBeNull();
    expect(listProjects()).toHaveLength(1);
  });

  it('returns null for corrupted stored data instead of throwing', () => {
    localStorage.setItem('viralcanvas:v1:project:bad', '{broken');
    expect(loadProject('bad')).toBeNull();
    expect(listProjects()).toHaveLength(0);
  });

  it('tracks the last opened project id', () => {
    expect(getLastProjectId()).toBeNull();
    setLastProjectId('p9');
    expect(getLastProjectId()).toBe('p9');
    localStorage.setItem('viralcanvas:v1:last-project-id', 'p1');
    saveProject(createProject({ id: 'p1' }));
    deleteProject('p1');
    expect(getLastProjectId()).toBeNull();
  });
});

describe('export counter and storage estimate', () => {
  it('increments and persists the export counter', () => {
    expect(getExportCount()).toBe(0);
    expect(incrementExportCount()).toBe(1);
    expect(incrementExportCount()).toBe(2);
    expect(getExportCount()).toBe(2);
  });

  it('recovers from a corrupted counter value', () => {
    localStorage.setItem('viralcanvas:v1:export-count', 'lots');
    expect(getExportCount()).toBe(0);
  });

  it('estimates only app-owned storage', () => {
    localStorage.setItem('unrelated-key', 'x'.repeat(1000));
    expect(estimateStorageBytes()).toBe(0);
    saveProject(createProject({ id: 'p1' }));
    expect(estimateStorageBytes()).toBeGreaterThan(0);
  });

  it('formats byte counts', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
  });
});
