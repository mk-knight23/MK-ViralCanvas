import type { Artboard, Project, ProjectMeta, TextLayer } from '@/types/project';
import {
  CUSTOM_PRESET_ID,
  MAX_ARTBOARD_SIZE,
  MAX_LAYERS,
  MIN_ARTBOARD_SIZE,
  PROJECT_SCHEMA_VERSION,
  createProject,
  createTextLayer,
  generateId,
  getArtboardPreset,
} from '@/types/project';
import type { MemeTemplate } from '@/types/meme';

export const STORAGE_PREFIX = 'viralcanvas:v1:';
const PROJECT_KEY_PREFIX = `${STORAGE_PREFIX}project:`;
const LAST_PROJECT_KEY = `${STORAGE_PREFIX}last-project-id`;
const EXPORT_COUNT_KEY = `${STORAGE_PREFIX}export-count`;

const EXPORT_FILE_KIND = 'viralcanvas-project';
const MAX_TEXT_LENGTH = 500;
const MAX_NAME_LENGTH = 80;

export type ParseResult = { ok: true; project: Project } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asBoundedString(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  return value.slice(0, maxLength);
}

/** Only allow image sources that cannot execute script. */
export function isSafeImageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0 || url.length > 10_000_000) return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  );
}

function sanitizeLayer(value: unknown): TextLayer | null {
  if (!isRecord(value)) return null;
  if (value.text !== undefined && typeof value.text !== 'string') return null;
  const defaults = createTextLayer();
  return {
    id: typeof value.id === 'string' && value.id.length > 0 ? value.id : generateId('layer'),
    text: asBoundedString(value.text, '', MAX_TEXT_LENGTH),
    x: clampNumber(value.x, 0, 100, defaults.x),
    y: clampNumber(value.y, 0, 100, defaults.y),
    fontFamily: asBoundedString(value.fontFamily, defaults.fontFamily, 200),
    fontSize: clampNumber(value.fontSize, 8, 600, defaults.fontSize),
    fontWeight: clampNumber(value.fontWeight, 100, 1000, defaults.fontWeight),
    color: asBoundedString(value.color, defaults.color, 50),
    strokeColor: asBoundedString(value.strokeColor, defaults.strokeColor, 50),
    strokeWidth: clampNumber(value.strokeWidth, 0, 60, defaults.strokeWidth),
    shadowEnabled: asBoolean(value.shadowEnabled, defaults.shadowEnabled),
    opacity: clampNumber(value.opacity, 0, 1, defaults.opacity),
    rotation: clampNumber(value.rotation, -360, 360, defaults.rotation),
    hidden: asBoolean(value.hidden, false),
    locked: asBoolean(value.locked, false),
  };
}

function sanitizeTemplate(value: unknown): MemeTemplate | null | 'invalid' {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return 'invalid';
  if (!isSafeImageUrl(value.url)) return 'invalid';
  return {
    id: typeof value.id === 'string' && value.id.length > 0 ? value.id : generateId('tmpl'),
    name: asBoundedString(value.name, 'Imported image', 200),
    url: value.url,
    width: clampNumber(value.width, 1, 20000, 500),
    height: clampNumber(value.height, 1, 20000, 500),
  };
}

function sanitizeArtboard(value: unknown): Artboard | null {
  if (!isRecord(value)) return null;
  const width = clampNumber(value.width, MIN_ARTBOARD_SIZE, MAX_ARTBOARD_SIZE, NaN);
  const height = clampNumber(value.height, MIN_ARTBOARD_SIZE, MAX_ARTBOARD_SIZE, NaN);
  if (Number.isNaN(width) || Number.isNaN(height)) return null;
  const presetId =
    typeof value.presetId === 'string' && getArtboardPreset(value.presetId)
      ? value.presetId
      : CUSTOM_PRESET_ID;
  return { presetId, width: Math.round(width), height: Math.round(height) };
}

/**
 * Validates unknown data as a Project. Structural problems are rejected,
 * out-of-range values are clamped, and missing cosmetic fields get defaults.
 */
export function validateProject(value: unknown): ParseResult {
  if (!isRecord(value)) {
    return { ok: false, error: 'Project data must be an object' };
  }
  if (!Array.isArray(value.layers)) {
    return { ok: false, error: 'Project is missing its layers array' };
  }
  if (value.layers.length > MAX_LAYERS) {
    return { ok: false, error: `Projects support at most ${MAX_LAYERS} layers` };
  }
  const layers: TextLayer[] = [];
  const seenIds = new Set<string>();
  for (const entry of value.layers) {
    const layer = sanitizeLayer(entry);
    if (layer === null) {
      return { ok: false, error: 'Project contains an invalid text layer' };
    }
    if (seenIds.has(layer.id)) {
      layers.push({ ...layer, id: generateId('layer') });
    } else {
      layers.push(layer);
    }
    seenIds.add(layers[layers.length - 1].id);
  }

  const template = sanitizeTemplate(value.template);
  if (template === 'invalid') {
    return { ok: false, error: 'Project template image is missing or unsafe' };
  }

  const artboard =
    value.artboard === undefined ? createProject().artboard : sanitizeArtboard(value.artboard);
  if (artboard === null) {
    return { ok: false, error: 'Project artboard dimensions are invalid' };
  }

  const now = new Date().toISOString();
  const project: Project = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: typeof value.id === 'string' && value.id.length > 0 ? value.id : generateId('proj'),
    name:
      asBoundedString(value.name, 'Imported project', MAX_NAME_LENGTH).trim() || 'Imported project',
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
    artboard,
    template,
    layers,
  };
  return { ok: true, project };
}

// ---------------------------------------------------------------------------
// Serialization (export / import as JSON file)
// ---------------------------------------------------------------------------

export function serializeProject(project: Project): string {
  return JSON.stringify(
    { kind: EXPORT_FILE_KIND, version: PROJECT_SCHEMA_VERSION, project },
    null,
    2
  );
}

/** Parses a JSON string produced by serializeProject (or a bare project object). */
export function parseProjectJson(json: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: 'File is not valid JSON' };
  }
  if (isRecord(data) && data.kind === EXPORT_FILE_KIND) {
    return validateProject(data.project);
  }
  return validateProject(data);
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function projectStorageKey(id: string): string {
  return `${PROJECT_KEY_PREFIX}${id}`;
}

/** Saves the project. Returns false when storage is unavailable or full. */
export function saveProject(project: Project): boolean {
  const stamped: Project = { ...project, updatedAt: new Date().toISOString() };
  return safeSetItem(projectStorageKey(project.id), serializeProject(stamped));
}

export function loadProject(id: string): Project | null {
  const raw = safeGetItem(projectStorageKey(id));
  if (raw === null) return null;
  const result = parseProjectJson(raw);
  return result.ok ? result.project : null;
}

export function deleteProject(id: string): void {
  try {
    localStorage.removeItem(projectStorageKey(id));
    if (safeGetItem(LAST_PROJECT_KEY) === id) {
      localStorage.removeItem(LAST_PROJECT_KEY);
    }
  } catch {
    // Storage unavailable: nothing to delete.
  }
}

export function listProjects(): ProjectMeta[] {
  const metas: ProjectMeta[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PROJECT_KEY_PREFIX)) continue;
      const raw = safeGetItem(key);
      if (raw === null) continue;
      const result = parseProjectJson(raw);
      if (!result.ok) continue;
      metas.push({
        id: result.project.id,
        name: result.project.name,
        updatedAt: result.project.updatedAt,
        layerCount: result.project.layers.length,
      });
    }
  } catch {
    return metas;
  }
  return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLastProjectId(): string | null {
  return safeGetItem(LAST_PROJECT_KEY);
}

export function setLastProjectId(id: string): void {
  safeSetItem(LAST_PROJECT_KEY, id);
}

// ---------------------------------------------------------------------------
// Export counter + storage estimate (dashboard)
// ---------------------------------------------------------------------------

export function getExportCount(): number {
  const raw = safeGetItem(EXPORT_COUNT_KEY);
  const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function incrementExportCount(): number {
  const next = getExportCount() + 1;
  safeSetItem(EXPORT_COUNT_KEY, String(next));
  return next;
}

/** Approximate bytes used by this app in localStorage (UTF-16: 2 bytes/char). */
export function estimateStorageBytes(): number {
  let chars = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith(STORAGE_PREFIX) && !key.startsWith('memelab-')) continue;
      const value = safeGetItem(key) ?? '';
      chars += key.length + value.length;
    }
  } catch {
    return 0;
  }
  return chars * 2;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
