/**
 * Per-IP sliding-window rate limiter for the /api/memes/* endpoints.
 *
 * HONEST LIMITATION — best-effort only on serverless:
 * State lives in the memory of a single function instance. Vercel runs many
 * instances concurrently and recycles them freely, so a determined client
 * spread across instances (or across cold starts) will exceed the nominal
 * limit. This still stops naive loops and accidental hot paths from burning
 * paid upstream API quota. Real enforcement needs an edge WAF rule or a
 * shared store (e.g. Vercel KV / Upstash) — deferred to a later wave.
 */

const DEFAULT_LIMIT = 30; // requests
const DEFAULT_WINDOW_MS = 60_000; // per minute
const DEFAULT_MAX_CLIENTS = 5_000; // memory bound per instance

export function createRateLimiter({
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
  maxClients = DEFAULT_MAX_CLIENTS,
} = {}) {
  /** @type {Map<string, number[]>} ip -> hit timestamps (ms), oldest first */
  const hits = new Map();

  function check(clientId, now = Date.now()) {
    const cutoff = now - windowMs;
    const recent = (hits.get(clientId) ?? []).filter(t => t > cutoff);

    if (recent.length >= limit) {
      hits.set(clientId, recent);
      const retryAfterMs = recent[0] + windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    // Re-insert so this client becomes the most-recently-used entry.
    hits.delete(clientId);
    hits.set(clientId, [...recent, now]);

    if (hits.size > maxClients) {
      const oldest = hits.keys().next().value;
      hits.delete(oldest);
    }

    return {
      allowed: true,
      remaining: limit - recent.length - 1,
      retryAfterSeconds: 0,
    };
  }

  return { check };
}

export function getClientIp(req) {
  // On Vercel, x-forwarded-for is set by the platform with the client IP
  // first; it is not directly spoofable at that position.
  const xff = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

const sharedLimiter = createRateLimiter();

/**
 * Apply the shared limiter to a request. Returns true when the request may
 * proceed; otherwise sends a 429 with Retry-After and returns false.
 */
export function enforceRateLimit(req, res, limiter = sharedLimiter) {
  const result = limiter.check(getClientIp(req));
  if (result.allowed) return true;
  res.setHeader('Retry-After', String(result.retryAfterSeconds));
  res
    .status(429)
    .json({ success: false, error: 'Too many requests — slow down and try again shortly' });
  return false;
}
