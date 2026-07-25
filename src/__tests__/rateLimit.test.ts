import { describe, expect, test } from 'vitest';
// @ts-expect-error — plain .mjs module shared with the serverless functions, no type declarations
import { createRateLimiter, getClientIp } from '../../api/_lib/rateLimit.mjs';

const WINDOW_MS = 60_000;

describe('createRateLimiter (sliding window)', () => {
  test('allows requests under the limit', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: WINDOW_MS });
    const t0 = 1_000_000;

    expect(limiter.check('1.1.1.1', t0).allowed).toBe(true);
    expect(limiter.check('1.1.1.1', t0 + 1).allowed).toBe(true);
    expect(limiter.check('1.1.1.1', t0 + 2).allowed).toBe(true);
  });

  test('blocks the request that exceeds the limit', () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: WINDOW_MS });
    const t0 = 1_000_000;

    limiter.check('1.1.1.1', t0);
    limiter.check('1.1.1.1', t0 + 1);
    limiter.check('1.1.1.1', t0 + 2);
    const blocked = limiter.check('1.1.1.1', t0 + 3);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  test('window slides: old hits expire and free capacity', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: WINDOW_MS });
    const t0 = 1_000_000;

    limiter.check('1.1.1.1', t0);
    limiter.check('1.1.1.1', t0 + 10);
    expect(limiter.check('1.1.1.1', t0 + 20).allowed).toBe(false);

    // First hit (t0) has left the window; one slot frees up.
    const afterExpiry = limiter.check('1.1.1.1', t0 + WINDOW_MS + 1);
    expect(afterExpiry.allowed).toBe(true);
    // ...and the window is full again (t0+10 still inside).
    expect(limiter.check('1.1.1.1', t0 + WINDOW_MS + 2).allowed).toBe(false);
  });

  test('tracks IPs independently', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW_MS });
    const t0 = 1_000_000;

    expect(limiter.check('1.1.1.1', t0).allowed).toBe(true);
    expect(limiter.check('1.1.1.1', t0 + 1).allowed).toBe(false);
    expect(limiter.check('2.2.2.2', t0 + 1).allowed).toBe(true);
  });

  test('retryAfterSeconds counts down to when the oldest hit expires', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW_MS });
    const t0 = 1_000_000;

    limiter.check('1.1.1.1', t0);
    // 30s into the window: oldest hit expires in 30s.
    const blocked = limiter.check('1.1.1.1', t0 + 30_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(30);
  });

  test('evicts oldest client once maxClients is exceeded (bounded memory)', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW_MS, maxClients: 2 });
    const t0 = 1_000_000;

    limiter.check('1.1.1.1', t0);
    limiter.check('2.2.2.2', t0 + 1);
    limiter.check('3.3.3.3', t0 + 2); // evicts 1.1.1.1

    // 1.1.1.1 was evicted, so it gets a fresh window instead of a block.
    expect(limiter.check('1.1.1.1', t0 + 3).allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  test('uses first entry of x-forwarded-for when present', () => {
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
    };
    expect(getClientIp(req)).toBe('203.0.113.7');
  });

  test('falls back to socket remoteAddress', () => {
    const req = { headers: {}, socket: { remoteAddress: '192.168.1.5' } };
    expect(getClientIp(req)).toBe('192.168.1.5');
  });

  test('returns "unknown" when nothing is available', () => {
    expect(getClientIp({ headers: {} })).toBe('unknown');
  });
});
