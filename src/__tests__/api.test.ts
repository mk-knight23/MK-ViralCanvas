import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  getActiveSources,
  getTemplates,
  getTrendingMemes,
  searchMemes,
} from '@/utils/api';

const SAMPLE_MEME = {
  id: '1',
  name: 'Drake',
  url: 'https://i.imgflip.com/drake.jpg',
  width: 500,
  height: 500,
  source: 'imgflip',
  thumbnail: 'https://i.imgflip.com/drake.jpg',
};

function mockFetchJson(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(body),
    })
  );
}

describe('api client error handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns data on success', async () => {
    mockFetchJson({ success: true, data: [SAMPLE_MEME] });
    const results = await searchMemes('drake');
    expect(results).toEqual([SAMPLE_MEME]);
  });

  it('returns an empty array for a successful response with no results (empty path)', async () => {
    mockFetchJson({ success: true, data: [] });
    await expect(searchMemes('nothing-matches')).resolves.toEqual([]);
  });

  it('throws ApiError when the network request fails (error path, not [])', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(searchMemes('drake')).rejects.toBeInstanceOf(ApiError);
  });

  it('throws ApiError when the API reports success: false', async () => {
    mockFetchJson({ success: false, error: 'upstream provider down' });
    await expect(getTrendingMemes()).rejects.toMatchObject({
      name: 'ApiError',
      message: 'upstream provider down',
    });
  });

  it('throws ApiError with status on non-2xx HTTP responses', async () => {
    mockFetchJson({ success: false, error: 'Too many requests' }, { ok: false, status: 429 });
    await expect(getTemplates()).rejects.toMatchObject({
      name: 'ApiError',
      status: 429,
    });
  });

  it('throws ApiError when the response body is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      })
    );
    await expect(getTemplates()).rejects.toBeInstanceOf(ApiError);
  });

  it('distinguishes failure from empty: an error never resolves to []', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    let resolvedValue: unknown = 'did-not-resolve';
    let caught: unknown = null;
    try {
      resolvedValue = await getActiveSources();
    } catch (err) {
      caught = err;
    }
    expect(resolvedValue).toBe('did-not-resolve');
    expect(caught).toBeInstanceOf(ApiError);
  });
});
