import { Download, Heart, Image } from 'lucide-react';
import { useStatsStore } from '@/stores/stats';

/**
 * Nav-bar stats readout, isolated so the rest of the app never subscribes
 * to the stats store. Each field is selected individually: the component
 * re-renders only when a counter actually changes, and never for the
 * per-second totalTimeSpent tick.
 */
export function StatsTicker() {
  const totalMemesCreated = useStatsStore(s => s.totalMemesCreated);
  const totalDownloads = useStatsStore(s => s.totalDownloads);
  const totalFavorites = useStatsStore(s => s.totalFavorites);

  return (
    <div className="hidden sm:flex items-center gap-4 mr-4 text-xs font-semibold text-text-muted">
      <span className="flex items-center gap-1.5">
        <Image className="w-3.5 h-3.5" /> {totalMemesCreated}
      </span>
      <span className="flex items-center gap-1.5">
        <Download className="w-3.5 h-3.5" /> {totalDownloads}
      </span>
      <span className="flex items-center gap-1.5">
        <Heart className="w-3.5 h-3.5" /> {totalFavorites}
      </span>
    </div>
  );
}
