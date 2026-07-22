import { CATEGORY_QUERIES, multiSourceSearch, getActiveSources, getCached, setCache } from '../../_lib/memes.mjs';

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const category = req.query?.category || url.pathname.split('/').pop();
    const query = CATEGORY_QUERIES[category];
    if (!query) return res.status(400).json({ success: false, error: 'Invalid category' });

    const page = clampInt(url.searchParams.get('page'), 1, 20, 1);
    const num = clampInt(url.searchParams.get('num'), 1, 50, 20);
    const cacheKey = `category-${category}-${page}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
      return res.status(200).json({ success: true, data: cached, cached: true });
    }
    const { results, sourceStatus } = await multiSourceSearch(query, num);
    setCache(cacheKey, results);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({ success: true, data: results, sources: getActiveSources(), sourceStatus });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'category_failed' });
  }
}
