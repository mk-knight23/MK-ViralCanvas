import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { AUTOSAVE_DEBOUNCE_MS, useAutosave } from '@/hooks/useAutosave';
import { useProjectStore } from '@/stores/projectStore';
import { useToastStore } from '@/stores/toastStore';
import { createProject, createTextLayer } from '@/types/project';
import { getLastProjectId, loadProject } from '@/utils/projectStorage';

function seedProject(text: string) {
  useProjectStore.getState().setProject(
    createProject({
      id: 'autosave-test',
      name: 'Autosave test',
      layers: [createTextLayer({ id: 'top', text })],
    })
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutosave', () => {
  it('does not save a pristine project (no template, empty text layers)', () => {
    seedProject('');
    renderHook(() => useAutosave(() => {}));
    act(() => vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 2));

    expect(loadProject('autosave-test')).toBeNull();
  });

  it('saves a dirty project after the debounce window and reports it', () => {
    seedProject('HELLO');
    const onSaved = vi.fn();
    renderHook(() => useAutosave(onSaved));

    expect(loadProject('autosave-test')).toBeNull();
    act(() => vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 1));

    expect(loadProject('autosave-test')?.name).toBe('Autosave test');
    expect(getLastProjectId()).toBe('autosave-test');
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('debounces rapid edits into a single save', () => {
    seedProject('a');
    const onSaved = vi.fn();
    const { rerender } = renderHook(() => useAutosave(onSaved));

    for (const text of ['ab', 'abc', 'abcd']) {
      act(() => {
        useProjectStore.getState().updateLayer('top', { text });
        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS / 2);
      });
      rerender();
    }
    act(() => vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 1));

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('warns once via toast when storage writes fail, until a save succeeds', () => {
    seedProject('HELLO');
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { rerender } = renderHook(() => useAutosave(() => {}));

    act(() => vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 1));
    act(() => {
      useProjectStore.getState().updateLayer('top', { text: 'MORE' });
    });
    rerender();
    act(() => vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 1));

    const failureToasts = useToastStore
      .getState()
      .toasts.filter(t => t.message.includes('Autosave failed'));
    expect(failureToasts).toHaveLength(1);
    setItem.mockRestore();
  });
});
