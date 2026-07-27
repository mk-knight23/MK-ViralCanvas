import {
  EXPORT_COUNT_KEY,
  LAST_PROJECT_KEY,
  LEGACY_PROJECT_KEY_PREFIX,
  LEGACY_VIRALCANVAS_PREFIX,
  MEMES_STORE_KEY,
  SETTINGS_STORE_KEY,
  STATS_STORE_KEY,
  projectStorageKey,
} from './storageKeys';

/**
 * One-time, non-destructive copy of legacy localStorage keys into the
 * canonical `mk.viralcanvas.*.v1` namespace.
 *
 * Rules:
 * - Copy only; legacy keys are kept for one release as a rollback safety net.
 * - Never overwrite a value already present at a new key (new data wins),
 *   which also makes the migration idempotent.
 * - MUST run before any zustand persist store module is imported, because
 *   persisted stores hydrate from localStorage at module-evaluation time.
 *   main.tsx imports this module first for that reason.
 */

interface KeyMigration {
  from: string;
  to: string;
}

const STATIC_KEY_MIGRATIONS: readonly KeyMigration[] = [
  { from: 'memelab-storage', to: MEMES_STORE_KEY },
  { from: 'memelab-settings', to: SETTINGS_STORE_KEY },
  { from: 'memelab-stats', to: STATS_STORE_KEY },
  { from: `${LEGACY_VIRALCANVAS_PREFIX}last-project-id`, to: LAST_PROJECT_KEY },
  { from: `${LEGACY_VIRALCANVAS_PREFIX}export-count`, to: EXPORT_COUNT_KEY },
];

interface PendingCopy {
  to: string;
  value: string;
}

function collectPendingCopies(): PendingCopy[] {
  const pending: PendingCopy[] = [];

  for (const { from, to } of STATIC_KEY_MIGRATIONS) {
    const value = localStorage.getItem(from);
    if (value !== null && localStorage.getItem(to) === null) {
      pending.push({ to, value });
    }
  }

  // Project keys carry an id, so they are discovered by scanning.
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LEGACY_PROJECT_KEY_PREFIX)) continue;
    const id = key.slice(LEGACY_PROJECT_KEY_PREFIX.length);
    if (!id) continue;
    const to = projectStorageKey(id);
    const value = localStorage.getItem(key);
    if (value !== null && localStorage.getItem(to) === null) {
      pending.push({ to, value });
    }
  }

  return pending;
}

/**
 * Copies legacy keys into the new namespace. Returns how many keys were
 * copied. Safe to call when storage is unavailable or full: failures are
 * skipped and retried on the next startup.
 */
export function migrateLegacyStorage(): number {
  let migrated = 0;
  let pending: PendingCopy[];
  try {
    // Scan first, write after: writing while iterating localStorage.key(i)
    // would shift indices mid-loop.
    pending = collectPendingCopies();
  } catch {
    return 0;
  }
  for (const { to, value } of pending) {
    try {
      localStorage.setItem(to, value);
      migrated += 1;
    } catch {
      // Quota exceeded on one value (e.g. a huge project): keep copying the
      // rest; whatever failed is retried on the next startup.
    }
  }
  return migrated;
}
