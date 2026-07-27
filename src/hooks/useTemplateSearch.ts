import { useEffect, useRef, useState } from 'react';
import { useToastStore } from '@/stores/toastStore';
import { getActiveSources, getCategoryMemes, getTrendingMemes, searchMemes } from '@/utils/api';
import type { SearchMeme } from '@/utils/api';

const SEARCH_DEBOUNCE_MS = 500;
export const SEARCH_ERROR_MESSAGE = 'Search unavailable — try again';

export interface TemplateSearchState {
  searchTerm: string;
  searchLoading: boolean;
  /** User-facing error message, distinct from the empty-results state. */
  searchError: string | null;
  activeCategory: string;
  categoryMemes: SearchMeme[];
  /** Search providers currently configured on the backend. */
  activeSources: string[];
  handleSearch: (term: string) => void;
  /** Clears the term (and any pending debounced search) without refetching. */
  clearSearchTerm: () => void;
  handleCategoryChange: (catId: string) => Promise<void>;
  /** Re-runs the last search or category fetch after an error. */
  retry: () => void;
}

/**
 * Browse-tab data layer: category fetching, debounced web search, provider
 * badge sources, and the loading/empty/error state machine.
 */
export function useTemplateSearch(): TemplateSearchState {
  const { addToast } = useToastStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('templates');
  const [categoryMemes, setCategoryMemes] = useState<SearchMeme[]>([]);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getActiveSources()
      .then(setActiveSources)
      .catch(() => {});
  }, []);

  const handleCategoryChange = async (catId: string) => {
    setActiveCategory(catId);
    setSearchError(null);
    if (catId === 'templates') {
      setCategoryMemes([]);
      return;
    }
    setSearchLoading(true);
    try {
      const results =
        catId === 'trending' ? await getTrendingMemes() : await getCategoryMemes(catId);
      setCategoryMemes(results);
      if (results.length === 0) {
        addToast(`No memes found for ${catId}`, 'info');
      }
    } catch {
      setCategoryMemes([]);
      setSearchError(SEARCH_ERROR_MESSAGE);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!term.trim()) {
      setSearchError(null);
      if (activeCategory !== 'templates') {
        handleCategoryChange(activeCategory);
      }
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const results = await searchMemes(term);
        setCategoryMemes(results);
        if (results.length === 0) {
          addToast('No memes found. Try different keywords!', 'info');
        }
      } catch {
        setCategoryMemes([]);
        setSearchError(SEARCH_ERROR_MESSAGE);
      } finally {
        setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const clearSearchTerm = () => {
    setSearchTerm('');
    // Cancel any in-flight debounce so a stale search cannot overwrite the
    // category results the user just requested.
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  };

  const retry = () => {
    if (searchTerm.trim()) {
      handleSearch(searchTerm);
    } else {
      handleCategoryChange(activeCategory);
    }
  };

  return {
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
  };
}
