/**
 * Canonical localStorage namespace for the app: `mk.viralcanvas.<name>.v1`.
 *
 * Every key the app writes lives under this namespace. Legacy keys from the
 * two older namespaces (`memelab-*` and `viralcanvas:v1:*`) are copied over
 * once at startup by storageMigration.ts; the originals are kept for one
 * release as a rollback safety net. See docs/v3/STORAGE_NAMESPACE.md.
 */
export const STORAGE_NAMESPACE = 'mk.viralcanvas.';

/** Bump only with a data-shape change and a matching migration. */
const VERSION_SUFFIX = '.v1';

// Zustand persisted stores.
export const MEMES_STORE_KEY = `${STORAGE_NAMESPACE}memes${VERSION_SUFFIX}`;
export const SETTINGS_STORE_KEY = `${STORAGE_NAMESPACE}settings${VERSION_SUFFIX}`;
export const STATS_STORE_KEY = `${STORAGE_NAMESPACE}stats${VERSION_SUFFIX}`;

/** Active theme name ('dark' | 'light' | 'hc') — single source of truth. */
export const THEME_KEY = `${STORAGE_NAMESPACE}theme${VERSION_SUFFIX}`;

// Project persistence (utils/projectStorage.ts).
export const PROJECT_KEY_PREFIX = `${STORAGE_NAMESPACE}project.`;
export const LAST_PROJECT_KEY = `${STORAGE_NAMESPACE}last-project-id${VERSION_SUFFIX}`;
export const EXPORT_COUNT_KEY = `${STORAGE_NAMESPACE}export-count${VERSION_SUFFIX}`;

/** Key for one saved project. Ids never contain dots (see generateId). */
export function projectStorageKey(id: string): string {
  return `${PROJECT_KEY_PREFIX}${id}${VERSION_SUFFIX}`;
}

/** Extracts the project id from a canonical project key, or null. */
export function projectIdFromKey(key: string): string | null {
  if (!key.startsWith(PROJECT_KEY_PREFIX) || !key.endsWith(VERSION_SUFFIX)) return null;
  const id = key.slice(PROJECT_KEY_PREFIX.length, key.length - VERSION_SUFFIX.length);
  return id.length > 0 ? id : null;
}

// Legacy namespaces — read-only from here on. Still counted in the storage
// estimate (they occupy real quota) and still migrated on startup.
export const LEGACY_MEMELAB_PREFIX = 'memelab-';
export const LEGACY_VIRALCANVAS_PREFIX = 'viralcanvas:v1:';
export const LEGACY_PROJECT_KEY_PREFIX = `${LEGACY_VIRALCANVAS_PREFIX}project:`;
