import { describe, it, expect, beforeEach } from 'vitest';
import {
  EXPORT_COUNT_KEY,
  LAST_PROJECT_KEY,
  MEMES_STORE_KEY,
  SETTINGS_STORE_KEY,
  STATS_STORE_KEY,
  projectStorageKey,
} from '@/utils/storageKeys';
import { migrateLegacyStorage } from '@/utils/storageMigration';

describe('storage key namespace', () => {
  it('places every canonical key inside mk.viralcanvas.*.v1', () => {
    const keys = [
      MEMES_STORE_KEY,
      SETTINGS_STORE_KEY,
      STATS_STORE_KEY,
      LAST_PROJECT_KEY,
      EXPORT_COUNT_KEY,
      projectStorageKey('proj-abc-123'),
    ];
    for (const key of keys) {
      expect(key).toMatch(/^mk\.viralcanvas\..+\.v1$/);
    }
  });

  it('embeds the project id in the project key', () => {
    expect(projectStorageKey('proj-abc-123')).toBe('mk.viralcanvas.project.proj-abc-123.v1');
  });
});

describe('migrateLegacyStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('copies the memelab zustand stores into the new namespace', () => {
    localStorage.setItem('memelab-storage', '{"state":{"favorites":[]},"version":0}');
    localStorage.setItem('memelab-settings', '{"state":{"theme":"dark"},"version":0}');
    localStorage.setItem('memelab-stats', '{"state":{"totalMemesCreated":4},"version":0}');

    migrateLegacyStorage();

    expect(localStorage.getItem(MEMES_STORE_KEY)).toBe('{"state":{"favorites":[]},"version":0}');
    expect(localStorage.getItem(SETTINGS_STORE_KEY)).toBe('{"state":{"theme":"dark"},"version":0}');
    expect(localStorage.getItem(STATS_STORE_KEY)).toBe(
      '{"state":{"totalMemesCreated":4},"version":0}'
    );
  });

  it('copies the viralcanvas:v1 scalar keys into the new namespace', () => {
    localStorage.setItem('viralcanvas:v1:last-project-id', 'proj-1');
    localStorage.setItem('viralcanvas:v1:export-count', '7');

    migrateLegacyStorage();

    expect(localStorage.getItem(LAST_PROJECT_KEY)).toBe('proj-1');
    expect(localStorage.getItem(EXPORT_COUNT_KEY)).toBe('7');
  });

  it('migrates every viralcanvas:v1 project key, preserving the id', () => {
    localStorage.setItem('viralcanvas:v1:project:proj-a', '{"a":1}');
    localStorage.setItem('viralcanvas:v1:project:proj-b', '{"b":2}');

    migrateLegacyStorage();

    expect(localStorage.getItem(projectStorageKey('proj-a'))).toBe('{"a":1}');
    expect(localStorage.getItem(projectStorageKey('proj-b'))).toBe('{"b":2}');
  });

  it('keeps the legacy keys intact (non-destructive copy)', () => {
    localStorage.setItem('memelab-settings', '{"state":{},"version":0}');
    localStorage.setItem('viralcanvas:v1:project:proj-a', '{"a":1}');

    migrateLegacyStorage();

    expect(localStorage.getItem('memelab-settings')).toBe('{"state":{},"version":0}');
    expect(localStorage.getItem('viralcanvas:v1:project:proj-a')).toBe('{"a":1}');
  });

  it('never overwrites data already present at a new key', () => {
    localStorage.setItem('memelab-settings', '{"state":{"theme":"light"},"version":0}');
    localStorage.setItem(SETTINGS_STORE_KEY, '{"state":{"theme":"dark"},"version":0}');

    migrateLegacyStorage();

    expect(localStorage.getItem(SETTINGS_STORE_KEY)).toBe('{"state":{"theme":"dark"},"version":0}');
  });

  it('is idempotent: a second run copies nothing further', () => {
    localStorage.setItem('memelab-stats', '{"state":{},"version":0}');

    const first = migrateLegacyStorage();
    const second = migrateLegacyStorage();

    expect(first).toBe(1);
    expect(second).toBe(0);
  });

  it('is a no-op on a fresh install', () => {
    expect(migrateLegacyStorage()).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it('returns the number of keys copied', () => {
    localStorage.setItem('memelab-storage', '{}');
    localStorage.setItem('viralcanvas:v1:export-count', '2');
    localStorage.setItem('viralcanvas:v1:project:proj-a', '{"a":1}');

    expect(migrateLegacyStorage()).toBe(3);
  });
});
