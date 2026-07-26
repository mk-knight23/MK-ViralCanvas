import { useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { isEditableTarget } from '@/utils/keyboard';

/**
 * Global Ctrl/Cmd+Z (undo), Ctrl/Cmd+Y and Ctrl/Cmd+Shift+Z (redo).
 * Browser-reserved combos (Ctrl+R reload, Ctrl+S save, Ctrl+D bookmark) are
 * intentionally left alone, and shortcuts never fire while the user is
 * typing in an editable control. Actions are read off the store at event
 * time, so no handler refs need to be mutated during render.
 */
export function useUndoRedoShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useProjectStore.getState().undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        useProjectStore.getState().redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
