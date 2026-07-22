import { multiSourceSearch, getActiveSources, getCached, setCache } from '../_lib/memes.mjs';

export default async function handler(_req, res) {
  try {
    const cacheKey = 'trending-memes';
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
      return res.status(200).json({ success: true, data: cached, cached: true });
    }
    const { results, sourceStatus } = await multiSourceSearch('trending memes 2025 viral', 30);
    setCache(cacheKey, results);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({ success: true, data: results, sources: getActiveSources(), sourceStatus });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'trending_failed' });
  }
}
