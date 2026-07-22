const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 300;

export function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

export const CATEGORY_QUERIES = {
  trending: 'trending memes 2025',
  funny: 'funny memes viral',
  indian: 'indian memes desi memes bollywood',
  american: 'american memes usa memes',
  movies: 'movie memes film memes',
  series: 'tv series memes netflix memes',
  politics: 'political memes 2025',
  'dark-humor': 'dark humor memes edgy memes',
  animals: 'animal memes cat dog memes',
  classic: 'classic memes viral memes all time',
  reaction: 'reaction memes face memes',
  sports: 'sports memes football basketball',
  gaming: 'gaming memes gamer memes',
  ai: 'ai generated memes artificial intelligence memes',
};

const UPSTREAM_TIMEOUT_MS = 15000;

function withTimeout(promise, ms = UPSTREAM_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('upstream_timeout')), ms)),
  ]);
}

async function safeFetch(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function searchSerper(query, num = 20) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];
  const res = await safeFetch('https://google.serper.dev/images', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num }),
  });
  if (!res.ok) throw new Error(`Serper: ${res.status}`);
  const data = await res.json();
  return (data.images || []).slice(0, num).map((img, i) => ({
    id: `serper-${Date.now()}-${i}`,
    name: img.title || 'Meme',
    url: img.imageUrl || '',
    width: img.imageWidth || 500,
    height: img.imageHeight || 500,
    source: 'serper',
    sourceUrl: img.link || '',
    thumbnail: img.thumbnailUrl || img.imageUrl || '',
  }));
}

async function searchTavily(query, num = 10) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  const res = await safeFetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: query + ' meme image',
      include_images: true,
      max_results: num,
    }),
  });
  if (!res.ok) throw new Error(`Tavily: ${res.status}`);
  const data = await res.json();
  return (data.images || []).slice(0, num).map((img, i) => ({
    id: `tavily-${Date.now()}-${i}`,
    name: (data.results?.[i]?.title) || 'Meme',
    url: typeof img === 'string' ? img : img.url || '',
    width: 500,
    height: 500,
    source: 'tavily',
    sourceUrl: (data.results?.[i]?.url) || '',
    thumbnail: typeof img === 'string' ? img : img.url || '',
  }));
}

async function searchBrave(query, num = 10) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];
  const params = new URLSearchParams({ q: query + ' meme', count: String(num), safesearch: 'strict' });
  const res = await safeFetch(`https://api.search.brave.com/res/v1/images/search?${params}`, {
    headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Brave: ${res.status}`);
  const data = await res.json();
  return (data.results || []).slice(0, num).map((r, i) => ({
    id: `brave-${Date.now()}-${i}`,
    name: r.title || 'Meme',
    url: r.properties?.url || r.thumbnail?.src || '',
    width: r.properties?.width || 500,
    height: r.properties?.height || 500,
    source: 'brave',
    sourceUrl: r.url || '',
    thumbnail: r.thumbnail?.src || '',
  }));
}

async function searchSerpApi(query, num = 10) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return [];
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_images',
    q: query + ' meme',
    num: String(num),
  });
  const res = await safeFetch(`https://serpapi.com/search?${params}`);
  if (!res.ok) throw new Error(`SerpApi: ${res.status}`);
  const data = await res.json();
  return (data.images_results || []).slice(0, num).map((img, i) => ({
    id: `serpapi-${Date.now()}-${i}`,
    name: img.title || 'Meme',
    url: img.original || img.thumbnail || '',
    width: img.original_width || 500,
    height: img.original_height || 500,
    source: 'serpapi',
    sourceUrl: img.link || '',
    thumbnail: img.thumbnail || '',
  }));
}

async function searchSearchApi(query, num = 10) {
  const apiKey = process.env.SEARCHAPI_API_KEY;
  if (!apiKey) return [];
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_images',
    q: query + ' meme',
    num: String(num),
  });
  const res = await safeFetch(`https://www.searchapi.io/api/v1/search?${params}`);
  if (!res.ok) throw new Error(`SearchApi: ${res.status}`);
  const data = await res.json();
  return (data.images || []).slice(0, num).map((img, i) => ({
    id: `searchapi-${Date.now()}-${i}`,
    name: img.title || 'Meme',
    url: img.original || img.thumbnail || '',
    width: 500,
    height: 500,
    source: 'searchapi',
    sourceUrl: img.link || '',
    thumbnail: img.thumbnail || '',
  }));
}

async function searchExa(query, num = 10) {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];
  const res = await safeFetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query + ' meme', numResults: num, contents: { text: false } }),
  });
  if (!res.ok) throw new Error(`Exa: ${res.status}`);
  const data = await res.json();
  return (data.results || [])
    .filter(r => r.image || r.url)
    .map((r, i) => ({
      id: `exa-${Date.now()}-${i}`,
      name: r.title || 'Meme',
      url: r.image || r.url || '',
      width: 500,
      height: 500,
      source: 'exa',
      sourceUrl: r.url || '',
      thumbnail: r.image || r.favicon || '',
    }));
}

async function searchScrapingDog(query, num = 10) {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;
  if (!apiKey) return [];
  const params = new URLSearchParams({
    api_key: apiKey,
    query: query + ' meme',
    results: String(num),
    country: 'us',
  });
  const res = await safeFetch(`https://api.scrapingdog.com/google_images?${params}`);
  if (!res.ok) throw new Error(`ScrapingDog: ${res.status}`);
  const data = await res.json();
  const results = Array.isArray(data) ? data : data.images_results || data.results || [];
  return results.slice(0, num).map((img, i) => ({
    id: `scrapingdog-${Date.now()}-${i}`,
    name: img.title || 'Meme',
    url: img.original || img.image || '',
    width: img.original_width || 500,
    height: img.original_height || 500,
    source: 'scrapingdog',
    sourceUrl: img.link || '',
    thumbnail: img.image || img.original || '',
  }));
}

async function searchApify(query, num = 10) {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await safeFetch(
      `https://api.apify.com/v2/acts/hooli~google-images-scraper/run-sync-get-dataset-items?token=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: [query + ' meme'], maxResultsPerQuery: num }),
        timeoutMs: 45000,
      }
    );
    if (!res.ok) throw new Error(`Apify: ${res.status}`);
    const data = await res.json();
    return (Array.isArray(data) ? data : []).slice(0, num).map((img, i) => ({
      id: `apify-${Date.now()}-${i}`,
      name: img.title || img.alt || 'Meme',
      url: img.url || img.imageUrl || img.originalUrl || '',
      width: img.width || 500,
      height: img.height || 500,
      source: 'apify',
      sourceUrl: img.sourceUrl || img.link || '',
      thumbnail: img.thumbnailUrl || img.url || '',
    }));
  } catch (e) {
    throw new Error(`Apify: ${e.message}`);
  }
}

export async function getImgflipTemplates() {
  const cacheKey = 'imgflip-templates';
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const res = await safeFetch('https://api.imgflip.com/get_memes');
  if (!res.ok) throw new Error(`Imgflip: ${res.status}`);
  const data = await res.json();
  const memes = (data.data?.memes || []).map(m => ({
    ...m,
    source: 'imgflip',
    thumbnail: m.url,
  }));
  setCache(cacheKey, memes);
  return memes;
}

const SOURCE_MAP = {
  serper: searchSerper,
  tavily: searchTavily,
  brave: searchBrave,
  serpapi: searchSerpApi,
  searchapi: searchSearchApi,
  exa: searchExa,
  scrapingdog: searchScrapingDog,
  apify: searchApify,
};

const PRIMARY_SOURCES = ['serper', 'brave', 'serpapi'];
const SECONDARY_SOURCES = ['tavily', 'searchapi', 'scrapingdog'];
const TERTIARY_SOURCES = ['exa', 'apify'];

function deduplicateResults(results) {
  const unique = [];
  const seen = new Set();
  for (const r of results) {
    if (r.url && !seen.has(r.url)) {
      seen.add(r.url);
      unique.push(r);
    }
  }
  return unique;
}

export async function multiSourceSearch(query, num = 20, sources = null) {
  const selectedSources = sources || [...PRIMARY_SOURCES, ...SECONDARY_SOURCES, ...TERTIARY_SOURCES];
  const sourceStatus = {};
  const promises = selectedSources.map(async src => {
    const fn = SOURCE_MAP[src];
    if (!fn) {
      sourceStatus[src] = 'unavailable';
      return [];
    }
    try {
      const perSource = Math.ceil(num / selectedSources.length);
      const results = await withTimeout(fn(query, perSource));
      sourceStatus[src] = results.length > 0 ? 'success' : 'empty';
      return results;
    } catch (e) {
      sourceStatus[src] = 'error';
      return [];
    }
  });
  const settled = await Promise.allSettled(promises);
  const combined = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
  return { results: deduplicateResults(combined), sourceStatus };
}

export function getActiveSources() {
  const sources = [];
  if (process.env.SERPER_API_KEY) sources.push('serper');
  if (process.env.TAVILY_API_KEY) sources.push('tavily');
  if (process.env.BRAVE_SEARCH_API_KEY) sources.push('brave');
  if (process.env.SERPAPI_API_KEY) sources.push('serpapi');
  if (process.env.SEARCHAPI_API_KEY) sources.push('searchapi');
  if (process.env.EXA_API_KEY) sources.push('exa');
  if (process.env.SCRAPINGDOG_API_KEY) sources.push('scrapingdog');
  if (process.env.APIFY_API_KEY) sources.push('apify');
  sources.push('imgflip');
  return sources;
}

export { SOURCE_MAP, deduplicateResults };
