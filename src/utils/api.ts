import type { MemeTemplate } from '@/types/meme';

export interface SearchMeme {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  source: string;
  sourceUrl?: string;
  thumbnail: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  cached?: boolean;
  sources?: string[];
  error?: string;
}

const BASE = '/api';

/**
 * Typed API failure. Thrown (never swallowed) so callers can distinguish
 * "the request failed" from "the request succeeded with zero results".
 */
export class ApiError extends Error {
  readonly path: string;
  readonly status?: number;

  constructor(message: string, path: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.path = path;
    this.status = status;
  }
}

async function fetchApi<T>(path: string): Promise<T[]> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'network request failed';
    throw new ApiError(`Network error: ${reason}`, path);
  }

  let json: ApiResponse<T[]>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(`Invalid response body (HTTP ${res.status})`, path, res.status);
  }

  if (!res.ok || !json.success) {
    throw new ApiError(json.error || `API error (HTTP ${res.status})`, path, res.status);
  }
  return json.data ?? [];
}

export async function getTemplates(): Promise<MemeTemplate[]> {
  return fetchApi<MemeTemplate>('/memes/templates');
}

export async function searchMemes(query: string, source = 'all'): Promise<SearchMeme[]> {
  return fetchApi<SearchMeme>(`/memes/search?q=${encodeURIComponent(query)}&source=${source}`);
}

export async function getTrendingMemes(): Promise<SearchMeme[]> {
  return fetchApi<SearchMeme>('/memes/trending');
}

export async function getCategoryMemes(category: string, page = 1): Promise<SearchMeme[]> {
  return fetchApi<SearchMeme>(`/memes/category/${encodeURIComponent(category)}?page=${page}`);
}

export async function getCategories(): Promise<{ id: string; name: string }[]> {
  return fetchApi<{ id: string; name: string }>('/categories');
}

export async function getActiveSources(): Promise<string[]> {
  return fetchApi<string>('/sources');
}
