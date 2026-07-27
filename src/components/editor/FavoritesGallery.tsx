import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Heart, ImageIcon, Trash2 } from 'lucide-react';
import type { FavoriteMeme } from '@/types/meme';

interface FavoritesGalleryProps {
  favorites: FavoriteMeme[];
  /** Called when the user wants to reuse a favorite as the template. */
  onUse: (favorite: FavoriteMeme) => void;
  onRemove: (id: string) => void;
}

/** Collapsible grid of saved favorites with use/remove actions. */
export function FavoritesGallery({ favorites, onUse, onRemove }: FavoritesGalleryProps) {
  const [expanded, setExpanded] = useState(true);

  if (favorites.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <Heart className="w-5 h-5 text-brand-primary fill-current" />
        <h3 className="font-display font-semibold text-lg">My Favorites</h3>
        <span className="text-xs text-text-muted bg-surface-secondary px-2 py-1 rounded-md">
          {favorites.length}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {favorites.map(f => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative card-elevated p-2 cursor-pointer"
                >
                  <img
                    src={f.image}
                    alt="Favorite meme"
                    className="w-full aspect-square object-cover rounded-xl"
                    loading="lazy"
                  />
                  {(f.topText || f.bottomText) && (
                    <div className="mt-1.5 px-1">
                      <p className="text-[10px] text-text-muted truncate">
                        {f.topText || f.bottomText}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-2 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <button
                      onClick={() => onUse(f)}
                      className="bg-white/20 hover:bg-brand-primary/80 p-2 rounded-full text-white transition-colors cursor-pointer"
                      aria-label="Use this meme"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemove(f.id)}
                      className="bg-white/20 hover:bg-danger/80 p-2 rounded-full text-white transition-colors cursor-pointer"
                      aria-label="Remove favorite"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
