import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useStatsStore } from '@/stores/stats';
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

function StripStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col min-w-[64px]">
      <b className="font-mono font-medium tabular-nums text-base leading-tight text-text-primary">
        {value}
      </b>
      <span className="text-[10px] text-text-muted">{label}</span>
    </div>
  );
}

/**
 * Studio Strip — the night-studio replacement for the marketing hero:
 * one solid e1 bar of real local data (projects, storage, exports,
 * favorites) plus a recent-project rail. No invented metrics.
 */
export function DashboardStrip({ refreshKey, onOpenProject }: DashboardStripProps) {
  // Narrow selector: re-renders only when the favorites counter changes,
  // never on the per-second time ticker.
  const totalFavorites = useStatsStore(s => s.totalFavorites);

  const { projects, exportCount, storageBytes } = useMemo(
    () => ({
      projects: listProjects(),
      exportCount: getExportCount(),
      storageBytes: estimateStorageBytes(),
    }),
    // refreshKey intentionally drives recomputation of localStorage reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey]
  );

  const recents = projects.slice(0, RECENT_LIMIT);
  const isEmpty = projects.length === 0 && exportCount === 0;

  return (
    <section
      className="card-elevated px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3"
      aria-label="Studio overview"
    >
      <span className="font-display font-semibold text-sm text-text-primary">Studio</span>

      {isEmpty ? (
        <p className="text-xs text-text-secondary">
          No projects yet — your first artboard is ready below.
        </p>
      ) : (
        <>
          <StripStat value={projects.length} label="projects" />
          <StripStat value={formatBytes(storageBytes)} label="storage used" />
          <StripStat value={exportCount} label="exports" />
          <StripStat value={totalFavorites} label="favorites" />

          {recents.length > 0 && (
            <div className="flex items-center gap-2 min-w-0 flex-1 basis-full sm:basis-auto">
              <span
                className="flex items-center gap-1.5 text-text-muted font-semibold uppercase tracking-wide text-[10px] shrink-0"
                id="recent-projects-label"
              >
                <Clock className="w-3.5 h-3.5" /> Recent
              </span>
              <div
                className="flex gap-2 overflow-x-auto custom-scrollbar min-w-0"
                aria-labelledby="recent-projects-label"
              >
                {recents.map(meta => (
                  <button
                    key={meta.id}
                    onClick={() => onOpenProject(meta.id)}
                    className="px-3 py-1.5 rounded-lg font-mono text-xs bg-surface-secondary border border-border text-text-secondary hover:border-border-strong hover:text-text-primary transition-colors cursor-pointer max-w-[160px] truncate shrink-0"
                    title={meta.name}
                  >
                    {meta.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
