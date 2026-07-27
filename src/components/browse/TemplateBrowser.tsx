import { motion } from 'framer-motion';
import {
  Cat,
  Clapperboard,
  Film,
  Flame,
  Gamepad2,
  Globe,
  ImageIcon,
  Laugh,
  RefreshCw,
  Search,
  Skull,
  Sparkles,
  TrendingUp,
  Trophy,
  Tv,
} from 'lucide-react';
import { useTemplateSearch } from '@/hooks/useTemplateSearch';
import type { MemeTemplate } from '@/types/meme';
import type { SearchMeme } from '@/utils/api';

const SOURCE_COLORS: Record<string, string> = {
  serper: '#2563eb',
  tavily: '#9333ea',
  brave: '#f97316',
  serpapi: '#16a34a',
  searchapi: '#0891b2',
  exa: '#6366f1',
  scrapingdog: '#ca8a04',
  apify: '#e11d48',
  imgflip: '#4b5563',
};

const CATEGORIES = [
  { id: 'templates', name: 'Templates', icon: ImageIcon },
  { id: 'trending', name: 'Trending', icon: TrendingUp },
  { id: 'funny', name: 'Funny', icon: Laugh },
  { id: 'indian', name: 'Indian', icon: Globe },
  { id: 'american', name: 'American', icon: Globe },
  { id: 'movies', name: 'Movies', icon: Film },
  { id: 'series', name: 'Series', icon: Tv },
  { id: 'politics', name: 'Politics', icon: Clapperboard },
  { id: 'dark-humor', name: 'Dark Humor', icon: Skull },
  { id: 'animals', name: 'Animals', icon: Cat },
  { id: 'sports', name: 'Sports', icon: Trophy },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2 },
  { id: 'ai', name: 'AI Memes', icon: Sparkles },
  { id: 'classic', name: 'Classic', icon: Flame },
  { id: 'reaction', name: 'Reaction', icon: Laugh },
];

const TEMPLATE_DISPLAY_LIMIT = 50;

interface TemplateBrowserProps {
  /** Locally cached meme templates shown for the default category. */
  templates: MemeTemplate[];
  /** Highlights the currently applied template. */
  selectedTemplateId?: string;
  onSelect: (meme: MemeTemplate | SearchMeme) => void;
}

/** The Browse tab: web search, category chips, provider badges, results grid. */
export function TemplateBrowser({ templates, selectedTemplateId, onSelect }: TemplateBrowserProps) {
  const {
    searchTerm,
    searchLoading,
    searchError,
    activeCategory,
    categoryMemes,
    activeSources,
    handleSearch,
    clearSearchTerm,
    handleCategoryChange,
    retry,
  } = useTemplateSearch();

  const getDisplayMemes = (): (MemeTemplate | SearchMeme)[] => {
    if (activeCategory === 'templates') {
      if (searchTerm) {
        return templates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return templates.slice(0, TEMPLATE_DISPLAY_LIMIT);
    }
    return categoryMemes;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card-elevated p-5 space-y-4"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search memes across the web..."
          className="w-full bg-surface-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none"
        />
      </div>

      {activeSources.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-text-muted font-medium uppercase tracking-wide">
            Powered by {activeSources.length} sources:
          </span>
          {activeSources.map(src => (
            <span
              key={src}
              className="text-white text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: SOURCE_COLORS[src] || '#7c3aed' }}
            >
              {src}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => {
                clearSearchTerm();
                handleCategoryChange(cat.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-brand-cta text-white'
                  : 'bg-surface-secondary text-text-muted hover:text-text-secondary hover:bg-border'
              }`}
            >
              <Icon className="w-3 h-3" /> {cat.name}
            </button>
          );
        })}
      </div>

      {searchLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
        </div>
      ) : searchError ? (
        <div role="alert" className="text-center py-12 space-y-3">
          <p className="text-sm font-medium text-red-500">{searchError}</p>
          <button
            onClick={retry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-cta text-white text-sm font-semibold hover:brightness-90 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
          {getDisplayMemes().map(m => (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                selectedTemplateId === m.id
                  ? 'border-brand-primary ring-2 ring-brand-primary/20'
                  : 'border-transparent hover:border-border-hover'
              }`}
            >
              <img
                src={m.url}
                alt={m.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                <span className="text-white text-[10px] font-semibold leading-tight line-clamp-2">
                  {m.name}
                </span>
              </div>
              {'source' in m && (
                <span
                  className="absolute top-1 right-1 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase"
                  style={{
                    backgroundColor: SOURCE_COLORS[m.source as string] || '#7c3aed',
                  }}
                >
                  {m.source as string}
                </span>
              )}
            </button>
          ))}
          {getDisplayMemes().length === 0 && !searchLoading && (
            <div className="col-span-3 text-center py-12 text-text-muted text-sm">
              No memes found. Try a different search or category!
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
