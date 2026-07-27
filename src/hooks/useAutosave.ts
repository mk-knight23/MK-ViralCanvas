import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useToastStore } from '@/stores/toastStore';
import { isTextLayer } from '@/types/project';
import { saveProject, setLastProjectId } from '@/utils/projectStorage';

export const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Debounced autosave of the current project to localStorage.
 * Pristine projects (no template, only empty text layers) are never saved.
 * A quota/storage failure warns once via toast until the next successful save.
 */
export function useAutosave(onSaved: () => void): void {
  const project = useProjectStore(s => s.project);
  const { addToast } = useToastStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnedRef = useRef(false);

  useEffect(() => {
    const isPristine =
      !project.template &&
      project.layers.every(layer => isTextLayer(layer) && layer.text.length === 0);
    if (isPristine) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const current = useProjectStore.getState().project;
      if (saveProject(current)) {
        setLastProjectId(current.id);
        warnedRef.current = false;
        onSaved();
      } else if (!warnedRef.current) {
        warnedRef.current = true;
        addToast('Autosave failed — browser storage may be full', 'error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [project, addToast, onSaved]);
}
