import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MemeTemplate, FavoriteMeme } from '@/types/meme';
import { MEMES_STORE_KEY } from '@/utils/storageKeys';

interface MemeStore {
  templates: MemeTemplate[];
  favorites: FavoriteMeme[];

  setTemplates: (templates: MemeTemplate[]) => void;
  addFavorite: (favorite: FavoriteMeme) => void;
  removeFavorite: (id: string) => void;
}

export const useMemeStore = create<MemeStore>()(
  persist(
    set => ({
      templates: [],
      favorites: [],

      setTemplates: templates => set({ templates }),
      addFavorite: favorite =>
        set(state => ({
          favorites: [favorite, ...state.favorites],
        })),
      removeFavorite: id =>
        set(state => ({
          favorites: state.favorites.filter(f => f.id !== id),
        })),
    }),
    {
      name: MEMES_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
