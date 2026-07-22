import { useMemo } from 'react';
import { Clock, Download, HardDrive } from 'lucide-react';
import {
  estimateStorageBytes,
  formatBytes,
  getExportCount,
  listProjects,
} from '@/utils/projectStorage';

const RECENT_LIMIT = 4;

interface DashboardStripProps {
  /** Bumped by the parent whenever local data changes, to recompute. */
  refreshKey: number;
  onOpenProject: (id: string) => void;
}

/** Compact strip of real local data: recent projects, exports, storage use. */
export function DashboardStrip({ refreshKey, onOpenProject }: DashboardStripProps) {
  const { recents, exportCount, storageBytes } = useMemo(
    () => ({
      recents: listProjects().slice(0, RECENT_LIMIT),
      exportCount: getExportCount(),
      storageBytes: estimateStorageBytes(),
    }),
    // refreshKey intentionally drives recomputation of localStorage reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey]
  );

  if (recents.length === 0 && exportCount === 0) return null;

  return (
    <div className="card-elevated p-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      {recents.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="flex items-center gap-1.5 text-text-muted font-semibold uppercase tracking-wide text-[10px]">
            <Clock className="w-3.5 h-3.5" /> Recent
          </span>
          {recents.map(meta => (
            <button
              key={meta.id}
              onClick={() => onOpenProject(meta.id)}
              className="px-2.5 py-1 rounded-lg bg-surface-secondary border border-border text-text-secondary hover:border-brand-primary/40 hover:text-brand-primary font-medium transition-all cursor-pointer max-w-[160px] truncate"
              title={meta.name}
            >
              {meta.name}
            </button>
          ))}
        </div>
      )}
      <span className="flex items-center gap-1.5 text-text-muted ml-auto">
        <Download className="w-3.5 h-3.5" />
        <span className="font-semibold text-text-secondary">{exportCount}</span> exports
      </span>
      <span className="flex items-center gap-1.5 text-text-muted">
        <HardDrive className="w-3.5 h-3.5" />
        <span className="font-semibold text-text-secondary">{formatBytes(storageBytes)}</span> used
      </span>
    </div>
  );
}
