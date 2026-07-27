import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STATS_STORE_KEY } from '@/utils/storageKeys';

interface StatsState {
  totalMemesCreated: number;
  totalDownloads: number;
  totalFavorites: number;
  totalTimeSpent: number;
  lastSessionDate: string | null;

  recordMemeCreated: () => void;
  recordDownload: () => void;
  addFavorite: () => void;
  removeFavorite: () => void;
  addTimeSpent: (seconds: number) => void;
  resetStats: () => void;
}

export const useStatsStore = create<StatsState>()(
  persist(
    set => ({
      totalMemesCreated: 0,
      totalDownloads: 0,
      totalFavorites: 0,
      totalTimeSpent: 0,
      lastSessionDate: null,

      recordMemeCreated: () =>
        set(state => ({
          totalMemesCreated: state.totalMemesCreated + 1,
          lastSessionDate: new Date().toISOString(),
        })),
      recordDownload: () =>
        set(state => ({
          totalDownloads: state.totalDownloads + 1,
        })),
      addFavorite: () =>
        set(state => ({
          totalFavorites: state.totalFavorites + 1,
        })),
      removeFavorite: () =>
        set(state => ({
          totalFavorites: Math.max(0, state.totalFavorites - 1),
        })),
      addTimeSpent: seconds =>
        set(state => ({
          totalTimeSpent: state.totalTimeSpent + seconds,
        })),
      resetStats: () =>
        set({
          totalMemesCreated: 0,
          totalDownloads: 0,
          totalFavorites: 0,
          totalTimeSpent: 0,
          lastSessionDate: null,
        }),
    }),
    {
      name: STATS_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
