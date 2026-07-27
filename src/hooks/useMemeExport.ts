import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toastStore';
import { exportFileName, exportStage } from '@/utils/export';
import { incrementExportCount } from '@/utils/projectStorage';
import type { ExportOptions } from '@/types/project';

interface UseMemeExportArgs {
  stageRef: React.RefObject<HTMLDivElement | null>;
  options: ExportOptions;
  /** Called after a successful download so dashboards can refresh. */
  onExported: () => void;
}

interface UseMemeExportResult {
  /** True while the stage is being captured/encoded (hides selection chrome). */
  isExporting: boolean;
  downloadImage: () => Promise<void>;
  copyToClipboard: () => Promise<void>;
}

/**
 * Download/copy actions for the editor. Orchestrates the export pipeline
 * (utils/export.ts) with UI concerns: toasts, stats, export counter.
 */
export function useMemeExport({
  stageRef,
  options,
  onExported,
}: UseMemeExportArgs): UseMemeExportResult {
  const { addToast } = useToastStore();
  const recordDownload = useStatsStore(s => s.recordDownload);
  const [isExporting, setIsExporting] = useState(false);

  const downloadImage = async () => {
    const project = useProjectStore.getState().project;
    if (!project.template) {
      addToast('Pick a template or upload an image first', 'info');
      return;
    }
    const el = stageRef.current;
    if (!el || el.clientWidth === 0) return;
    const { format, quality, multiplier } = options;
    setIsExporting(true);
    try {
      // file-saver stays a dynamic import so project-JSON exports elsewhere
      // never pull the canvas chunk, and vice versa.
      const { saveAs } = await import('file-saver');
      const scale = (project.artboard.width * multiplier) / el.clientWidth;
      const result = await exportStage(el, { format, quality, scale });
      if (!result) {
        addToast('Export failed', 'error');
        return;
      }
      if (result.mimeMismatch) {
        addToast(
          `${format.toUpperCase()} not supported by this browser — saved as ${result.extension.toUpperCase()}`,
          'info'
        );
      }
      saveAs(result.blob, exportFileName(result.extension));
      incrementExportCount();
      recordDownload();
      onExported();
      addToast('Image exported!', 'success');
    } catch {
      addToast('Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      addToast('Clipboard not supported. Use download instead.', 'info');
      return;
    }
    const project = useProjectStore.getState().project;
    const el = stageRef.current;
    if (!el || el.clientWidth === 0 || !project.template) return;
    setIsExporting(true);
    try {
      const scale = project.artboard.width / el.clientWidth;
      const result = await exportStage(el, { format: 'png', quality: 1, scale });
      if (!result) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': result.blob })]);
      addToast('Copied to clipboard!', 'success');
    } catch {
      addToast('Copy failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, downloadImage, copyToClipboard };
}
