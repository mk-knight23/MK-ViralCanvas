import {
  getImgflipTemplates,
  multiSourceSearch,
  getActiveSources,
  SOURCE_MAP,
  getCached,
  setCache,
  deduplicateResults,
} from '../_lib/memes.mjs';

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const q = (url.searchParams.get('q') || '').toString().slice(0, 200);
    const source = (url.searchParams.get('source') || 'all').toString().slice(0, 40);
    const num = clampInt(url.searchParams.get('num'), 1, 50, 20);
    if (!q) return res.status(400).json({ success: false, error: 'Query required' });

    const cacheKey = `search-${q}-${source}-${num}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
      return res.status(200).json({ success: true, data: cached, cached: true });
    }

    let results = [];
    let sourceStatus = {};

    if (source === 'all') {
      const combined = await multiSourceSearch(q, num);
      results = combined.results;
      sourceStatus = combined.sourceStatus;
      try {
        const templates = await getImgflipTemplates();
        const filtered = templates.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));
        results.push(...filtered.slice(0, 5));
        sourceStatus.imgflip = 'success';
      } catch {
        sourceStatus.imgflip = 'error';
      }
      results = deduplicateResults(results);
    } else if (SOURCE_MAP[source]) {
      try {
        results = await SOURCE_MAP[source](q, num);
        sourceStatus[source] = results.length > 0 ? 'success' : 'empty';
      } catch {
        sourceStatus[source] = 'error';
      }
    } else if (source === 'imgflip') {
      const templates = await getImgflipTemplates();
      results = templates.filter(t => t.name.toLowerCase().includes(q.toLowerCase())).slice(0, num);
      sourceStatus.imgflip = 'success';
    }

    setCache(cacheKey, results);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json({ success: true, data: results, sources: getActiveSources(), sourceStatus });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'search_failed' });
  }
}
